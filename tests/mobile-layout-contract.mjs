import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..');
const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9400 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'architech-mobile-contract-'));
const pageUrl = process.env.PAGE_URL || pathToFileURL(path.join(site, 'index.html')).href;
const failures = [];
const consoleErrors = [];
let seq = 0;
let ws;

function check(condition, message) {
  if (!condition) failures.push(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const browser = spawn(edge, [
  '--headless=new',
  '--disable-extensions',
  '--no-first-run',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

const pending = new Map();

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function value(expression) {
  const result = await call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function ready() {
  for (let i = 0; i < 100; i += 1) {
    if (await value('document.readyState === "complete"')) return;
    await sleep(50);
  }
  throw new Error('Document did not finish loading');
}

async function load(width, height, mobile) {
  await call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: mobile ? 1.25 : 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  await call('Page.navigate', { url: `${pageUrl}?contract=${Date.now()}` });
  await ready();
  await value(`(() => {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      el.classList.add('is-revealed');
      el.style.pointerEvents = '';
    });
    return true;
  })()`);
  await sleep(250);
}

async function layoutAssertions(width, height, mobile) {
  await load(width, height, mobile);
  await sleep(700);
  const base = await value('(' + (() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    snap: getComputedStyle(document.documentElement).scrollSnapType,
    menu: getComputedStyle(document.querySelector('[data-nav-toggle]')).display,
    navInert: document.querySelector('#site-nav').inert,
    cols: getComputedStyle(document.querySelector('#contact .titleblock')).gridTemplateColumns.trim().split(/\s+/).length,
    cards: [...document.querySelectorAll('.project-card')].map(card => {
      const r = card.getBoundingClientRect();
      return {id:card.id, overflow:card.scrollWidth-card.clientWidth, left:r.left, right:r.right};
    }),
    controls: [...document.querySelectorAll('[data-sound-toggle], [data-nav-toggle], .project-links a')].filter(el => getComputedStyle(el).display !== 'none').map(el => {
      const r=el.getBoundingClientRect(); return {label:el.getAttribute('aria-label')||el.textContent.trim(),w:r.width,h:r.height};
    })
  })).toString() + ')()');
  check(base.overflow <= 1, width + ': horizontal overflow ' + base.overflow);
  check(base.snap === 'none', width + ': natural scrolling required');
  check(base.cols === (width <= 640 ? 2 : 4), width + ': contact column count');
  base.cards.forEach(card => {
    check(card.overflow <= 1, width + ': overflowing content in ' + card.id);
    check(card.left >= -1 && card.right <= width+1, width + ': card exceeds viewport ' + card.id);
  });
  base.controls.forEach(c => check(c.w >= 44 && c.h >= 44, width + ': touch target ' + c.label + ' ' + c.w + 'x' + c.h));
  if(width <= 920) {
    check(base.navInert, width + ': closed menu must be excluded from tab order');
    await value("document.querySelector('[data-nav-toggle]').click(); true");
    await sleep(400);
    const drawer = await value('(' + (() => ({
      expanded:document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'),
      inert:document.querySelector('#site-nav').inert,
      links:document.querySelectorAll('#site-nav a').length,
      locked:document.documentElement.classList.contains('nav-lock') && document.body.classList.contains('nav-lock')
    })).toString() + ')()');
    check(drawer.expanded === 'true' && !drawer.inert && drawer.locked && drawer.links === 5, width + ': menu open state');
    await value("document.querySelector('[data-nav-toggle]').focus(); true");
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    check(await value("document.activeElement === document.querySelector('#site-nav a')"), width + ': Tab enters menu');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    check(await value("document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector('[data-nav-toggle]')"), width + ': Escape closes menu and returns focus');
  } else check(base.menu === 'none' && !base.navInert, 'desktop navigation must be available');
}

async function projectAssertions() {
  const result = await value('(' + (() => ({
    titles:[...document.querySelectorAll('.project-card h3')].map(el=>el.textContent.trim()),
    sections:[...document.querySelectorAll('main > section')].map(el=>el.id),
    strengths:[...document.querySelectorAll('.project-strengths')].map(el=>el.children.length),
    workflows:[...document.querySelectorAll('.project-workflow')].map(el=>el.children.length),
    brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
    brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),
    privateLinks:[...document.querySelectorAll('.project-links a')].filter(a=>a.href.includes('github.com')).map(a=>a.href),
    text:document.body.innerText
  })).toString() + ')()');
  check(JSON.stringify(result.titles) === JSON.stringify(['ArchiTECH-I3D','ArchiTECH-MCP','ArchiTECH-Assistant']), 'exactly the three requested projects');
  check(JSON.stringify(result.sections) === JSON.stringify(['signal','projects','about','contact']), 'only hero, requested projects, about and contact remain');
  check(result.strengths.every(n=>n===3) && result.workflows.every(n=>n===4), 'each product has strengths and a complete workflow');
  check(!result.brokenAnchors.length, 'broken anchors: ' + result.brokenAnchors);
  check(!result.brokenImages.length, 'broken images: ' + result.brokenImages);
  check(!result.privateLinks.length, 'no private project links');
  check(!/JARVIS|Knowledge Brain|Command Center|34,510|48\/48/i.test(result.text), 'unrelated projects or stale metrics remain');
}

async function screenshot(name) {
  if (!process.env.ARTIFACT_DIR) return;
  fs.mkdirSync(process.env.ARTIFACT_DIR, { recursive: true });
  const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(process.env.ARTIFACT_DIR, name + '.png'), Buffer.from(result.data, 'base64'));
}

try {
  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  ws = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const job = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) job.reject(new Error(JSON.stringify(message.error)));
      else job.resolve(message.result || {});
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      consoleErrors.push(message.params.entry.text);
    }
  };
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Log.enable');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await call('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { sessionStorage.setItem('architechBooted', '1'); } catch {}`,
  });
  for (const [width, height] of [[320, 740], [360, 800], [390, 844], [430, 932]]) {
    await layoutAssertions(width, height, true);
  }
  await layoutAssertions(768, 1024, false);
  await layoutAssertions(1366, 768, false);
  await projectAssertions();
  await screenshot('desktop-hero');
  await value(`document.querySelector('#projects').scrollIntoView({behavior:'instant'}); true`);
  await sleep(600);
  await screenshot('desktop-projects');
  for (const id of ['architech-i3d', 'architech-mcp', 'architech-assistant']) {
    await value(`document.querySelector('#${id} .project-workflow').scrollIntoView({behavior:'instant',block:'center'}); true`);
    await sleep(400);
    await screenshot('desktop-' + id + '-workflow');
  }
  await load(390, 844, true);
  await screenshot('mobile-hero');
  await value(`document.querySelector('#architech-i3d').scrollIntoView({behavior:'instant'}); true`);
  await sleep(600);
  await screenshot('mobile-project');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load(390, 844, true);
  const reduced = await value(`(() => ({artAnimation:getComputedStyle(document.querySelector('.hero-art')).animationName, boot:!!document.querySelector('#boot'), navInert:document.querySelector('#site-nav').inert}))()`);
  check(reduced.artAnimation === 'none', 'reduced motion: hero reveal should be disabled');
  check(!reduced.boot, 'content should be available without a boot screen');
  check(reduced.navInert, 'closed mobile navigation should be excluded from tab order');
  check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exitCode = 1;
  } else {
    console.log('Mobile layout contract passed.');
  }
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  const browserExit = browser.exitCode === null
    ? Promise.race([
        new Promise((resolve) => browser.once('exit', resolve)),
        sleep(2000),
      ])
    : Promise.resolve();
  browser.kill();
  await browserExit;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

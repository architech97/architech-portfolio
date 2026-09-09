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
const pageUrl = pathToFileURL(path.join(site, 'index.html')).href;
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

async function mobileAssertions(width, height) {
  await load(width, height, true);
  const base = await value(`(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const visionButton = document.querySelector('#vision .vision-cta .btn');
    const contactTag = document.querySelector('#contact .sheet-tag');
    const footerLast = document.querySelector('#contact .footer p:last-child');
    const twinRail = document.querySelector('#twin .twin-rail');
    const twinHud = document.querySelector('#twin .twin-hud');
    const gates = document.querySelector('#gates');
    const rollback = gates.querySelector('.pl-rollback');
    const titleblock = document.querySelector('#contact .titleblock');
    const bg = getComputedStyle(document.querySelector('#contact'), '::before');
    const touch = [...document.querySelectorAll('[data-sound-toggle], [data-nav-toggle], .gate, .say-list li')]
      .map((el) => ({ label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24), ...rect(el) }));
    return {
      viewport: [innerWidth, innerHeight],
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      visionGap: rect(contactTag).top - rect(visionButton).bottom,
      footerGap: document.documentElement.scrollHeight - rect(footerLast).bottom,
      twinGap: rect(twinHud).top - rect(twinRail).bottom,
      gatesOverflow: rect(rollback).bottom - rect(gates).bottom,
      titleColumns: getComputedStyle(titleblock).gridTemplateColumns.trim().split(/\\s+/).length,
      bgTop: parseFloat(bg.top),
      bgTransform: bg.transform,
      bgAnimation: bg.animationName,
      touch,
    };
  })()`);

  check(base.horizontalOverflow <= 1, `${width}: horizontal overflow ${base.horizontalOverflow}px`);
  check(base.gatesOverflow <= 1, `${width}: Gates content exceeds section by ${base.gatesOverflow.toFixed(1)}px`);
  check(base.twinGap >= 12, `${width}: Twin rail/HUD gap is ${base.twinGap.toFixed(1)}px`);
  check(base.visionGap <= 72, `${width}: Vision-to-Contact gap is ${base.visionGap.toFixed(1)}px`);
  check(base.footerGap <= 32, `${width}: footer ends ${base.footerGap.toFixed(1)}px before document end`);
  check(base.titleColumns === 2, `${width}: Title Block has ${base.titleColumns} columns, expected 2`);
  check(base.bgTop >= -0.5, `${width}: Contact background overscans by ${Math.abs(base.bgTop).toFixed(1)}px`);
  check(base.bgTransform === 'none', `${width}: Contact background transform is ${base.bgTransform}`);
  check(base.bgAnimation === 'none', `${width}: Contact background animation is ${base.bgAnimation}`);
  base.touch.forEach((target) => check(
    target.width >= 44 && target.height >= 44,
    `${width}: touch target ${target.label} is ${target.width.toFixed(1)}×${target.height.toFixed(1)}`,
  ));

  await value(`document.querySelector('#vision .vision-cta .btn').scrollIntoView({ behavior: 'instant', block: 'center' }); true`);
  await sleep(100);
  const ctaVisible = await value(`(() => {
    const btn = document.querySelector('#vision .vision-cta .btn');
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(top && top.closest('.btn') === btn);
  })()`);
  check(ctaVisible, `${width}: Vision CTA is covered by an adjacent section`);

  await value(`document.querySelector('[data-nav-toggle]').click(); true`);
  await sleep(100);
  const drawer = await value(`(() => {
    const nav = document.querySelector('#site-nav');
    const r = nav.getBoundingClientRect();
    return {
      height: r.height,
      visibleLinks: [...nav.querySelectorAll('a')].filter((a) => {
        const x = a.getBoundingClientRect();
        return x.width > 0 && x.height > 0;
      }).length,
      htmlLocked: document.documentElement.classList.contains('nav-lock'),
      bodyLocked: document.body.classList.contains('nav-lock'),
    };
  })()`);
  check(drawer.height >= height - 80, `${width}: drawer height is ${drawer.height.toFixed(1)}px`);
  check(drawer.visibleLinks === 7, `${width}: drawer exposes ${drawer.visibleLinks}/7 links`);
  check(drawer.htmlLocked && drawer.bodyLocked, `${width}: drawer does not lock both html and body`);
}

async function desktopAssertions() {
  await load(1366, 768, false);
  const desktop = await value(`(() => ({
    snap: getComputedStyle(document.documentElement).scrollSnapType,
    navToggle: getComputedStyle(document.querySelector('[data-nav-toggle]')).display,
    navPosition: getComputedStyle(document.querySelector('#site-nav')).position,
    titleColumns: getComputedStyle(document.querySelector('#contact .titleblock')).gridTemplateColumns.trim().split(/\\s+/).length,
    gatesColumns: getComputedStyle(document.querySelector('.gates-grid')).gridTemplateColumns.trim().split(/\\s+/).length,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  }))()`);
  check(desktop.snap.includes('mandatory'), `desktop: scroll snap changed to ${desktop.snap}`);
  check(desktop.navToggle === 'none', `desktop: mobile menu toggle is ${desktop.navToggle}`);
  check(desktop.navPosition === 'static', `desktop: navigation position is ${desktop.navPosition}`);
  check(desktop.titleColumns === 4, `desktop: Title Block has ${desktop.titleColumns} columns`);
  check(desktop.gatesColumns === 2, `desktop: Gates layout has ${desktop.gatesColumns} columns`);
  check(desktop.horizontalOverflow <= 1, `desktop: horizontal overflow ${desktop.horizontalOverflow}px`);
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
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
    await mobileAssertions(width, height);
  }
  await desktopAssertions();
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

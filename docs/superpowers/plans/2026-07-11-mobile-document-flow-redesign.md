# ArchiTECH Portfolio Mobile Document Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a collision-free, compact, and smooth phone layout while preserving the current desktop portfolio design.

**Architecture:** Keep the existing dependency-free HTML/CSS/JavaScript architecture. Add one dependency-free CDP layout contract, then introduce cascade-last mobile overrides and narrowly scoped JavaScript performance/audio changes. Desktop selectors and content structure remain the reference baseline.

**Tech Stack:** Static HTML5, CSS, browser Canvas 2D, Web Audio, Node.js 24 standard library, Edge/Chromium DevTools Protocol, PowerShell contract test.

## Global Constraints

- Desktop visual design is locked; phone-specific composition changes live under `max-width: 920px` and `max-width: 640px` media queries.
- S.00 and S.02 remain full-screen; S.01 and S.03–S.07 use natural phone height.
- No section removal, hidden portfolio content, framework migration, dependency, remote service, audio download, or new media asset.
- No document-level horizontal overflow at 360×800, 390×844, or 430×932.
- No unresolved P0, P1, or P2 finding at handoff.
- Do not push or deploy to GitHub without a separate explicit request.
- The local umbrella Git repository has no commits or remote and the portfolio is untracked. Do not create an umbrella commit; use tests, hashes, and the numbered report as checkpoints.

## File Map

- Create `tests/mobile-layout-contract.mjs`: dependency-free rendered mobile and desktop layout assertions through Edge CDP.
- Modify `styles.css`: cascade-last mobile document flow, contained backgrounds, compact title block, navigation geometry, performance surface overrides, and film progress transform.
- Modify `script.js`: real scroll lock, mobile Canvas budget/framing, DOM update throttling, audio ownership/lifecycle, and compositor film progress.
- Modify `tests/portfolio-contract.ps1`: source-level mobile/performance/audio contracts.
- Update `README.md`: verification commands and phone support statement.
- Create `D:\ArchiTECH\_Claude_Agent_Run\2026-07-11_ARCHITECH_PORTFOLIO_MOBILE_DOCUMENT_FLOW_REPORT.md`.
- Modify `D:\ArchiTECH\_Claude_Agent_Run\REPORT_MANIFEST.compact.json` and `D:\ArchiTECH\ArchiTECH - Command Center\CURRENT_STATE.compact.md`.

---

### Task 1: Add a rendered mobile regression contract

**Files:**
- Create: `tests/mobile-layout-contract.mjs`
- Test: `tests/mobile-layout-contract.mjs`

**Interfaces:**
- Consumes: `index.html`, `styles.css`, `script.js`, installed Microsoft Edge, Node.js 24.
- Produces: exit code `0` with `Mobile layout contract passed.` or exit code `1` with one line per failed rendered invariant.

- [ ] **Step 1: Create the dependency-free CDP contract**

Use this structure verbatim; keep selectors and thresholds aligned with the approved specification:

```js
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
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
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

  await value(`document.querySelector('#vision .vision-cta .btn').scrollIntoView({ block: 'center' }); true`);
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
  browser.kill();
  fs.rmSync(profile, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
& 'C:\Users\arnav\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tests\mobile-layout-contract.mjs'
```

Expected: exit code `1`, including failures for the collapsed drawer, missing HTML scroll lock, Gates overflow, Twin gap, one-column Title Block, background overscan/animation, covered Vision CTA, excessive boundary/footer gap, and sub-44 px controls.

- [ ] **Step 3: Preserve RED evidence**

Save the exact failing output in the eventual report under `Before fix — rendered contract`. Do not weaken thresholds to make the current source pass.

---

### Task 2: Implement the mobile document-flow CSS

**Files:**
- Modify: `styles.css:1724-1880`
- Test: `tests/mobile-layout-contract.mjs`

**Interfaces:**
- Consumes: existing class names and section IDs in `index.html`.
- Produces: contained mobile sections, compact phone layout, usable drawer geometry, stable two-column Title Block, and static low-cost mobile atmosphere.

- [ ] **Step 1: Add cascade-last tablet/mobile containment rules**

Add after the existing responsive blocks and before reduced-motion rules:

```css
@media (max-width: 920px) {
  html { scroll-snap-type: none; }
  html.nav-lock,
  body.nav-lock { overflow: hidden; }

  .slide {
    scroll-snap-align: none;
    scroll-snap-stop: normal;
    scroll-margin-top: var(--topbar-h);
  }

  .sec::before,
  .vision::before {
    inset: 0;
    transform: none;
    animation: none;
    will-change: auto;
  }
  .sec::after,
  .vision-grade { animation: none; }

  .grain,
  .cinema-frame { display: none; }

  .topbar {
    background: rgba(3, 5, 12, .96);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .site-nav {
    position: absolute;
    top: 100%;
    right: 0;
    bottom: auto;
    height: calc(100dvh - var(--topbar-h));
    overscroll-behavior: contain;
  }

  html.js [data-reveal] { filter: none; }

  .sheet-tag,
  .btn,
  .marquee-track span,
  .pl-stage,
  .card {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .card,
  .sec::before,
  .vision::before,
  .marquee-track { will-change: auto; }
}
```

- [ ] **Step 2: Replace the phone composition with a content-driven flow**

Extend the existing `@media (max-width: 640px)` block with:

```css
@media (max-width: 640px) {
  :root { --wrap: calc(100vw - 32px); }

  .slide {
    min-height: auto;
    height: auto;
    justify-content: flex-start;
    padding: 32px 0;
  }

  .hero,
  .twin {
    min-height: 100svh;
    padding: 0;
  }

  .hero-inner { min-height: 100svh; }
  #system.slide { padding: 32px 0; gap: 20px; }
  #system .slide-frame { padding-bottom: 0; }
  #gates { height: auto; min-height: auto; }
  #contact { padding-bottom: 16px; }

  .marquee {
    overflow-x: auto;
    scrollbar-width: none;
    mask-image: none;
    -webkit-mask-image: none;
  }
  .marquee::-webkit-scrollbar { display: none; }
  .marquee-track {
    animation: none;
    width: max-content;
    transform: none;
  }
  .marquee-track span:nth-child(n + 15) { display: none; }

  .twin { touch-action: pan-y; }
  .twin-copy {
    min-height: 100svh;
    padding: calc(var(--topbar-h) + 20px) 16px 132px;
  }
  .twin-rail { width: 100%; padding: 16px 18px; }
  .twin-copy h2 { font-size: clamp(1.9rem, 9vw, 2.5rem); }
  .twin-stages {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px 12px;
    margin: 14px 0 12px;
  }
  .twin-stage { padding: 5px 0; font-size: 10px; }
  .twin-hud {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    left: 16px;
    right: 16px;
    bottom: 16px;
  }
  .hud-cell { min-width: 0; padding: 8px 12px; }

  .pl-gates {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 3px;
    width: calc(100% + 26px);
    margin-left: -26px;
  }
  .gate { width: auto; height: 44px; }

  .titleblock { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tb-project,
  .tb-status,
  .titleblock > :nth-child(6),
  .titleblock > :nth-child(9) { grid-column: 1 / -1; }
  .tb-cell { padding: 13px 12px 11px; }
  .tb-cell b { font-size: .95rem; }

  .vision-cta { position: relative; z-index: 2; }
  .footer { padding: 14px 0 0; }
  .footer p:last-child { margin-bottom: 0; }

  .sound-toggle,
  .nav-toggle { width: 44px; min-width: 44px; min-height: 44px; }
  .say-list li { min-height: 44px; display: flex; align-items: center; }
  .btn { min-height: 48px; }
}
```

- [ ] **Step 3: Make film progress compositor-driven**

Change the progress element styling:

```css
.film-bar i {
  width: 100%;
  transform: scaleX(0);
  transform-origin: left center;
  will-change: transform;
}
```

- [ ] **Step 4: Run the rendered contract**

Run the Node command from Task 1.

Expected: layout assertions improve, but HTML scroll lock and JavaScript rendering/audio assertions may still fail. Record remaining failures; do not change test thresholds.

---

### Task 3: Fix navigation state, Canvas budget, DOM churn, and audio ownership

**Files:**
- Modify: `script.js:19-242, 248-279, 458-1013, 1015-1044`
- Modify: `tests/portfolio-contract.ps1`
- Test: `tests/mobile-layout-contract.mjs`, `tests/portfolio-contract.ps1`

**Interfaces:**
- Consumes: existing DOM hooks and `createScene(canvas, opts)` options.
- Produces: synchronized `html/body.nav-lock`, `mobileCx/mobileCy/mobileFill`, 30 FPS/1.25 DPR phone Canvas budget, value-change-only Twin DOM updates, transform-based film progress, and one sound event per action.

- [ ] **Step 1: Lock the actual scrolling element**

In `setOpen(open)` add the same state to `document.documentElement`:

```js
document.documentElement.classList.toggle('nav-lock', open);
document.body.classList.toggle('nav-open', open);
document.body.classList.toggle('nav-lock', open);
```

- [ ] **Step 2: Lower and deduplicate audio**

Set conservative buses:

```js
audio.master.gain.value = 0.62;
audio.sfx.gain.value = 0.72;
```

Ramp the ambience bed to `0.24` instead of `0.34`.

Gate hover audio and assign one click owner:

```js
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
document.querySelectorAll(HOVER_SEL).forEach((el) => {
  if (canHover) el.addEventListener('pointerenter', hoverTone);
  el.addEventListener('click', (event) => {
    const owner = event.target.closest(HOVER_SEL);
    if (owner !== el) return;
    if (el.matches('[data-sound-toggle], [data-nav-toggle], .gate, .say-list li')) return;
    clickTone();
  });
});
```

Keep `initGateIgnition()` and `initSayChips()` as the sole owners of gate and command-chip tones.

Add lifecycle handling:

```js
document.addEventListener('visibilitychange', () => {
  if (!audio.ctx || !audio.enabled) return;
  if (document.hidden) audio.ctx.suspend();
  else audio.ctx.resume();
});
```

- [ ] **Step 3: Add phone framing and Canvas budgets**

Add `lastDraw: 0` to scene state. In `draw(time)` use:

```js
const phone = w < 760;
const fill = phone ? (opts.mobileFill ?? opts.fill ?? 0.62) : (opts.fill ?? 0.62);
const f = (h * fill * D) / MH;
const cx = w * (phone ? (opts.mobileCx ?? 0.5) : (opts.cx ?? 0.64));
const cy = h * (phone ? (opts.mobileCy ?? opts.cy ?? 0.52) : (opts.cy ?? 0.52));
```

Throttle only scene drawing, not page scrolling:

```js
function render(time) {
  if (!state.running) return;
  const frameMs = state.width < 760 ? 1000 / 30 : 0;
  if (!frameMs || time - state.lastDraw >= frameMs) {
    state.lastDraw = time;
    draw(time);
  }
  state.frame = window.requestAnimationFrame(render);
}
```

Cap the backing store in `resize()`:

```js
const maxDpr = state.width < 760 ? 1.25 : 2;
state.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
```

Set scene options:

```js
// S.00
mobileCx: 0.66, mobileCy: 0.63, mobileFill: 0.70,

// S.02
mobileCx: 0.58, mobileCy: 0.62, mobileFill: 0.58,
```

- [ ] **Step 4: Stop Twin DOM writes when the state is unchanged**

Before `setTwinStage`, define:

```js
let lastTwinIndex = -1;
let lastTwinLevel = -1;
```

Inside `setTwinStage`, return after computing `index` and `level` when both match. Update the cached values immediately before writing text/classes.

- [ ] **Step 5: Move film progress to a transform**

Replace the width write with:

```js
filmProgressEl.style.transform = 'scaleX(' + t.toFixed(4) + ')';
```

Keep chapter changes and captions unchanged.

- [ ] **Step 6: Expand the source contract**

Add assertions to `tests/portfolio-contract.ps1` for:

```powershell
foreach ($contract in '1000 / 30', 'mobileFill', 'document.documentElement.classList.toggle', "style.transform = 'scaleX('") {
    if ($script -notmatch [regex]::Escape($contract)) {
        throw "Missing mobile performance contract: $contract"
    }
}

foreach ($contract in 'html.nav-lock', 'grid-template-columns: repeat(2, minmax(0, 1fr))', 'height: calc(100dvh - var(--topbar-h))') {
    if ($css -notmatch [regex]::Escape($contract)) {
        throw "Missing mobile layout contract: $contract"
    }
}
```

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
& 'C:\Users\arnav\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check '.\script.js'
powershell -NoProfile -ExecutionPolicy Bypass -File '.\tests\portfolio-contract.ps1'
& 'C:\Users\arnav\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tests\mobile-layout-contract.mjs'
```

Expected: syntax check exit `0`, `Portfolio contract passed.`, and `Mobile layout contract passed.`

---

### Task 4: Run visual QA and tune only failed phone selectors

**Files:**
- Modify if required: `styles.css`, `script.js`
- Update: `README.md`
- Test: all Task 3 commands

**Interfaces:**
- Consumes: green automated contracts and the approved desktop reference.
- Produces: screenshots for all eight phone sections, open drawer, Vision/Contact boundary, contact ending, plus desktop Hero/Model/Contact comparison.

- [ ] **Step 1: Capture phone evidence**

Use Edge CDP with boot skipped and normal motion at 390×844. Capture `signal`, `system`, `twin`, `gates`, `toolkit`, `proof`, `vision`, `contact`, `vision-contact-boundary`, `contact-end`, and `nav-open` into `docs/previews/2026-07-11-mobile-flow/`.

- [ ] **Step 2: Capture breakpoint evidence**

Capture the Vision/Contact boundary, Gates, Twin, and Contact at 360×800 and 430×932.

- [ ] **Step 3: Capture desktop non-regression evidence**

Capture S.00, S.02, S.03, and S.07 at 1366×768 and 1920×1080. Compare typography, model framing, navigation, column structure, colors, and background crop to the current desktop baseline.

- [ ] **Step 4: Inspect every screenshot**

Block completion for any cropped CTA/text, section overlap, document overflow, blank boundary over 72 px, hidden drawer link, Twin rail/HUD collision, Gates overflow, one-column contact mismatch, or desktop visual drift.

- [ ] **Step 5: Tune only the failing selector**

For each visual failure, change one CSS variable/selector, rerun the rendered contract, and recapture that viewport. Do not weaken the contract or add a new breakpoint unless 360, 390, and 430 cannot share the approved rule.

- [ ] **Step 6: Update README verification**

Add:

````markdown
### Mobile verification

The phone layout is rendered and asserted at 360×800, 390×844, and 430×932 with the dependency-free Edge CDP contract:

```powershell
& 'C:\Users\arnav\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tests\mobile-layout-contract.mjs'
```

Desktop remains the visual source of truth at widths above 1060 px.
````

- [ ] **Step 7: Run the full verification gate again**

Expected: every command from Task 3 passes with no console errors.

---

### Task 5: Update durable ArchiTECH truth

**Files:**
- Create: `D:\ArchiTECH\_Claude_Agent_Run\2026-07-11_ARCHITECH_PORTFOLIO_MOBILE_DOCUMENT_FLOW_REPORT.md`
- Modify: `D:\ArchiTECH\_Claude_Agent_Run\REPORT_MANIFEST.compact.json`
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\CURRENT_STATE.compact.md`
- Test: JSON parse, source checks, dry-run sync.

**Interfaces:**
- Consumes: final test output, screenshot paths, changed-file list.
- Produces: report 70 as the latest portfolio/web-development source of truth.

- [ ] **Step 1: Write report 70**

Record scope, verified root causes, exact mobile rules, performance/audio changes, RED/GREEN test output, screenshot matrix, desktop non-regression result, changed files, and the fact that GitHub was not pushed.

- [ ] **Step 2: Update the manifest**

Set:

```json
"portfolio_site": 70,
"web_development": 70,
"next_free": 71,
"current_through": 70
```

Append report 70 with `depends_on: [68]`, `supersedes: [68]`, status `complete; Edge CDP verified`, and a one-line summary naming the phone document flow, contained backgrounds, mobile performance profile, and desktop non-regression.

- [ ] **Step 3: Update current state**

Add report 70 as the latest update, keep report 69 and report 68 as previous baselines, state the exact verified phone viewports, and set next free report to 71.

- [ ] **Step 4: Validate truth files**

Run:

```powershell
Get-Content -Raw 'D:\ArchiTECH\_Claude_Agent_Run\REPORT_MANIFEST.compact.json' | ConvertFrom-Json | Out-Null
rg -n 'report 70|Reports current through \*\*70\*\*|next free: \*\*71\*\*' 'D:\ArchiTECH\ArchiTECH - Command Center\CURRENT_STATE.compact.md'
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:\ArchiTECH\_sync.ps1' -DryRun
```

Expected: JSON parses, all three current-state markers exist, and dry-run sync exits successfully without writing to `D:\BIMx - Revit API`.

- [ ] **Step 5: Final verification**

Run syntax, source contract, rendered contract, screenshot inspection, manifest parse, and `git status --short -- 'ArchiTECH - Command Center/ArchiTECH Portfolio'`. Report the local changes explicitly; do not claim a GitHub update.

# ArchiTECH Portfolio Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free, locally runnable portfolio site that turns the ArchiTECH Command Center story into a cinematic product experience and includes the owner's supplied social links.

**Architecture:** A static three-file site separates semantic content (`index.html`), responsive visual behavior (`styles.css`), and browser-native interactive behavior (`script.js`). A PowerShell contract test validates the required contact, interaction, accessibility, and local-only properties without adding a test framework.

**Tech Stack:** HTML5, CSS3, Canvas 2D, Web Audio API, PowerShell 5+.

## Global Constraints

- Create only under `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio`.
- Do not change live Command Center services, dashboard behavior, or backend/API files.
- Use no package manager, CDN, paid API, or remote assets.
- Use the supplied LinkedIn, GitHub, Instagram, and email values exactly.
- Respect `prefers-reduced-motion`; require a user action before sound.

---

### Task 1: Write the static-site contract test

**Files:**
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\tests\portfolio-contract.ps1`

**Interfaces:**
- Consumes: the three files created by Tasks 2–4.
- Produces: a non-zero exit with readable missing-contract messages, or `Portfolio contract passed`.

- [ ] **Step 1: Write the failing test**

```powershell
$site = Split-Path $PSScriptRoot -Parent
foreach ($file in 'index.html', 'styles.css', 'script.js') {
  if (-not (Test-Path (Join-Path $site $file))) { throw "Missing $file" }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1`

Expected: `Missing index.html`.

- [ ] **Step 3: Expand the contract minimally**

```powershell
$html = Get-Content (Join-Path $site 'index.html') -Raw
if ($html -notmatch 'https://github.com/architech97') { throw 'GitHub link missing' }
if ($html -notmatch 'mailto:Ar.navneet97@gmail.com') { throw 'Email link missing' }
```

- [ ] **Step 4: Run test after implementation**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1`

Expected: `Portfolio contract passed`.

### Task 2: Build the semantic portfolio narrative

**Files:**
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\index.html`

**Interfaces:**
- Consumes: `styles.css` and `script.js` by relative URL.
- Produces: semantic landmarks, contact links, Canvas hosts, interactive controls, and status data attributes.

- [ ] **Step 1: Write minimal semantic structure**

```html
<main id="main-content">
  <section id="signal"><canvas id="signal-canvas" aria-hidden="true"></canvas></section>
  <section id="contact"><a href="mailto:Ar.navneet97@gmail.com">Ar.navneet97@gmail.com</a></section>
</main>
```

- [ ] **Step 2: Add full product story and contact deck**

Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, descriptive headings, and outbound social links with `target="_blank" rel="noreferrer"`.

- [ ] **Step 3: Verify structure**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1`

Expected: only the still-missing stylesheet/script assertions fail.

### Task 3: Create the responsive visual system

**Files:**
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\styles.css`

**Interfaces:**
- Consumes: class names and section IDs in `index.html`.
- Produces: responsive layout, Command-Center-aligned tokens, visible focus treatments, animated surfaces, and a reduced-motion fallback.

- [ ] **Step 1: Define palette and typographic tokens**

```css
:root { --ink:#05060f; --cyan:#52bcff; --blue:#2f9bff; --ice:#d8ecf8; }
```

- [ ] **Step 2: Style hero, hologram, cards, contact deck, and small screens**

Use CSS grid and clamp-based sizing. Keep visual effects decorative and keep all text readable over them.

- [ ] **Step 3: Add accessibility fallback**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
}
```

- [ ] **Step 4: Verify contract**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1`

Expected: only the still-missing script assertion fails.

### Task 4: Implement native interaction layers

**Files:**
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\script.js`

**Interfaces:**
- Consumes: `#signal-canvas`, `#twin-canvas`, `[data-sound-toggle]`, `[data-reveal]`, and `.js-audio-hit` from `index.html`.
- Produces: responsive Canvas animations, scroll reveals, sound enable/mute behavior, and no-op fallbacks for unavailable APIs.

- [ ] **Step 1: Implement the visual Canvas loop**

```javascript
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) requestAnimationFrame(render);
```

- [ ] **Step 2: Implement opt-in sound**

```javascript
button.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  button.setAttribute('aria-pressed', String(soundEnabled));
});
```

- [ ] **Step 3: Implement reveal and pointer enhancements**

Use `IntersectionObserver` when available and leave content visible if it is unavailable.

- [ ] **Step 4: Run the full contract test**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1`

Expected: `Portfolio contract passed`.

### Task 5: Document local operation

**Files:**
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\README.md`

**Interfaces:**
- Consumes: delivered file layout and actual local-open procedure.
- Produces: concise instructions, boundaries, used Command Center context, and customization points.

- [ ] **Step 1: Document opening the site**

```markdown
Open `index.html` in a modern desktop browser. No build, server, login, API key, or package installation is required.
```

- [ ] **Step 2: Record content boundaries**

List the Command Center facts used and explicitly name the dashboard, JARVIS services, and backend/API files as intentionally unmodified.

- [ ] **Step 3: Re-run the contract test**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1`

Expected: `Portfolio contract passed`.

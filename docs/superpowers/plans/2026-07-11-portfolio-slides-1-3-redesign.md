# ArchiTECH Portfolio Slides 1 and 3 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the named wireframe landmark scenes on S.00 and S.02 with solid, shaded generic BIM models and a sharper architectural-command composition.

**Architecture:** Keep the existing three-file static site and shared Canvas scene lifecycle. Extend each model from `{ lines, h, ring }` to `{ lines, solids, h, ring }`; render depth-sorted solid prism faces before optional site/annotation lines. Scope layout changes to `.hero` and `.twin`, and drive all S.02 status surfaces from one stage resolver.

**Tech Stack:** HTML5, CSS3, browser-native Canvas 2D, JavaScript, PowerShell contract test.

## Global Constraints

- Do not display or reference any famous building name in the live portfolio source or copy.
- Both scenes use generic demo-building geometry.
- No wiregraph or line-only holographic building treatment.
- No package, CDN, remote image, framework, or paid service.
- Preserve `#signal`, `#twin`, `#signal-canvas`, `#twin-canvas`, navigation anchors, reduced motion, and pointer orbit.
- The `D:\ArchiTECH` Git root is unborn and the portfolio is untracked; do not create a partial initial commit.

---

### Task 1: Lock the redesign contract

**Files:**
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\tests\portfolio-contract.ps1`

**Interfaces:**
- Consumes: `index.html`, `styles.css`, `script.js`, `README.md`.
- Produces: failing assertions for generic-copy and solid-model contracts.

- [ ] **Step 1: Read README and add live-source assertions**

```powershell
$readme = Get-Content -LiteralPath (Join-Path $site 'README.md') -Raw
$liveSource = $html + "`n" + $css + "`n" + $script + "`n" + $readme

foreach ($forbiddenName in 'Burj Khalifa', 'Fallingwater') {
    if ($liveSource -match [regex]::Escape($forbiddenName)) {
        throw "Named landmark remains in live source: $forbiddenName"
    }
}

foreach ($solidContract in 'solidPrism', 'SOLID_MATERIALS', 'MODEL.solids') {
    if ($script -notmatch [regex]::Escape($solidContract)) {
        throw "Missing solid model contract: $solidContract"
    }
}
```

- [ ] **Step 2: Add HTML/CSS redesign contracts**

```powershell
foreach ($value in 'GENERIC BIM MODEL', 'data-twin-stages') {
    if ($html -notmatch [regex]::Escape($value)) {
        throw "Missing redesigned slide contract: $value"
    }
}

foreach ($selector in '.twin-stage', '.model-plate') {
    if ($css -notmatch [regex]::Escape($selector)) {
        throw "Missing redesigned slide selector: $selector"
    }
}
```

- [ ] **Step 3: Run the contract and confirm it fails**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1
```

Expected: failure on the first remaining named-landmark or solid-model contract.

### Task 2: Recompose S.00 and S.02

**Files:**
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\index.html:62-183`
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\styles.css:551-775`
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\styles.css:936-1061`

**Interfaces:**
- Consumes: existing scene canvases, counter attributes, status IDs, and slide anchors.
- Produces: `.model-plate`, `[data-twin-stages]`, `.twin-stage`, and the preserved status/HUD IDs.

- [ ] **Step 1: Simplify S.00 copy and controls**

Keep the existing H1, one primary link to `#system`, the three factual metrics, and replace the live status with:

```html
<p class="hero-build mono" aria-hidden="true"><i></i>DEMO MODEL · LIVE ASSEMBLY</p>
```

Add a visual caption beside the model:

```html
<p class="model-plate mono" aria-hidden="true">FIG. 01 · GENERIC BIM MODEL · LIVE</p>
```

- [ ] **Step 2: Replace the S.02 glass card with an editorial rail**

```html
<div class="twin-copy" data-reveal>
  <div class="twin-rail">
    <p class="sheet-tag mono">S.02 · DIGITAL TWIN</p>
    <p class="model-plate mono">FIG. 02 · GENERIC BIM MODEL</p>
    <h2 id="twin-title">From massing<br>to model intelligence.</h2>
    <p>A generic demo building assembles as coordinated structure, floors, envelope, and systems—then verifies as one digital twin.</p>
    <ol class="twin-stages mono" data-twin-stages aria-label="Model assembly stages">
      <li class="twin-stage is-active" data-stage="0">01 · Structure</li>
      <li class="twin-stage" data-stage="1">02 · Floor plates</li>
      <li class="twin-stage" data-stage="2">03 · Envelope</li>
      <li class="twin-stage" data-stage="3">04 · Systems</li>
      <li class="twin-stage" data-stage="4">05 · Verified</li>
    </ol>
    <p class="twin-hint mono">DRAG TO INSPECT · SOLID BIM VIEW</p>
    <p class="twin-status mono">ACTIVE · <b id="twin-build-status">Structure</b></p>
  </div>
</div>
```

- [ ] **Step 3: Restyle only the two slides**

Apply these scoped layout rules, then preserve the existing responsive slide-height behavior:

```css
.hero-copy { max-width: min(34rem, 44%); }
.hero .hero-actions { margin-bottom: 24px; }
.hero .btn { border-radius: 3px; }
.model-plate { font-size: 11px; letter-spacing: .18em; color: rgba(190,220,242,.72); }

.twin-copy { align-items: stretch; padding: calc(var(--topbar-h) + 64px) 0 72px; }
.twin-rail {
  width: min(390px, 34vw); padding: 28px 30px;
  border-block: 1px solid rgba(82,188,255,.24);
  border-left: 2px solid var(--cyan);
  background: rgba(5,8,13,.92);
}
.twin-stages { list-style: none; margin: 24px 0 20px; padding: 0; }
.twin-stage { padding: 8px 0; font-size: 11px; letter-spacing: .14em; color: var(--muted); }
.twin-stage.is-active { color: var(--cyan); }
.twin-hud { left: auto; right: 48px; transform: none; bottom: 40px; }

@media (max-width: 640px) {
  .twin-copy { align-items: flex-start; padding: calc(var(--topbar-h) + 24px) 20px 118px; }
  .twin-rail { width: 100%; padding: 20px; }
  .twin-hud { left: 20px; right: 20px; bottom: 20px; }
}
```

- [ ] **Step 4: Re-run contract**

Expected: HTML/CSS contracts pass; solid-model contracts still fail.

### Task 3: Add the solid BIM renderer and generic models

**Files:**
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\script.js:281-1110`

**Interfaces:**
- Consumes: `createScene(canvas, opts)`, `project(x, y, z, f, cx, cy)`, construction progress, pointer orbit.
- Produces: `solidPrism(solids, ...)`, `SOLID_MATERIALS`, `model.solids`, `drawSolids(...)`, `DEMO_TOWER`, and `DEMO_BUILDING`.

- [ ] **Step 1: Define prism data and material roles**

```javascript
const SOLID_MATERIALS = {
  base:      { rgb: '22,42,64', alpha: 0.98, edge: '92,146,188' },
  structure: { rgb: '156,190,214', alpha: 0.92, edge: '208,232,246' },
  slab:      { rgb: '86,126,154', alpha: 0.96, edge: '174,214,238' },
  glass:     { rgb: '35,112,164', alpha: 0.66, edge: '92,190,236' },
  core:      { rgb: '190,108,48', alpha: 0.90, edge: '255,184,92' },
};

function solidPrism(solids, cx, cz, w, d, y0, y1, material) {
  solids.push({ cx, cz, w, d, y0, y1, material });
}
```

- [ ] **Step 2: Replace named geometry with generic geometry**

Implement the generic models with these explicit masses and return `{ lines, solids, h, ring }` from both:

```javascript
function buildDemoTower() {
  const lines = [], solids = [], h = 176;
  groundGrid(lines, 150, 24);
  solidPrism(solids, 0, 0, 92, 70, 0, 8, 'base');
  solidPrism(solids, 0, 0, 18, 18, 8, 162, 'core');
  [
    [0, 0, 58, 44, 8, 54],
    [-4, 2, 50, 38, 54, 96],
    [4, -2, 42, 32, 96, 132],
    [0, 0, 30, 24, 132, 158],
  ].forEach((mass) => solidPrism(solids, ...mass, 'glass'));
  for (let y = 16; y <= 158; y += 8) {
    const scale = y < 54 ? 1 : y < 96 ? 0.86 : y < 132 ? 0.72 : 0.52;
    solidPrism(solids, 0, 0, 62 * scale, 48 * scale, y, y + 1.2, 'slab');
  }
  solidPrism(solids, 0, 0, 22, 18, 158, 170, 'structure');
  return { lines, solids, h, ring: 54 };
}

function buildDemoBuilding() {
  const lines = [], solids = [], h = 78;
  groundGrid(lines, 145, 24);
  solidPrism(solids, 0, 0, 108, 74, 0, 5, 'base');
  solidPrism(solids, -24, 0, 15, 17, 5, 70, 'core');
  solidPrism(solids, 27, 8, 13, 15, 5, 62, 'core');
  solidPrism(solids, -13, 0, 70, 28, 6, 62, 'glass');
  solidPrism(solids, 28, 13, 44, 24, 6, 54, 'glass');
  solidPrism(solids, 18, -19, 50, 22, 6, 46, 'glass');
  for (let level = 0; level < 7; level++) {
    const y = 6 + level * 8;
    solidPrism(solids, -8, 0, 88, 44, y, y + 1.3, 'slab');
  }
  solidPrism(solids, -12, 0, 58, 34, 62, 70, 'structure');
  solidPrism(solids, 18, 2, 20, 18, 54, 66, 'structure');
  return { lines, solids, h, ring: 62 };
}

const DEMO_TOWER = buildDemoTower();
const DEMO_BUILDING = buildDemoBuilding();
```

- [ ] **Step 3: Depth-sort and paint prism faces before lines**

Add `const SOLIDS = MODEL.solids || [];` beside `LINES`, then use this complete painter inside `createScene`:

```javascript
function drawSolids(f, cx, cy, buildCut) {
  const faces = [];
  for (const solid of SOLIDS) {
    if (solid.y0 >= buildCut) continue;
    const y1 = Math.min(solid.y1, buildCut);
    if (y1 <= solid.y0 + 0.1) continue;
    const x0 = solid.cx - solid.w / 2, x1 = solid.cx + solid.w / 2;
    const z0 = solid.cz - solid.d / 2, z1 = solid.cz + solid.d / 2;
    const vertices = [
      [x0, solid.y0, z0], [x1, solid.y0, z0], [x1, solid.y0, z1], [x0, solid.y0, z1],
      [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
    ];
    const definitions = [[4,5,6,7], [0,1,5,4], [1,2,6,5], [2,3,7,6], [3,0,4,7]];
    definitions.forEach((definition, faceIndex) => {
      const points = definition.map((index) => project(...vertices[index], f, cx, cy));
      if (points.some((point) => !point)) return;
      faces.push({
        points,
        depth: points.reduce((sum, point) => sum + point.d, 0) / points.length,
        material: SOLID_MATERIALS[solid.material] || SOLID_MATERIALS.glass,
        shade: [1.12, 0.82, 0.68, 0.92, 0.74][faceIndex],
      });
    });
  }
  faces.sort((a, b) => a.depth - b.depth);
  for (const face of faces) {
    ctx2d.beginPath();
    face.points.forEach((point, index) => index ? ctx2d.lineTo(point.x, point.y) : ctx2d.moveTo(point.x, point.y));
    ctx2d.closePath();
    ctx2d.fillStyle = `rgba(${face.material.rgb},${Math.min(1, face.material.alpha * face.shade)})`;
    ctx2d.fill();
    ctx2d.strokeStyle = `rgba(${face.material.edge},${Math.min(0.72, 0.32 + face.depth * 0.25)})`;
    ctx2d.lineWidth = 0.8;
    ctx2d.stroke();
  }
}
```

- [ ] **Step 4: Remove the hologram treatment for solid scenes**

When `opts.solid` is true, add this studio background and use it instead of `drawCinematicWorld`:

```javascript
function drawStudioWorld(w, h, cx, cy, f) {
  ctx2d.fillStyle = '#05080d';
  ctx2d.fillRect(0, 0, w, h);
  const light = ctx2d.createRadialGradient(cx, cy * 0.72, 20, cx, cy, Math.max(w, h) * 0.58);
  light.addColorStop(0, 'rgba(28,70,104,.34)');
  light.addColorStop(0.42, 'rgba(13,35,56,.16)');
  light.addColorStop(1, 'rgba(5,8,13,0)');
  ctx2d.fillStyle = light;
  ctx2d.fillRect(0, 0, w, h);
  ctx2d.strokeStyle = 'rgba(82,148,190,.12)';
  ctx2d.lineWidth = 0.7;
  for (let grid = -144; grid <= 144; grid += 24) {
    for (const endpoints of [[[grid,0,-144],[grid,0,144]], [[-144,0,grid],[144,0,grid]]]) {
      const a = project(...endpoints[0], f, cx, cy);
      const b = project(...endpoints[1], f, cx, cy);
      if (!a || !b) continue;
      ctx2d.beginPath(); ctx2d.moveTo(a.x, a.y); ctx2d.lineTo(b.x, b.y); ctx2d.stroke();
    }
  }
  const origin = project(0, 0, 0, f, cx, cy);
  if (origin) {
    ctx2d.fillStyle = 'rgba(0,0,0,.34)';
    ctx2d.beginPath();
    ctx2d.ellipse(origin.x, origin.y + 10, Math.min(w, h) * .26, Math.min(w, h) * .07, 0, 0, Math.PI * 2);
    ctx2d.fill();
  }
}
```

In `draw()`, use:

```javascript
if (opts.solid) drawStudioWorld(w, h, cx, cy, f);
else drawCinematicWorld(w, h, cx, cy, f, time);

state.buildP = buildP;
if (opts.solid) drawSolids(f, cx, cy, isConstruct ? constructCut : MH + 1);
```

Wrap the existing model-line loop, scan disc, spire beacon, and mote loop in `if (!opts.solid)`. Keep anchored labels outside that condition.

- [ ] **Step 5: Wire both slides to solid mode**

```javascript
createScene(document.getElementById('signal-canvas'), {
  model: DEMO_TOWER,
  solid: true,
  construct: true,
  constructCycle: 20000,
  parallax: true,
  host: document.getElementById('signal'),
});

createScene(document.getElementById('twin-canvas'), {
  model: DEMO_BUILDING,
  solid: true,
  construct: true,
  constructCycle: 20000,
  orbit: true,
  host: document.getElementById('twin'),
});
```

- [ ] **Step 6: Run syntax and contract checks**

```powershell
node --check .\script.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1
```

Expected: syntax check exits 0 and `Portfolio contract passed.`

### Task 4: Unify stage state and verify visuals

**Files:**
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\script.js:1023-1110`
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\README.md`
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\docs\previews\2026-07-11-s00-solid.png`
- Create: `D:\ArchiTECH\ArchiTECH - Command Center\ArchiTECH Portfolio\docs\previews\2026-07-11-s02-solid.png`

**Interfaces:**
- Consumes: `state.filmT`, `state.scanY`, `[data-twin-stages]`, HUD IDs.
- Produces: one `setTwinStage(state)` update path and reproducible screenshot evidence.

- [ ] **Step 1: Drive every S.02 label from one stage array**

```javascript
const TWIN_STAGES = ['STRUCTURE', 'FLOOR PLATES', 'ENVELOPE', 'SYSTEMS', 'VERIFIED'];

function setTwinStage(state) {
  const progress = reducedMotion() ? 1 : clamp(state.buildP || 0, 0, 1);
  const index = clamp(Math.floor(progress * TWIN_STAGES.length), 0, TWIN_STAGES.length - 1);
  const label = TWIN_STAGES[index];
  document.getElementById('twin-build-status').textContent = label;
  document.getElementById('twin-layer').textContent = label;
  const level = clamp(Math.ceil(progress * 7), 1, 7);
  document.getElementById('twin-level').textContent = 'L.' + String(level).padStart(2, '0');
  document.getElementById('twin-elev').textContent = '+' + (level * 4.2).toFixed(2) + ' m';
  document.querySelectorAll('.twin-stage').forEach((item, itemIndex) => {
    item.classList.toggle('is-active', itemIndex === index);
  });
}
```

Call `setTwinStage(state)` from the S.02 `onFrame` callback; remove the separate `FW_STATUS`, `FW_LAYER_HUD`, and `lastLevel` paths.

- [ ] **Step 2: Document the generic solid scenes**

Replace wireframe/landmark wording in README with `solid shaded generic BIM demo models`, noting that S.02 remains drag-to-orbit.

- [ ] **Step 3: Run desktop and mobile visual QA**

Capture S.00 and S.02 at 1920×1080 and 390×844. Verify: filled faces dominate; no famous-building copy; no clipped labels; no horizontal overflow; reduced motion shows the complete model; panel/HUD labels match; console errors and warnings are zero.

- [ ] **Step 4: Run final automated checks**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1
node --check .\script.js
git diff --check -- 'ArchiTECH - Command Center/ArchiTECH Portfolio'
```

Expected: contract passes, syntax exits 0, and diff check emits no errors.

### Task 5: Synchronize durable ArchiTECH truth

**Files:**
- Modify: `D:\ArchiTECH\ArchiTECH - Command Center\CURRENT_STATE.compact.md`
- Create: `D:\ArchiTECH\_Claude_Agent_Run\2026-07-11_ARCHITECH_PORTFOLIO_SOLID_MODEL_SLIDES_REPORT.md`
- Modify: `D:\ArchiTECH\_Claude_Agent_Run\REPORT_MANIFEST.compact.json`

**Interfaces:**
- Consumes: final verification output and screenshot paths.
- Produces: report 68 and current-state/manifest pointers to the redesigned slides.

- [ ] **Step 1: Write report 68 with only verified facts**

Record changed files, the removal of named landmark copy, solid generic models, synchronized S.02 stage state, exact automated command outputs, screenshot evidence, and any remaining limitations.

- [ ] **Step 2: Update current state and manifest**

Make report 68 the newest portfolio entry without rewriting prior reports. Keep report 67 as historical evidence.

- [ ] **Step 3: Run JSON and sync checks**

```powershell
Get-Content -LiteralPath 'D:\ArchiTECH\_Claude_Agent_Run\REPORT_MANIFEST.compact.json' -Raw | ConvertFrom-Json | Out-Null
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:\ArchiTECH\_sync.ps1' -DryRun
```

Expected: JSON parses and dry-run completes without a new live-sync failure.

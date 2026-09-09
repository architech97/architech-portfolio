# ArchiTECH Portfolio — Visual & Motion Upgrade Plan
**Role:** ArchiTECH Canvas  
**Date:** 2026-09-09  
**Live:** https://architech97.github.io/architech-portfolio/  
**Local SoT (today):** `D:\ArchiTECH\ArchiTECH - Command Center\archive\ArchiTECH Portfolio`  
**Craft refs:** `igloo-clone` (WebGL pathing / materials / HUD), `bao-scroll-story` (scroll-as-timeline, quality tiers)  
**Identity law:** `PRODUCT.md` — JARVIS HUD (midnight glass, electric blue, amber attention). **Do not** import Igloo fog-gray / consumer-crypto look.

---

## 1. North star

Raise the live site to **igloo-level craft** (depth, scroll cinema, material honesty, HUD precision) while keeping **local-first**:

| Must keep | May evolve |
|---|---|
| No cloud, no API keys, no paid CDN at runtime | Optional local `vendor/` ESM modules |
| Works offline from disk / GitHub Pages static | Optional Vite build that outputs static `dist/` for Pages only |
| Report-attributed metrics; drawing-set sheet language | Richer scenes + scroll-scrubbed storytelling |
| `prefers-reduced-motion` → fully legible static | Quality tiers (high / medium / low) like bao |
| Command Center palette + glass vocabulary | Better typography, lighting, parallax, WebGL where earned |

**Craft translation (steal technique, not skin):**

| Igloo / Bao technique | ArchiTECH expression |
|---|---|
| Wheel/scroll → single `progress` 0..1 driving the world | Section-local progress for S.00 hero + S.02 twin (+ optional film strip) |
| Physical materials + fog depth | Midnight glass BIM solids with ACES-like tone, blue rim light, depth fade |
| HUD mono scramble / stage labels | Existing mono HUD + sharper stage/elevation readouts; optional glyph reveal |
| Lazy chapter build + quality tiers | Lazy WebGL init; Canvas 2D fallback always present |
| Pure function of progress (bao) | Gate chain, twin assembly, film tower driven by scroll/progress — reversible |

---

## 2. Current baseline (honest)

- Static v3: `index.html` + `styles.css` (~62 KB) + `script.js` (~54 KB), zero npm deps.
- Canvas **2D** software “3D” (depth-sorted prisms) on `#signal-canvas`, `#twin-canvas`, `#film-canvas`.
- Motion: boot cinematic, IntersectionObserver reveals, counters, marquee, liquid-glass tilt, ken-burns BGs, opt-in Web Audio.
- A11y floor already present (skip link, reduced-motion block, keyboard nav).
- Local copy is slightly ahead of GitHub Pages (styles/script larger than remote). Folder was moved under Command Center `archive/` — **restore SoT before shipping work**.

**Ceiling today:** strong recruiter narrative; scenes read “solid diagram,” not “engineered holography.” Depth is painted more than earned (PRODUCT principle #2).

---

## 3. Non-goals

- Do not turn the portfolio into an igloo.inc clone or arctic brand.
- Do not require an always-on Node toolchain for local viewing of the **lite** path.
- Do not couple the site to JARVIS runtime ports or live APIs.
- Do not invent metrics — refresh only from `CURRENT_STATE.compact.md` / numbered reports.
- Do not touch `dashboard.html`, runner, event-bus, or other Command Center services.

---

## 4. Architecture decision (local-first + craft)

**Progressive enhancement, three layers:**

```
L0  HTML/CSS narrative + Canvas 2D scenes     ← always works (file:// / Pages)
L1  Scroll cinema + HUD polish (still 0 npm) ← Phase 1
L2  Optional WebGL twin/hero (vendored Three)← Phase 2–3; falls back to L0/L1
```

**Runtime rule:** detect WebGL + `qualityTier()` + `prefers-reduced-motion`.  
If any fail → keep current Canvas 2D path. Never blank stage.

**Dependency rule:**

- Phase 1: **zero new deps.**
- Phase 2+: vendor `three` (and only if needed a tiny tween helper) under `vendor/` as ESM; load via `<script type="module">`. Document `python -m http.server` / `npx serve` for module loading (file:// modules are brittle).
- Optional later: Vite build solely to ship optimized `dist/` to GitHub Pages — source of truth remains the readable tree.

This preserves “open locally without accounts” while allowing igloo-grade WebGL where hardware allows.

---

## 5. Phased plan

### Phase 0 — Housekeeping (½ day)
1. Restore portfolio SoT out of `archive/` to a clear Canvas-owned path (propose: `ArchiTECH - Content Creation\ArchiTECH - Web Development\architech-portfolio` **or** back under Command Center root — Grid/Nexus if rename). Until then, treat archive copy as working tree.
2. Diff local vs `architech97/architech-portfolio` and sync Pages.
3. Re-run `tests/portfolio-contract.ps1`; snapshot mobile/desktop previews.
4. Freeze metrics list from current `CURRENT_STATE.compact.md` for a separate content pass (not blocking craft).

**Exit:** one canonical folder + green contract + Pages matches local.

### Phase 1 — Zero-dep craft lift (1–2 days) ← **start here for visible win**
Borrow bao/igloo *feel* without WebGL:

1. **Scroll-as-timeline (CSS + rAF)**  
   - Map scroll progress within S.00 / S.02 / S.03 to scene params (assembly %, gate ignition index, camera yaw).  
   - Reversible scrub (no one-shot event state).

2. **HUD precision**  
   - Tighter mono hierarchy, sheet-tag rhythm, stage/level/elevation live readout on twin.  
   - Optional character-reveal on hero title (gated by reduced-motion).

3. **Depth without libraries**  
   - Improve Canvas 2D lighting: stronger occlusion sort, rim from `--blue`, fog fade by depth, subtler mote field.  
   - Parallax BG plates only on fine pointer; off on coarse/reduced.

4. **Motion discipline**  
   - One shared `--ease` language; kill decorative loops that don’t encode state (PRODUCT #1).  
   - Gate chain: progress-scrubbed ignition with rollback flash on failure beat.

5. **Performance**  
   - Pause offscreen canvases; DPR cap 1.5–1.75; respect `save-data` / coarse pointer as medium/low tier.

**Exit:** side-by-side preview still zero-deps; reduced-motion still perfect; contract still green.

### Phase 2 — WebGL progressive twin (2–3 days)
1. Vendor Three r170+ under `vendor/three/`.
2. Replace **S.02 twin** first (highest payoff): real meshes for structure → floors → envelope → systems, scroll-scrubbed assembly, drag orbit retained.
3. Keep Canvas 2D builder as fallback (`data-scene="canvas2d"`).
4. Materials: dark glass + emissive blue edges (JARVIS), not ice transmission.
5. Quality tiers from bao: DPR, AA, mote/particle counts.

**Exit:** WebGL twin on capable desktops; identical narrative on fallback; still offline.

### Phase 3 — Hero + film cinema (2 days)
1. S.00 hero: pointer-follow camera path (igloo `cameraAt(progress)` pattern) over a compact BIM massing — scroll optional, pointer primary.
2. S.05/film strip: upgrade twist tower to WebGL or keep 2D if budget says so.
3. Optional ambient particle volumes only if they read as **telemetry**, not decoration.

**Exit:** hero feels “engineered holography”; Lighthouse/perf budget documented.

### Phase 4 — Packaging & deploy (1 day)
1. Optional Vite pipeline: `npm run build` → `dist/` → GitHub Pages.
2. Keep README paths: “Lite: open / serve static. Full: build for Pages.”
3. Automate contract test in CI if desired (Forge).
4. Custom domain / SEO only after craft stabilizes.

---

## 6. Acceptance criteria

- [ ] `file://` or static server: L0/L1 fully usable offline  
- [ ] WebGL failure or reduced-motion: no blank canvases; copy + metrics intact  
- [ ] Palette stays midnight / `#2f9bff` / amber attention — no Igloo fog brand shift  
- [ ] Every animated state maps to meaning (boot / assemble / gate / proof)  
- [ ] Mobile drawer + 640/920 breakpoints still hold  
- [ ] `portfolio-contract.ps1` passes  
- [ ] Metrics remain report-attributed (`r.xx`)

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| file:// blocks ES modules | Document static server; Pages always HTTP |
| Three.js weight | Twin-only first; tree-shake/build in Phase 4; lazy import |
| Scope creep into JARVIS shell | Portfolio folder isolation stays sacred |
| Archive path drift | Phase 0 restore + STRUCTURE.md note via Grid |
| Copying Igloo aesthetics | Design review against PRODUCT anti-references |

---

## 8. Coordination

- **Canvas:** owns design direction, tokens, scene UX, this plan, L1 implementation.  
- **Forge:** Phase 2–4 execution (vendor Three, Vite, Pages deploy) when briefed.  
- **Nexus:** path restore / estate placement if moving out of `archive/`.  
- **Sentinel:** contract + reduced-motion + visual QA before Pages promote.  
- **Grid:** STRUCTURE.md update after SoT path decision.

---

## 9. Recommended immediate next step

**Approve Phase 0 + Phase 1.**  
Ship a zero-dep craft lift first (visible quality, no architecture risk), then decide WebGL twin with eyes on a working L1.

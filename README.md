# ArchiTECH Portfolio — v3

A self-contained, cinematic portfolio and product experience for **ArchiTECH:
BIM × Tech × AI × Architecture** (Navneet Singh). The site is composed as an
architectural drawing set — sections carry sheet numbers (S.00 SIGNAL →
S.07 TITLE BLOCK) and the contact section is a literal drawing title block.

## Open locally

Open [index.html](index.html) in a current desktop browser (double-click works —
no build, server, login, API key, package, or paid service required). For the
crispest experience use a Chromium browser at desktop size; the site also adapts
to tablet and mobile.

## What is included

- **Boot cinematic** — a short system boot sequence (real ports and counts) that
  runs once per browser session; skipped automatically on reduced motion.
- **Canvas 2D scenes** (no libraries): solid shaded generic BIM demo models with
  depth-sorted prism faces, studio lighting, and anchored data tags. The S.00 hero
  follows the pointer; S.02 remains drag-to-orbit with a live stage, level, and
  elevation readout.
- **Real, report-attributed metrics** from the Command Center state file (vault
  notes, Qdrant vectors, ribbon tools, MCP tools, build results, QA case) — each
  stat carries its report number (r.10–r.65). No invented numbers.
- **Governed-writes pipeline** — the G0–G6 gate chain, transaction, validation,
  evidence ledger, and rollback path, animated on reveal.
- **Recruiter-facing narrative (v6)** — THE BUILDER section, hero stats + telemetry
  grid, two-belt marquee of shipped tool names, governed-writes gates in nav, bento
  toolkit with Revit MCP voice chips, cinematic field-proof case, and VISION on
  brand landscape art. Backend/port details are deliberately absent from the copy.
- **Cinematic UI (v6)** — letterbox vignette, film grain, primary/secondary CTA
  hierarchy, mobile drawer nav, cinematic case layout, quieter vision list, liquid
  glass + tilt on cards (off under reduced motion or coarse pointers).
- **Opt-in sound** — synthesized Web Audio only: an audible cinematic ambience pad
  (A-minor drone with a breathing filter sweep and soft sparkles) + interaction
  blips. Nothing plays until "Enable sound" is pressed; toggle in the header or
  hero. The site works fully without Web Audio.
- **Accessibility floor** — skip link, semantic landmarks, visible focus,
  `prefers-reduced-motion` (static scenes, instant reveals), keyboard-reachable
  controls, `aria-pressed` sound state.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Structure, narrative, contact title block, canvas hosts |
| `styles.css` | Design system (Command Center palette), motion, responsive, reduced-motion |
| `script.js` | Boot cinematic, audio engine, solid BIM scenes, reveals, counters, scrollspy |
| `assets/architech-mark.png` | Brand mark (copied from `ArchITECH (Design & Theme)`) |
| `assets/bg-*.jpg` | Per-section holographic architecture plates (hero, builder, twin, gates, toolkit, proof, contact) |
| `assets/architech-vision.jpeg` | Vision section architecture plate |
| `tests/portfolio-contract.ps1` | Local contract check (links, hooks, local-only rule) |
| `docs/` | Prior design spec + implementation plan (unchanged) |

## Command Center context used

- Verified visual tokens: midnight `#05060f`, electric blue `#2f9bff`, cyan
  `#52bcff`, ice/fog text ladder, hairline strokes, glass panels.
- Report-attributed facts from `CURRENT_STATE.compact.md`: 6,991 vault notes and
  66 pyRevit tools (r.61), 9,082 Qdrant vectors (r.61 live probe), 88 MCP tools /
  62 presets / Snowdon Towers QA 34,510 elements · 34 warnings (r.52), 3,017 C#
  sources (r.63), 9/9 builds (r.31), MRR@5 0.928 (r.28), 24 ms semantic recall
  (r.26), 48/48 voice tests (r.64), service ports :1997/:8801/:6335/:11434/:8802/:8803.
- The G0–G6 safety law and evidence-ledger discipline from the workspace contract.

## Intentionally NOT modified

`dashboard.html`, JARVIS services, `runner.py`, the event bus, registries,
schemas, configs, and every other Command Center file are untouched. The site is
isolated in this folder. The previous v1 site files are backed up at
`D:\ArchiTECH\.claude\memory\handoff-evidence\backup_2026-07-10_portfolio-v1\`.

## Assumptions made

- **LinkedIn URL**: `https://www.linkedin.com/in/architech-india/` (profile, not feed).
- The public dashboard link (`architech97.github.io/architech-command-center`)
  is included as portfolio proof; it is the only non-social external link.

## Customize next

- Copy lives entirely in `index.html`; palette/spacing tokens at the top of `styles.css`.
- 3D scene geometry (`buildDemoTower()` / `buildDemoBuilding()`), sound frequencies, and boot lines are marked
  sections at the top of `script.js`.
- Add real renders/screenshots under `assets/` and reference them locally.
- Refresh the metrics when new numbered reports land (search for `r.` in `index.html`).

## Verify

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\portfolio-contract.ps1
```

Expected output: `Portfolio contract passed.`

# HESA Studio — Residence in Vasant Kunj (Claude build)

Live: https://architechdesign.in/hesa-residence/

A scroll-driven presentation of HESA Studio's residence in Vasant Kunj.

- **Day → dusk hero** — scroll scrubs the matching day/night renders, a sun arc and clock.
- **From drawing to dwelling** (`scene.js`, three.js) — built on the studio's **actual Blender model**
  (`VK_Residence_Interior_R04.blend`). The page opens on the ground-floor drawing, registered to the
  model at 62.12 px/m. A section plane then rises through the real model: a plan cut at 1.4 m, the
  ground floor cut open below its ceilings, then the first and second floors, then the roof. Finally
  the four levels separate (each cut open again) and dusk falls with the model's own light fittings.
  Cut walls render as solid poché via back-face shading. Drag to orbit at the end.
- **Plan explorer**, **light study** (day/night wipe) and **exterior reel** use the presentation images.

## Model pipeline (`tools/`)

1. `export_web.py` (Blender 5.2, headless, read-only on the source): drops planting, context, services,
   cameras/lights and tiny fixings; bakes modifiers and curves; decimates heavy décor; splits every
   mesh at the slab undersides (3.80 / 7.15 / 10.50 m) into `L0`, `L1`, `L2`, `ROOF`; flattens
   textures to averaged colours; joins per level; writes `rooms.json` from the model's room metadata.
2. `optimize.mjs` (glTF-Transform + meshoptimizer): keeps the four level nodes, drops normals
   (the site shades flat), welds and simplifies — desktop ≈ 0.47 M tris, mobile ≈ 0.2 M tris.
3. `bake_colors.mjs`: bakes each material's colour into vertex colours and joins primitives into three
   shared materials (solid / glass / lamp) per level → ~10 draw calls, then meshopt-compresses.
   Result: `hesa-model.glb` 1.4 MB (desktop), `hesa-model-lite.glb` 0.7 MB (phones).

## Performance

- One render per changed scroll position; nothing renders when idle or off-screen.
- Every shader / shadow variant is compiled during load (warm-up sweep along the timeline).
- Phones get the lite model, PCF shadows refreshed every other frame, and adaptive resolution
  that only drops when the GPU (not the CPU) is the bottleneck.
- Page motion uses cached layout (no per-frame layout reads) and only updates on-screen sections.

Static HTML/CSS/JS, no build. three.js 0.160, GSAP 3.12 and Lenis 1.1 from jsDelivr.
Presentation photos are loaded from `../hesa-residence/assets/`.

# HESA Studio — Residence in Vasant Kunj (Claude build)

Live: https://architech97.github.io/architech-portfolio/hesa-residence-claude/

A scroll-driven presentation of HESA Studio's residence in Vasant Kunj.

- **Day → dusk hero** — scroll scrubs the matching day/night renders, a sun arc and clock.
- **From drawing to dwelling** (`scene.js`, three.js) — the ground-floor drawing is the 3D model seen through a very long lens. Scrolling raises the traced walls, opens the lens (dolly zoom), sweeps material across the floor from the stair/lift core, lands the first and second floors on the shared core (with the double-height void cut into the first-floor slab) and explodes the stack. Drag to orbit at the end.
- **Plan explorer** — numbered pins on the rendered key plans, synced with a room list with dimensions read from the drawings; the card flips to the technical drawing.
- **Light study** — draggable day/night wipe. **Exterior reel** — pinned horizontal gallery with lightbox.

Static HTML/CSS/JS, no build. three.js 0.160, GSAP 3.12 and Lenis 1.1 from jsDelivr.
Images are loaded from `../hesa-residence/assets/`. `plan-data.json` holds wall rectangles traced
from the drawings (px), registered across floors by the stair-enclosure width; heights are indicative.

Run locally from the repo root: `python3 -m http.server 8000` → http://localhost:8000/hesa-residence-claude/

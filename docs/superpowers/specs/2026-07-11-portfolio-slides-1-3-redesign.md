# ArchiTECH Portfolio Slides 1 and 3 Redesign

## Intent

Redesign S.00 Signal and S.02 Digital Twin as an architectural command system: cinematic enough for a portfolio, but grounded in a credible BIM model rather than a sci-fi wireframe.

## Approved direction

Use a dark, sharp, infrastructure-led composition with an architectural figure-caption system. Preserve the ArchiTECH midnight canvas and cyan signal color, but remove glass-card and hologram conventions from the two model scenes.

## Non-negotiable user requirements

- Do not display or reference any famous building name in the live portfolio source or copy.
- Both scenes use generic demo-building geometry.
- Replace the wiregraph holographic building treatment with solid, shaded BIM-style massing.
- Keep the site local, dependency-free, responsive, keyboard-accessible, and reduced-motion safe.
- Preserve the existing slide IDs, canvas IDs, navigation anchors, counters, and drag-to-orbit interaction.

## S.00 Signal

- Preserve the core statement, “The building is data. Command it.”
- Make one solid generic demo tower the dominant visual, rendered as layered glass, structure, slabs, and a warm service core.
- Use one primary action instead of two competing calls to action.
- Consolidate the metrics into a sharp architectural title-block strip.
- Replace the named form-study status with `DEMO MODEL · LIVE ASSEMBLY`.
- Increase secondary slide labels so they remain readable when projected.

## S.02 Digital Twin

- Replace the glass panel with a flat editorial information rail.
- Use the headline `From massing to model intelligence.`
- Describe a generic demo building assembling through structure, floors, envelope, systems, and verification.
- Render a solid mid-rise BIM massing model with visibly different materials for structure, floor plates, glazing, and core.
- Keep drag-to-orbit, but remove the wireframe, star-field, energy-ring, and ghost-building visual language.
- Use one shared stage index for the narrative status and telemetry so labels cannot contradict each other.
- In reduced-motion mode, render the complete verified building instead of an early construction state.

## Visual lock

- Canvas: near-black graphite, not blue gradient fog.
- Primary text: ice white.
- Accent: existing ArchiTECH cyan only for active/verified state.
- Secondary material accent: restrained amber for the model core and scan/progress state.
- Geometry: opaque or semi-opaque filled faces with restrained edge lines; no line-only building.
- Surfaces: sharp 0–4px radii; no new blur-heavy glass cards.
- Media: browser-native Canvas 2D only; no remote image, CDN, or generated landmark asset.

## Acceptance criteria

- `Burj Khalifa` and `Fallingwater` are absent from `index.html`, `styles.css`, `script.js`, and `README.md`.
- Both canvases visibly render filled building faces at desktop and mobile widths.
- S.02 status copy and HUD layer use the same stage value.
- Reduced motion shows a fully assembled generic model.
- The portfolio contract, JavaScript syntax check, desktop screenshot QA, and mobile overflow QA pass with zero console errors.


# ArchiTECH Portfolio Experience — Design

## Intent

Create a local, self-contained portfolio experience that presents ArchiTECH as a premium architectural-technology ecosystem rather than a conventional agency website. The story moves from a cinematic digital-twin introduction to the Command Center, BIM automation, Revit MCP, local agents, governance, and a direct contact surface.

## Chosen direction

Use a dependency-free static site with HTML, CSS, and browser-native JavaScript. This is the right trade-off because it remains portable, opens locally without a build step, does not disturb the live Command Center, and can still deliver an original high-motion interface through Canvas and the Web Audio API.

## Experience structure

1. **Signal / hero** — a responsive animated Canvas building-data hologram, concise positioning, navigation, and sound opt-in.
2. **Ecosystem proof** — a factual Command Center snapshot and an animated operational flow from BIM model to governed action.
3. **Holographic twin** — a full-width interactive Canvas scene that responds to pointer position and renders a dimensional blueprint tower.
4. **Capability cards** — Revit automation, MCP connectivity, local agents, and delivery intelligence, all tied to the Command Center's real domains.
5. **Contact deck** — personal social links and email supplied by the owner, displayed as an intentional interface rather than generic footer text.

## Visual system

The site borrows the Command Center's verified midnight, electric-blue, cyan, ice-text, and glass-panel palette, but uses a distinct editorial composition. Typography uses a local system stack, avoiding remote requests. Architectural grid lines, depth layers, scan passes, data labels, and canvas geometry create the visual language without stock imagery or copied third-party design.

## Interaction and resilience

- Canvas animation stops or renders a quiet static frame when reduced motion is preferred or the tab is hidden.
- Sound is entirely browser-generated and remains disabled until the visitor explicitly enables it. The site works if Web Audio is unavailable.
- Navigation, skip link, visible focus states, semantic headings, touch-sized controls, and responsive breakpoints keep the experience usable beyond the visual layer.
- There are no network, API, account, build, or paid-service dependencies. Social links are the only external navigation.

## Contact data

- LinkedIn: `https://www.linkedin.com/in/architech-india/`
- GitHub: `https://github.com/architech97`
- Email: `Ar.navneet97@gmail.com`
- Instagram: `https://www.instagram.com/ar.navneet.97/`

## Boundaries

The site lives in its own `ArchiTECH Portfolio` folder. Existing Command Center dashboards, agent services, configuration, APIs, and JARVIS surfaces remain untouched.

# HESA Studio — Residence in Vasant Kunj

Static, mobile-responsive architectural experience based exclusively on the supplied HESA Studio PDF. Serve this directory with a static web server; no build, package installation, backend, or API key is needed.

## Experience
- Full-bleed architectural hero and oversized studio typography.
- Scroll-controlled daylight-to-nighttime render story, using two original viewpoints (not a registered before/after comparison).
- Interactive separated-plan perspective study with rotate and collapse controls. These are original flat-plan image layers, not a 3D building model or a measured section.
- Three original floor plans with furnished and technical drawing modes.
- User-started cinematic sequence of four original renderings, with pause, scene selection, previous/next, Escape to close, and focus restoration. Not a 3D walkthrough.
- Day/night rendering selection, fullscreen image gallery, and original PDF archive.
- Source-backed HESA Studio services and contact details.
- System reduced-motion support plus a visible motion toggle; native scrolling, keyboard controls, and responsive layouts.

All project renderings and drawings are unchanged source imagery from the supplied presentation. Images are architectural visualizations, not photographs of completed construction. Design imagery © HESA Studio.

Design direction: monumental image-led type and sharp geometry informed by Exo Ape; layered gallery presentation and restrained controls informed by Liron Moran Interiors. No external site code or imagery copied. Google Fonts provides DM Sans with system fallback.

## Source-traced schematic 3D wall study

Native WebGL viewer in spatial.js; geometry in assets/wall-study.json. Wall footprints were manually traced from the unchanged technical raster plans (assets 026, 027, 028), including visible plan gaps and the ground-floor curved mandir wall. 107 rectangular footprints and one curved polygon are extruded. Floors use stair-enclosure width for relative scale and lift-center registration. This is illustrative registration, not verified CAD. Wall heights and level separation are illustrative and adjustable. Drawing reference sheets are not architectural slabs; source glazing, doors, stairs, terrace levels and parapets are not reconstructed. The original furnished plans, numbered keys, technical drawings and PDF remain primary references.

Controls include orbit by drag/keyboard, zoom, top/reset view, assemble/explode, per-floor isolation, drawing-sheet visibility and opt-in auto orbit. Rendering sleeps when out of view; reduced motion disables auto orbit and interpolated separation. All default image presentations preserve the complete image using contain or natural aspect ratios.

Refero research for the viewer: Eduardo del Fraile object-first dark gallery; Lusion technical spacing; Luma/Weavy model-viewer controls. No external imagery or application code copied.

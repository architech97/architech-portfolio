# Focused three-project revision

This revision follows the owner's request to feature only ArchiTECH-I3D,
ArchiTECH-MCP and ArchiTECH-Assistant, and to explain their strengths and working.
It supersedes the earlier same-day presentation that retained the legacy toolkit
and historical metrics.

## Content decisions

- Current I3D documentation identifies a standalone Windows desktop interface
  with a thin Revit connector. The page uses that direction instead of the
  retired docked interface. Local/cloud/import routes, known scale, geometry and
  appearance review, and approved family export are explained at product level.
- MCP is one project story covering the host-specific Revit, Rhino, SketchUp,
  AutoCAD and Blender connectors. The copy explains context, discovery, guarded
  native operations and independent outcome readback. Recovery is host-specific;
  the page makes no blanket rollback guarantee.
- Assistant owns the Ask/Search/Build experience and model choice. The separate
  MCP connector owns native model execution. The copy distinguishes those roles.
- Selected native checks are presented as documented pilot evidence, with
  bounded host/operation coverage. A website check does not establish that every
  product operation or recipient installation has passed acceptance.

The owner authorised consulting private documentation for these public high-level
summaries. No private source, imagery, repository links, downloads, internal
addresses, client material or credentials were copied into the site. Existing
public demo URLs remain, clearly labelled as earlier recordings.

## Design and behavior

The existing midnight canvas, architectural art, upright display type, blue
metadata and fine borders remain. Three alternating product stories provide
room for strengths and a four-step workflow. They stack into one column on
phones and tablets. Images remain lazy-loaded and explicitly labelled concept
art. No new framework or external runtime dependency was introduced.

The navigation now has I3D, MCP, Assistant, About and Contact. Legacy sections and
their links were removed. Keyboard focus, closed-menu inert state, Escape return,
touch sizes, reduced motion and natural scrolling are retained. The unused model
scene engine was removed from the active script.

## Validation

Run the commands in the current README. Inspect desktop and mobile screenshots,
then verify the exact deployed HTML, script and stylesheet against local source.
The existing GitHub Pages `main` pipeline remains the deployment mechanism.

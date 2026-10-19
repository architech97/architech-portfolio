# ArchiTECH portfolio

Navneet Singh's portfolio for **ArchiTECH-I3D**, **ArchiTECH-MCP** and
**ArchiTECH-Assistant**.

Live site: https://architech97.github.io/architech-portfolio/

## Current presentation

- I3D: a standalone desktop workflow from photo or mesh to a reviewed asset and
  Revit family, using a thin Revit connector for approved export and placement.
- MCP: host-specific tools for Revit, Rhino, SketchUp, AutoCAD and Blender,
  with controlled native execution and outcome readback.
- Assistant: Ask, Search and Build using a selected local or server model;
  model operations use the separate MCP connector.

Each project includes its purpose, strengths, workflow and verification boundary.
The linked public recordings show earlier experiments. Card images are existing
ArchiTECH concept art, not current product screenshots. About and contact remain;
the older toolkit, metrics, model demo, proof and vision sections are no longer
part of the public page.

The product summaries reflect reviewed current documentation and selected
implementation evidence. Website validation does not independently rerun the
desktop products' native acceptance tests. No private repository/download links,
source excerpts, private assets, endpoints or credentials are published here.

## Implementation

This is a static HTML/CSS/classic-JavaScript site. There is no package installation
or compilation step. GitHub Pages builds and deploys the existing `main` branch.

| File | Purpose |
| --- | --- |
| `index.html` | Hero, three product stories, About and contact |
| `styles.css` | Existing base styles and responsive navigation |
| `refresh.css` | Current architectural composition and product-story layout |
| `script.js` | Keyboard navigation, reveals, active links, optional tilt and opt-in sound |
| `assets/` | Existing public ArchiTECH brand/concept imagery |
| `tests/` | Static content, anchor and browser layout checks |

The removed canvas-demo engine is no longer loaded or executed. Earlier source
and design documents remain in Git history for traceability.

## Verify

```powershell
node --check script.js
node tests/portfolio-contract.mjs
node tests/mobile-layout-contract.mjs
```

The browser check uses installed Microsoft Edge. It checks 320/360/390/430px
phones, 768px tablet and 1366px desktop; five navigation links; keyboard menu
behavior; touch targets; all three product names; strengths/workflows; local
anchors; images; reduced motion; and console errors.

Set `ARTIFACT_DIR` to save screenshots. Set `PAGE_URL` to the live URL to repeat
the checks against GitHub Pages after deployment. The PowerShell contract entry
point delegates to the same Node static check.

See [the focused revision notes](docs/2026-10-19-focused-projects.md).

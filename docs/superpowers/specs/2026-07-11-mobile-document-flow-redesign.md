# ArchiTECH Portfolio — Mobile Document Flow Redesign

Date: 2026-07-11  
Status: Approved direction; specification pending user review

## Objective

Repair the phone experience without changing the desktop visual design. At 360–430 px widths, every section must read as one continuous technical drawing set: no content hidden by adjacent backgrounds, no oversized empty bands, no section collisions, and no scroll jank.

## Verified root causes

1. Desktop background overscan remains active on phones. `.sec::before` and `.vision::before` use `inset: -3%` plus `scale(1.04)`. Because later slides paint above earlier slides, the following background covers the previous slide's final content. This is why only the top edge of the Vision CTA remains visible.
2. `#gates { height: 100svh; }` has higher specificity than the responsive `.slide { height: auto; }` rule, so the mobile pipeline grows outside its section.
3. Every slide retains desktop viewport framing: `min-height: 100svh`, centered flex alignment, and roughly 85 px top padding. In a continuous phone document, those rules create artificial blank bands.
4. The one-column title block makes the contact slide unnecessarily long and visually unlike the desktop drawing grid.
5. The mobile navigation drawer is fixed inside a filtered fixed header, collapsing its usable height. Scroll locking is applied to `body` while `html` owns page scrolling.
6. Perpetual background-position animations, marquee blur, reveal blur, and uncapped Canvas work cause measurable mobile jank.

## Reference lock

Primary build target: the current desktop portfolio.

Preserve:

- near-black cinematic canvas;
- electric-blue/cyan accent roles;
- light display typography plus monospaced drawing metadata;
- sharp technical cells, hairline borders, and zero-to-small radii;
- existing architectural imagery and solid demo-model canvases;
- current section order and content hierarchy.

Borrow only:

- Verse-style single-column technical document flow for phone reading;
- Warp-style compact surface hierarchy and restrained mobile spacing.

Reject:

- rounded generic mobile cards;
- a new palette, font system, or content architecture;
- accordions or hidden portfolio content;
- `content-visibility` placeholders that may create new blank bands;
- desktop selector changes outside explicit mobile media queries, except visually equivalent performance and audio internals.

## Mobile layout contract

### Global flow

- At `max-width: 920px`, disable scroll snapping, contain section backgrounds, and use the mobile navigation/performance profile.
- At `max-width: 640px`, switch the slide composition to the phone document flow.
- Keep S.00 Hero and S.02 Model at `min-height: 100svh`.
- Set S.01 and S.03–S.07 to natural content height, `justify-content: flex-start`, and 32 px block padding.
- Preserve full-width backgrounds, but contain pseudo-elements to each section with `inset: 0`, `transform: none`, and no mobile background animation at widths up to 920 px.
- Give anchor targets a fixed-header-safe scroll margin.
- Use the existing content width with 20 px phone gutters; never permit document-level horizontal overflow.

### S.00 Hero

- Keep the immersive one-screen model composition.
- Reframe the mobile Canvas lower/right and slightly smaller so the model supports rather than obscures the headline and CTA.
- Keep the current headline, CTA, and three-value HUD visible within the first viewport.

### S.01 Builder

- Retain the evidence hierarchy and existing stat cards.
- Keep primary metrics stacked and secondary metrics in two columns.
- Convert the two tool marquees into static, horizontally scrollable rows on phones; show one copy of each tool name and remove moving backdrop blur.

### S.02 Model Intelligence

- Keep the one-screen interactive model.
- Compact the copy rail and stage spacing at narrow widths.
- Render the HUD as a stable 2×2 grid and guarantee separation from the information rail.
- Preserve vertical page panning while allowing horizontal model inspection.

### S.03 Gates

- Override the fixed height with natural height.
- Fit G0–G6 into one seven-column touch row.
- Keep every stage and rollback note inside the section background.

### S.04–S.06 Toolkit, Proof, and Vision

- Keep the existing vertical card order and typography.
- Remove cross-section background overscan.
- Keep the film at a stable phone aspect ratio.
- Ensure the final Vision CTA is fully visible, clickable, and separated from the S.07 label by 72 px or less.

### S.07 Title Block

- Use a two-column drawing-grid layout.
- Project, Email, Instagram, and Status span both columns.
- Pair Drawn By/Checked By, Date/Scale, and LinkedIn/GitHub.
- Reduce cell padding without reducing text below readable sizes.
- Remove trailing footer margins so the final copyright line ends within 32 px of the document boundary.

### Navigation and touch

- Position the drawer beneath the header with explicit `height: calc(100dvh - var(--topbar-h))`.
- Lock both `html` and `body` while the drawer is open.
- Keep all links visible and vertically scrollable.
- Use a minimum 44×44 px target for menu, sound, gate, command-chip, and CTA controls.
- Use `touch-action: pan-y` on the model section and `overscroll-behavior: contain` on the drawer.

## Mobile performance and audio

- Disable paint-bound section background animations on phones while keeping the same static images and grades.
- Hide the fixed grain/cinema overlay on phones and replace large backdrop-filter areas with more opaque existing surfaces.
- Remove mobile reveal `filter: blur`; retain opacity/translation only.
- Remove permanent mobile `will-change` declarations.
- Cap visible model Canvas rendering at 30 FPS and use a maximum mobile backing-store DPR of 1.25. Existing IntersectionObserver visibility pausing remains.
- Update Twin status DOM only when its value changes.
- Update film progress with a compositor transform rather than layout-triggering width changes.
- Keep sound opt-in and local-only. Deduplicate bubbled click tones, disable hover sound on coarse pointers, lower the final effects level, and suspend/resume audio with page visibility.
- Add no dependencies, remote services, audio downloads, or new media assets.

## Regression tests

Before production changes, add a dependency-free Edge/Chrome CDP mobile layout contract and verify that it fails against the current source.

At 360×800, 390×844, and 430×932, assert:

- document `scrollWidth` equals viewport width;
- mobile navigation has usable viewport height and all links are visible;
- opening navigation locks the actual scrolling element;
- S.03 content stays inside its section;
- S.02 rail and HUD do not overlap;
- the Vision CTA is the topmost element at its center point;
- the Vision CTA-to-S.07 label gap is at most 72 px;
- the title block computes to two columns with the specified full-width cells;
- the final footer content is within 32 px of the document end;
- mobile section background pseudo-elements have no overscan transform or animation;
- mobile touch controls meet the 44 px minimum;
- no console errors occur.

Desktop regression checks at 1366×768 and 1920×1080 must confirm:

- mandatory slide snapping remains;
- desktop navigation remains inline and the menu toggle remains hidden;
- Hero, Model, Gates, and Title Block retain their existing column structures;
- the solid model canvases, typography, colors, and background compositions remain visually unchanged;
- no existing contract test regresses.

## Visual QA

Capture every slide at 390×844 and key states at 430×932. Compare S.00, S.02, S.06/S.07 boundary, S.07 ending, and the open drawer against the approved reference lock. Any cropped content, overlap, horizontal overflow, blank boundary over 72 px, or unresolved P0/P1/P2 visual issue blocks completion.

## Non-goals

- No desktop redesign.
- No section removal or content hiding.
- No framework migration, package manager, CSS framework, or external dependency.
- No GitHub push or production deployment without a separate explicit request.

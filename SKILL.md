---
name: sky-html-spec-overlay
description: Generate annotated HTML handoff pages for existing HTML mockups or local pages by copying them into a new output directory and injecting an overlay that marks typography, spacing, colors, radii, divider specs, and optional user-specified values for specific controls, text blocks, or regions.
---

# HTML Spec Overlay

Use this skill when the user wants a developer handoff version of an HTML page, not a static annotated image.

This skill creates a new output directory that keeps the original page shape but injects overlay assets so the annotated result is still HTML. It supports:

- annotating a specific single control, text block, or region by selector
- annotating actual rendered values from the current page
- annotating user-specified override values instead of current rendered values

## Non-Mutation Rule

The annotated output must not change the original HTML page's layout, content, or underlying visual structure.

Allowed changes:

- injecting overlay assets
- rendering fixed or absolute overlay layers above the page
- adding a floating annotation panel

Not allowed:

- rewriting page copy
- changing element dimensions
- changing spacing
- changing original CSS values
- inserting annotation text into the page flow

The overlay is informational only.

## Best Fit

Use this skill for:

- AI-generated HTML mockups that need developer specs
- local HTML pages that need visual measurements on top of the page
- handoff pages where developers need font, spacing, color, radius, divider, and size annotations

Do not use this skill for:

- screenshot-only deliverables
- image-only mockups with no HTML
- pixel-perfect Figma export replacement

## Outputs

The skill should produce a new directory that contains:

- copied HTML source files
- `__html_spec_overlay__/annotation.css`
- `__html_spec_overlay__/annotation.js`
- `__html_spec_overlay__/annotation-data.js`
- `__html_spec_overlay__/manifest.json`

The page remains HTML and shows annotation overlays in-browser.

## Workflow

1. Identify the source input:
   - a single HTML file
   - a directory that contains one or more HTML files
2. Decide which page or pages should be annotated.
3. Create or update an annotation config JSON.
4. If needed, run `scripts/init_annotation_config.py` to generate a starting config from common elements in the HTML.
5. If the user wants to revise one existing annotation precisely, use `scripts/update_annotation_by_id.py` with the annotation `id`.
6. Run `scripts/build_annotated_html.py` to copy the source and inject overlay assets.
7. Open the generated HTML and adjust selectors, comparisons, overrides, or annotation UI styling if needed.
8. If selector targeting is inconvenient, use the built-in Pick element mode in the overlay panel to click a control, text block, or region and generate a new annotation item.
9. If the user wants spacing between two controls or regions, use Pick spacing mode and click the first target, then the second target to generate a `compareTo` gap annotation.

## Annotation Modes

Each annotation item must use one of two modes:

- `actual`
  - read and display values from the currently rendered HTML
- `override`
  - display the values provided by the user, even if they differ from the current page

In `override` mode, use the `overrides` object.

## Annotation UI Styling

The overlay UI itself can be configured by the user.

Supported UI style settings include:

- box color
- box fill color
- label text color
- label background color
- label font size
- label max width
- spacing line color
- spacing line thickness
- spacing tag font size

If the user does not specify annotation UI styles, use the defaults defined in `assets/annotation.css`.

These settings control only the annotation layer and must not affect the original page layout or page styles.

## Annotation Targets

Each annotation item should point at one specific target via selector.
Each annotation item should also carry an `id` such as `A-001` so later edits can target one annotation directly.

Typical target types:

- `control` for buttons, inputs, selects, tabs, cards
- `text` for headings, labels, paragraphs, helper text
- `region` for grouped areas such as header, hero, form section, card body
- `divider` for separators and rule lines

Use one item per target. If the user wants three buttons annotated, create three entries.

## Default Metrics

Supported metrics include:

- `font-size`
- `line-height`
- `font-weight`
- `color`
- `background-color`
- `border-radius`
- `padding`
- `margin`
- `size`
- `divider`

Spacing between controls is modeled separately through `compareTo`.

## Spacing Rules

Use `compareTo` when the user wants the spacing between elements labeled.

Each comparison should include:

- `selector`
- `axis`: `vertical` or `horizontal`
- optional `label`

Spacing is measured edge-to-edge:

- vertical: next top minus current bottom
- horizontal: next left minus current right

## Config Schema

Use the config shape documented in `references/annotation-config.md`.

Read that file when:

- the user wants a single control annotated
- the user wants a region annotated
- the user wants actual vs override behavior
- the user wants spacing between two controls
- the user wants custom annotation UI styles

## Scripts

### `scripts/build_annotated_html.py`

Copies a source file or directory into a new output folder and injects:

- `annotation.css`
- `annotation.js`
- `annotation-data.js`
- `manifest.json`

Example:

```bash
python3 scripts/build_annotated_html.py ./mockup ./mockup-annotated --config ./annotation-config.json
```

If the source is a directory and `--html` is omitted, the script injects the overlay into every `.html` file in that directory tree.

### `scripts/init_annotation_config.py`

Scans an HTML file and creates an initial config JSON using common element types such as headings, buttons, inputs, textareas, selects, dividers, and card-like regions.

Generated items include annotation ids such as `A-001`, `A-002`, and so on.

### `scripts/update_annotation_by_id.py`

Lists, inspects, updates, or deletes a single annotation item by id.

Examples:

```bash
python3 scripts/update_annotation_by_id.py list ./annotation-config.json
python3 scripts/update_annotation_by_id.py show ./annotation-config.json --id A-015
python3 scripts/update_annotation_by_id.py update ./annotation-config.json --id A-015 --label "主按钮圆角" --metrics border-radius
python3 scripts/update_annotation_by_id.py delete ./annotation-config.json --id A-012
```

## Assets

### `assets/annotation.js`

Runs in the browser and renders the annotation layer on top of the page.

It also provides:

- Pick element mode
- Pick spacing mode for two-click gap annotations
- hover highlighting for candidate elements
- selection panels that let the user choose which properties to annotate for the selected control or region
- copy current item JSON
- copy full config JSON
- stronger selector generation that prefers unique ids, stable attributes, stable class combinations, and short ancestor paths over brittle single-class guesses

### `assets/annotation.css`

Styles the overlay boxes, labels, spacing lines, and control panel.

### `assets/annotation-config.sample.json`

Sample config for actual-mode and override-mode annotations.

## References

- `references/annotation-config.md`
  - schema and examples
- `references/measurement-rules.md`
  - how values and spacing should be interpreted
- `references/overlay-ui.md`
  - annotation layer styling options

## Operating Guidance

- Keep the original source visually intact; the overlay should sit above it.
- Never push annotation text into normal document flow.
- Prefer selector-based targeting instead of brittle coordinate-based targeting.
- Prefer adding a stable annotation `id` like `A-001`, `A-002`, and so on. This makes later revisions easy because the user can say "update A-012".
- If a selector matches multiple nodes, narrow it before shipping the handoff output.
- When the user specifies values, store them in `overrides` and set `mode` to `override`.
- When the user wants the current rendered values, set `mode` to `actual`.
- For handoff clarity, annotate only the requested controls, text blocks, or regions by default. Do not annotate the entire page unless requested.
- Pick mode is intended to reduce manual selector writing. Use it when the user can identify the target visually but does not want to inspect DOM structure by hand.
- Pick spacing mode is intended for fast handoff labeling between two elements without manually assembling `compareTo`.

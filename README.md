# sky-html-spec-overlay

`sky-html-spec-overlay` is a Codex skill for turning existing HTML pages into interactive spec and handoff pages.

Instead of exporting a static annotated image, it copies the source HTML into a new output directory and injects an overlay layer. The output stays as HTML, so you can keep clicking elements, checking spacing, and revising annotations in-browser.

## What It Does

- annotates existing HTML without changing the original page layout or content
- supports controls, text, regions, dividers, and spacing between elements
- lets users click directly on the page to inspect and annotate targets
- supports stable annotation ids so a specific element can be referenced later
- supports both actual rendered values and user-provided override values

## Current Interaction Model

The generated overlay is designed for interactive handoff review:

- page opens in selectable mode by default
- no annotation card is shown until a user clicks a target
- clicking text can return text-level properties
- clicking container areas can return container-level properties
- thin dividers and border-based separators can be selected
- spacing mode lets the user click two targets to measure the gap
- clicking outside the current annotation hides the current annotation card

## Repository Structure

```text
.
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   ├── annotation-config.sample.json
│   ├── annotation.css
│   └── annotation.js
├── references/
│   ├── annotation-config.md
│   ├── measurement-rules.md
│   └── overlay-ui.md
└── scripts/
    ├── build_annotated_html.py
    ├── init_annotation_config.py
    └── update_annotation_by_id.py
```

## Key Files

- [SKILL.md](./SKILL.md): skill instructions and workflow
- [assets/annotation.js](./assets/annotation.js): browser overlay logic
- [assets/annotation.css](./assets/annotation.css): overlay visuals
- [scripts/build_annotated_html.py](./scripts/build_annotated_html.py): copies source HTML and injects overlay assets
- [scripts/init_annotation_config.py](./scripts/init_annotation_config.py): creates a starter config
- [scripts/update_annotation_by_id.py](./scripts/update_annotation_by_id.py): updates one annotation by id

## Quick Start

### 1. Build an annotated page

```bash
python3 scripts/build_annotated_html.py ./source-page ./output-page --config ./annotation-config.json
```

If the source is a directory, the script can inject the overlay into every HTML file in that directory tree.

### 2. Generate an initial config

```bash
python3 scripts/init_annotation_config.py ./source-page/index.html ./annotation-config.json
```

### 3. Update a specific annotation by id

```bash
python3 scripts/update_annotation_by_id.py show ./annotation-config.json --id A-015
python3 scripts/update_annotation_by_id.py update ./annotation-config.json --id A-015 --label "Primary button radius" --metrics border-radius
```

## Output Shape

The generated output folder contains the copied HTML plus overlay assets:

- `__html_spec_overlay__/annotation.css`
- `__html_spec_overlay__/annotation.js`
- `__html_spec_overlay__/annotation-data.js`
- `__html_spec_overlay__/manifest.json`

The original visual page remains intact. Annotation UI is rendered as an overlay only.

## Non-Mutation Rule

This skill should not change the source page's actual content or layout.

Allowed:

- inject overlay assets
- render annotation boxes, lines, and cards
- add floating control UI for picking and spacing inspection

Not allowed:

- rewrite product copy
- change original spacing or dimensions
- change original CSS tokens
- insert annotation text into the page flow

## Typical Use Cases

- AI-generated HTML mockups that need developer handoff markup
-备案/提审 HTML 页面，需要保留真实页面形态同时补充规格说明
- product review pages where designers and developers need to inspect exact values
- spec review for buttons, typography, cards, tables, and divider spacing

## Notes

- This repository contains the skill source itself, not a packaged NPM library.
- The skill is intended to be used inside Codex skill workflows.
- The overlay favors real rendered values, but supports manual override values when needed.


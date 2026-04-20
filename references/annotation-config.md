# Annotation Config

Use this file when you need to build or edit the annotation config JSON.

## Schema

```json
{
  "version": 1,
  "pageLabel": "Login Handoff",
  "ui": {
    "boxColor": "#0F766E",
    "labelFontSize": "12px",
    "lineColor": "#C2410C",
    "lineThickness": 2
  },
  "annotations": [
    {
      "id": "A-001",
      "selector": ".login-button",
      "label": "Primary Button",
      "kind": "control",
      "mode": "actual",
      "metrics": [
        "size",
        "font-size",
        "line-height",
        "font-weight",
        "color",
        "background-color",
        "border-radius"
      ],
      "compareTo": [
        {
          "selector": ".password-input",
          "axis": "vertical",
          "label": "Gap"
        }
      ]
    }
  ]
}
```

## Required Fields

- `version`
- `annotations`

Each annotation item requires:

- `selector`
- `mode`

## Recommended Fields

- `id`
- `label`
- `kind`
- `metrics`
- `ui`

## Modes

### `actual`

Display the values currently rendered by the page.

Example:

```json
{
  "id": "A-002",
  "selector": ".login-title",
  "label": "Login Title",
  "kind": "text",
  "mode": "actual",
  "metrics": ["font-size", "line-height", "font-weight", "color"]
}
```

### `override`

Display user-specified values instead of the current rendered values.

Example:

```json
{
  "id": "A-003",
  "selector": ".login-button",
  "label": "Primary Button",
  "kind": "control",
  "mode": "override",
  "metrics": ["size", "font-size", "color", "border-radius"],
  "overrides": {
    "size": "160 x 44",
    "font-size": "16px",
    "color": "#FFFFFF",
    "border-radius": "8px"
  }
}
```

## Targeting Specific Controls, Text, or Regions

Use one config item per requested target.

Examples:

### Single control

```json
{
  "id": "A-004",
  "selector": ".submit-btn",
  "label": "Submit Button",
  "kind": "control",
  "mode": "actual"
}
```

### Single text block

```json
{
  "id": "A-005",
  "selector": ".hero-title",
  "label": "Hero Title",
  "kind": "text",
  "mode": "actual",
  "metrics": ["font-size", "line-height", "font-weight", "color"]
}
```

### Single region

```json
{
  "id": "A-006",
  "selector": ".pricing-card",
  "label": "Pricing Card",
  "kind": "region",
  "mode": "actual",
  "metrics": ["size", "padding", "border-radius", "background-color"]
}
```

## Spacing Between Controls

Use `compareTo` for spacing annotations.

```json
{
  "id": "A-007",
  "selector": ".email-input",
  "label": "Email Input",
  "kind": "control",
  "mode": "actual",
  "compareTo": [
    {
      "selector": ".password-input",
      "axis": "vertical",
      "label": "Input Gap"
    }
  ]
}
```

## Supported Metrics

- `size`
- `font-size`
- `line-height`
- `font-weight`
- `color`
- `background-color`
- `border-radius`
- `padding`
- `margin`
- `divider`

## Notes

- If `metrics` is omitted, the overlay chooses defaults based on `kind`.
- `id` is strongly recommended so a later skill step can target one annotation directly, for example `A-007`.
- `overrides` is only meaningful in `override` mode.
- If a selector matches nothing, the overlay panel will report it as unresolved.
- `ui` styles affect only the annotation layer and must not change the original page.

## Editing By Id

Use `scripts/update_annotation_by_id.py` when the user wants to revise one existing annotation by id instead of rewriting the whole config.

Examples:

```bash
python3 scripts/update_annotation_by_id.py list ./annotation-config.json
python3 scripts/update_annotation_by_id.py show ./annotation-config.json --id A-015
python3 scripts/update_annotation_by_id.py update ./annotation-config.json --id A-015 --label "主按钮圆角" --metrics border-radius
python3 scripts/update_annotation_by_id.py delete ./annotation-config.json --id A-012
```

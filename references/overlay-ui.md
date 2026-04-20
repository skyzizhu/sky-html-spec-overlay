# Overlay UI Styling

These settings control the annotation layer only.

They must not alter the original page layout or actual component styles.

## Config Shape

```json
{
  "ui": {
    "boxColor": "#0F766E",
    "boxFill": "rgba(15, 118, 110, 0.08)",
    "labelTextColor": "#17212B",
    "labelBackground": "rgba(255, 255, 255, 0.96)",
    "labelFontSize": "12px",
    "labelMaxWidth": "340px",
    "lineColor": "#C2410C",
    "lineThickness": 2,
    "spacingTagFontSize": "11px"
  }
}
```

## Field Meanings

- `boxColor`
  - outline color for element highlight boxes
- `boxFill`
  - translucent fill for highlight boxes
- `labelTextColor`
  - annotation label text color
- `labelBackground`
  - annotation label panel background
- `labelFontSize`
  - label font size
- `labelMaxWidth`
  - max width of annotation labels
- `lineColor`
  - spacing line and spacing tag color
- `lineThickness`
  - spacing line thickness in pixels
- `spacingTagFontSize`
  - spacing tag text size

## Default Behavior

If `ui` is omitted, the overlay uses the built-in defaults from `annotation.css`.

## Recommendation

When the user specifies visual preferences for annotations, record them in `ui`.

When the user does not specify them, leave `ui` out and use defaults.

# Measurement Rules

These rules keep annotation output consistent.

## Actual Value Source

Use browser-computed values from `getComputedStyle()` and `getBoundingClientRect()`.

## Size

`size` should be shown as:

```text
WIDTH x HEIGHT
```

Round to whole pixels unless the page clearly depends on sub-pixel values.

## Colors

Normalize RGB colors to hex where possible.

Examples:

- `rgb(23, 33, 43)` -> `#17212B`
- `rgba(15, 118, 110, 0.5)` -> keep rgba if alpha is not 1

## Border Radius

If all corners are equal, show one value:

```text
8px
```

If corners differ, show all four in CSS order:

```text
8px 8px 0px 0px
```

## Divider

Treat a target as a divider when it is meant to represent a separator and the requested metric is `divider`.

Display:

- thickness
- orientation
- size
- color

## Spacing

Spacing is edge-to-edge:

- vertical gap = target.top - source.bottom
- horizontal gap = target.left - source.right

Only compare logically related elements requested by the user.

## Override Mode

In override mode:

- render the label values from `overrides`
- still use actual element geometry for overlay placement
- do not replace the underlying page styles

The overlay is an annotation layer, not a page mutation layer.

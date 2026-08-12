# Theming

Geometry and theme are separate contracts.

- Structural tokens: `--tl-space-*`, `--tl-radius-*`, `--tl-hit-target`, `--tl-axis-width`, `--tl-marker-size`, and `--tl-motion-fast`.
- Theme tokens: `--tl-color-page`, `--tl-color-surface`, `--tl-color-ink`, `--tl-color-muted`, `--tl-color-border`, `--tl-color-axis`, `--tl-color-accent`, and related `--tl-color-*` values.

Override color tokens without changing marker centers, lane spacing, hit targets, or collision behavior. The catalog includes explicit light and dark themes and honors reduced-motion preferences.

For one renderer, prefer its scoped appearance options over global token changes:

```js
renderEventRug(element, {
  data,
  axisColor: "#70797b",
  axisWidth: 1.5,
  rugColor: "#8f3550",
  rugWidth: 2,
  rugLength: 18
});
```

Horizontal datetime axes also accept `labelAngle` from `-90` through `0`
degrees. Every tick on an axis is drawn at the same angle with the same
`text-anchor`; the axis reserves a left inset so the first rotated label stays
inside the plot instead of being mirrored. The examples display this control
beside the other renderer options; vertical axes keep tick labels horizontal.

Nine renderers draw a datetime tick axis and honor `labelAngle`. Three ignore it
on purpose: `relative-journeys` measures elapsed days rather than dates,
`calendar-heatmap` labels a weekday and month gutter instead of a linear axis,
and `semantic-feed` has no axis. Their examples show no angle control.

The renderer writes instance-local custom properties on its generated root only. Sibling timelines and page-level theme tokens are unchanged.

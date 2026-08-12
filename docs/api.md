# API

## Renderer handles

Every named renderer returns:

- `update(options)` — merges copied options, preserves valid state, and redraws.
- `setSelection(id | null)` — pins or clears a selection without changing label geometry.
- `getState()` — returns a copied state snapshot.
- `destroy()` — disconnects observers, removes listeners, and clears generated DOM.

## Shared options

`data`, `orientation`, `domain`, `interval`, `selectedId`, `markerAxisOffset`, `labelGap`, `maxLabelLanes`, and `ariaLabel`.

Scoped appearance options are `axisColor`, `axisWidth`, `labelAngle`, `rugColor`, `rugWidth`, `rugLength`, `markerColor`, `markerRadius`, `aggregateColor`, `aggregateStemWidth`, `aggregateBarWidth`, and `aggregateHeadSize`. `labelAngle` accepts `-90` through `0` degrees for horizontal datetime axes and applies one angle and one `text-anchor` to every tick on the axis. Numeric values are clamped to finite renderer-safe bounds. These options affect only the renderer instance receiving them.

Nine renderers draw a datetime tick axis and honor `labelAngle`: `event-rug`, `proportional-run`, `volume-lollipop`, `density-histogram`, `stacked-change-plot`, `series-swimlanes`, `aligned-small-multiples`, `lifecycle-ranges`, and `overview-detail`. In `overview-detail` the angle applies to the overview strip and the detail axis alike, so the two never disagree. `relative-journeys`, `calendar-heatmap`, and `semantic-feed` have no linear datetime axis and ignore it.

Tick ladders on a day axis snap to whole-week strides, so labels land on the same weekday instead of drifting. Tick labels on a datetime axis carry `data-tick-time`, the tick's epoch milliseconds, for styling and assertions.

Aggregate renderers also accept `reducer`, a `value` accessor, and either `day`, `week`, `month`, or a custom interval object with advancing `floor` and `offset` functions.

## Core exports

`createTimeScale`, `createTicks`, `createUtcInterval`, `selectResponsiveTicks`, `formatResponsiveTick`, `estimatedLabelWidth`, `aggregateTimeBuckets`, `normalizeAppearanceOptions`, `markerGeometry`, `layoutLabels`, `clampRange`, `panRange`, `resizeRange`, `ensureTimeVisible`, `formatUtc`, and `formatRangeUtc`.

The complete static contract is in [`src/index.d.ts`](../src/index.d.ts).

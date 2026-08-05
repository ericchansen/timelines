# API

## Renderer handles

Every named renderer returns:

- `update(options)` — merges copied options, preserves valid state, and redraws.
- `setSelection(id | null)` — pins or clears a selection without changing label geometry.
- `getState()` — returns a copied state snapshot.
- `destroy()` — disconnects observers, removes listeners, and clears generated DOM.

## Shared options

`data`, `orientation`, `domain`, `interval`, `selectedId`, `markerAxisOffset`, `labelGap`, `maxLabelLanes`, and `ariaLabel`.

Aggregate renderers also accept `reducer`, a `value` accessor, and either `day`, `week`, `month`, or a custom interval object with advancing `floor` and `offset` functions.

## Core exports

`createTimeScale`, `createTicks`, `createUtcInterval`, `aggregateTimeBuckets`, `markerGeometry`, `layoutLabels`, `clampRange`, `panRange`, `resizeRange`, `ensureTimeVisible`, `formatUtc`, and `formatRangeUtc`.

The complete static contract is in [`src/index.d.ts`](../src/index.d.ts).

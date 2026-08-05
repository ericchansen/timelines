# Timeline Components

A build-free, framework-agnostic timeline library and GitHub Pages component catalog. The package ships native ES modules, CSS, TypeScript declarations, twelve named renderers, and no runtime dependencies.

## Install

```bash
npm install timelines
```

```js
import { renderProportionalRun } from "timelines";
import "timelines/styles";

const timeline = renderProportionalRun(document.querySelector("#timeline"), {
  data: [
    { id: "fiction-01", time: "2026-05-04T09:00:00Z", label: "Paper moon sketched" },
    { id: "fiction-02", time: "2026-05-06T12:00:00Z", label: "Clockwork cloud rehearsed" }
  ]
});

timeline.update({ orientation: "vertical" });
timeline.setSelection("fiction-02");
console.log(timeline.getState());
timeline.destroy();
```

Every renderer returns `{ update, setSelection, getState, destroy }`. Inputs are copied rather than mutated, state survives updates and orientation changes when its IDs remain valid, and `destroy()` removes generated DOM, listeners, and observers.

## Renderers

| Export | Pattern |
| --- | --- |
| `renderProportionalRun` | Proportional event run with collision-aware labels |
| `renderEventRug` | Compact event occurrence marks |
| `renderVolumeLollipop` | Count/sum/average/custom bucket values |
| `renderStackedChangePlot` | Bucketed composition by event type |
| `renderSeriesSwimlanes` | Shared-domain event lanes |
| `renderLifecycleRanges` | Start/end lifecycle spans |
| `renderDensityHistogram` | Zero-filled density buckets plus optional rug |
| `renderCalendarHeatmap` | Daily week-by-day activity |
| `renderRelativeJourneys` | Series aligned to day zero |
| `renderAlignedSmallMultiples` | Repeated aligned timelines |
| `renderOverviewDetail` | Draggable and resizable linked viewport |
| `renderSemanticFeed` | Native chronological reading pattern |

## Core guarantees

- UTC day, Monday-based week, month, and custom intervals
- Zero-filled count, sum, average, and custom aggregation
- Finite geometry for empty, single, identical, reversed, dense, and capped inputs
- Marker centers exactly intersect the axis center when `markerAxisOffset` is `0`
- Configurable marker-axis offset with a connector and an independent `labelGap`
- Collision-aware label lanes plus per-event placement overrides
- Preview, focus, and pinned selection remain distinct
- Pointer, touch, and keyboard parity for interactive renderers
- Structural `--tl-*` geometry tokens remain separate from `--tl-color-*` theme tokens
- Synthetic-only fixtures with obviously fictional labels

## Documentation

- [Getting started](docs/getting-started.md)
- [Data model](docs/data-model.md)
- [API](docs/api.md)
- [Accessibility](docs/accessibility.md)
- [Theming](docs/theming.md)
- [Reuse policy](docs/reuse-policy.md)
- [Contributing](CONTRIBUTING.md)

Run `npm test` for the dependency-free contract suite. Run `npm run dev` and open `http://localhost:8000/` to browse the live catalog.

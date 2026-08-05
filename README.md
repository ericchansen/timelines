# timelines

Reusable timeline examples and components with **synthetic data only**. This repository preserves and shares best practices for interactive timeline interactions: datetime axis, overview/detail, hover/focus, pinned selection, keyboard parity, readable labels, and semantic feed presentation.

**[Explore the live examples](https://ericchansen.github.io/timelines/)**

## Repo structure

```
index.html           - GitHub Pages landing page
src/
  timeline/          - shared dependency-free CSS and JavaScript core
  fixtures/          - synthetic event datasets
examples/            - runnable example entrypoints
docs/
  examples.html      - browser-readable example and API guide
  reuse-policy.html  - browser-readable synthetic-only policy
.github/workflows/   - GitHub Pages deployment
```

## Examples

All examples run standalone in a browser and use synthetic data.

- **[Landing page](index.html)** — Polished index with embedded previews and project-relative links
- **[basic.html](examples/basic.html)** — Proportional UTC axis with a narrow-screen vertical layout
- **[overview-detail.html](examples/overview-detail.html)** — Pointer/touch pan, two resize handles, keyboard parity, preview, pinned selection, and auto-pan
- **[semantic-feed.html](examples/semantic-feed.html)** — Non-interactive grouped reading structure with non-color category cues
- **[keyboard-navigation.html](examples/keyboard-navigation.html)** — Roving focus with arrow keys, Home/End, and explicit Enter/Space selection

## Preserved interaction patterns

- **datetime axis** — navigable time scale with zoom/pan
- **overview/detail** — coordinated summary and focused views
- **hover/focus** — reactive visual feedback and keyboard navigation
- **pinned selection** — persistent selection across exploration
- **keyboard parity** — all mouse interactions available via keyboard
- **readable labels** — text and layout that scale with dense timelines
- **semantic feed** — grouped event presentation where useful

## Shared core

All examples load:

```html
<link rel="stylesheet" href="../src/timeline/timeline.css">
<script src="../src/timeline/timeline.js"></script>
<script src="../src/fixtures/synthetic-events.js"></script>
```

`TimelineKit` provides range math, proportional positioning, clamped pan and resize, explicit UTC labels, roving focus, selection state, pointer-capture drag, and embed mode. Geometry uses `--tl-*` variables; theme aliases consume the host page's `--cp-*` colors.

Run `npm test` for the dependency-free validation suite.

## Reuse policy

- Synthetic fixtures only
- No real names, IDs, payloads, monitor data, quota content, or customer-specific content
- Example labels and records are clearly fictional and open-source-safe
- Static assets are documentation only; reusable value lives in the example source

## License

MIT

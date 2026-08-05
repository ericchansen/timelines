# timelines

Reusable timeline examples and components with **synthetic data only**. This repository preserves and shares best practices for interactive timeline interactions: datetime axis, overview/detail, hover/focus, pinned selection, keyboard parity, readable labels, and semantic feed presentation.

**[Explore the live examples](https://ericchansen.github.io/timelines/)**

## Repo structure

```
index.html           - GitHub Pages landing page
src/
  timeline/          - reusable timeline interaction components
  fixtures/          - synthetic event datasets
examples/            - runnable example entrypoints
docs/
  reuse-policy.md    - synthetic-only usage rules
.github/workflows/   - GitHub Pages deployment
```

## Examples

All examples run standalone in a browser and use synthetic data.

- **[Landing page](index.html)** — Polished index with embedded previews and project-relative links
- **[basic.html](examples/basic.html)** — Simple horizontal timeline with 4 events, hover states, and datetime labels
- **[overview-detail.html](examples/overview-detail.html)** — Coordinated overview and detail views with zoom window and cross-linked event selection
- **[semantic-feed.html](examples/semantic-feed.html)** — Grouped event presentation by category (deployment, monitoring) with visual hierarchy
- **[keyboard-navigation.html](examples/keyboard-navigation.html)** — Full keyboard navigation with arrow keys, Home/End, Enter/Space, and focus management

## Preserved interaction patterns

- **datetime axis** — navigable time scale with zoom/pan
- **overview/detail** — coordinated summary and focused views
- **hover/focus** — reactive visual feedback and keyboard navigation
- **pinned selection** — persistent selection across exploration
- **keyboard parity** — all mouse interactions available via keyboard
- **readable labels** — text and layout that scale with dense timelines
- **semantic feed** — grouped event presentation where useful

## Reuse policy

- Synthetic fixtures only
- No real names, IDs, payloads, monitor data, quota content, or customer-specific content
- Example labels and records are clearly fictional and open-source-safe
- Static assets are documentation only; reusable value lives in the example source

## License

MIT

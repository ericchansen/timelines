# Example guide

The browser-readable guide is available at [`docs/examples.html`](examples.html).

All four examples load the shared dependency-free core:

```html
<link rel="stylesheet" href="../src/timeline/timeline.css">
<script src="../src/timeline/timeline.js"></script>
<script src="../src/fixtures/synthetic-events.js"></script>
```

## Patterns

- [`basic.html`](../examples/basic.html) — timestamp-derived spacing and a narrow-screen vertical layout.
- [`overview-detail.html`](../examples/overview-detail.html) — pointer/touch viewport pan, two resize handles, minimum duration, full keyboard parity, preview, pinned selection, and selection auto-pan.
- [`semantic-feed.html`](../examples/semantic-feed.html) — non-interactive grouped reading structure with labels and line styles that remain meaningful without color.
- [`keyboard-navigation.html`](../examples/keyboard-navigation.html) — roving listbox focus with explicit Enter/Space selection.

## Shared API

`TimelineKit` provides time conversion, range normalization, positioning, clamped pan and resize, selection auto-pan, explicit UTC formatting, roving focus, pointer-capture drag, and embed mode.

`SYNTHETIC_TIMELINE_EVENTS` is the frozen browser fixture used by every example.

## Validation

Run `npm test` for range math, JavaScript syntax, and project-relative link checks. Run `npm run dev` and open `http://localhost:8000/` for browser validation.

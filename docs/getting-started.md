# Getting started

The package requires no build step and has no runtime dependencies.

```html
<link rel="stylesheet" href="./node_modules/timelines/src/timeline.css">
<div id="timeline"></div>
<script type="module">
  import { renderProportionalRun } from "./node_modules/timelines/src/index.js";

  const handle = renderProportionalRun(document.querySelector("#timeline"), {
    data: [
      { id: "fiction-a", time: "2026-05-01T00:00:00Z", label: "Paper moon opened" },
      { id: "fiction-b", time: "2026-05-08T00:00:00Z", label: "Paper moon folded" }
    ]
  });
</script>
```

The container must be a DOM element. Renderers observe its size when `ResizeObserver` is available. Call `destroy()` when the host view unmounts.

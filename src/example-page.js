import { components, defaultCommands } from "./catalog-data.js";
import { attachThemeToggle } from "./core/theme.js";
import { rendererRegistry } from "./renderers.js";
import {
  denseSyntheticEvents,
  syntheticEvents,
  syntheticJourneys,
  syntheticRanges,
  syntheticFixtureMeta
} from "./fixtures/synthetic-data.js";

const componentId = document.body.dataset.renderer;
const component = components.find((item) => item.id === componentId);
if (!component) throw new Error(`Unknown timeline component: ${componentId}`);

document.body.innerHTML = `
  <main class="tl-page tl-example-layout">
    <header class="tl-page-header">
      <div>
        <p class="tl-eyebrow"><a href="../index.html">Timeline components</a> / Live example</p>
        <h1 id="example-title"></h1>
        <p class="tl-lede" id="example-summary"></p>
      </div>
      <div class="tl-toolbar" id="example-controls">
        <label>Scenario
          <select class="tl-select" id="scenario">
            <option value="standard">Standard</option>
            <option value="sparse">Sparse</option>
            <option value="dense">Dense</option>
            <option value="empty">Empty</option>
            <option value="long">Long labels</option>
            <option value="capped">Capped</option>
          </select>
        </label>
        <label>Orientation
          <select class="tl-select" id="orientation">
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label>Interval
          <select class="tl-select" id="interval">
            <option value="day">Day</option>
            <option value="week" selected>Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        <label>Reducer
          <select class="tl-select" id="reducer">
            <option value="count">Count</option>
            <option value="sum">Sum</option>
            <option value="average">Average</option>
          </select>
        </label>
        <button class="tl-button" id="theme-toggle" type="button" aria-pressed="false">
          <span aria-hidden="true">◐</span><span data-theme-label>Theme</span>
        </button>
      </div>
    </header>

    <section class="tl-panel" aria-labelledby="visualization-title">
      <div class="tl-panel-header">
        <h2 id="visualization-title">Live visualization</h2>
        <p>Resize the browser or use the controls to exercise the same renderer handle.</p>
      </div>
      <div class="tl-visualization" id="example-visualization"></div>
    </section>

    <section class="tl-doc-grid" aria-label="Component guidance">
      <article class="tl-doc-card">
        <h2>When to use it</h2>
        <p id="example-use"></p>
        <h3>Synthetic data shape</h3>
        <p><code id="example-shape"></code></p>
      </article>
      <article class="tl-doc-card">
        <h2>Relevant options</h2>
        <p><code id="example-options"></code></p>
        <p><a id="source-link" href="../src/renderers.js">Renderer source</a> · <a href="../docs/api.html">API reference</a></p>
      </article>
    </section>

    <section class="tl-doc-card">
      <h2>Minimal copyable code</h2>
      <pre><code id="example-code"></code></pre>
      <p class="tl-notice" id="fixture-notice"></p>
    </section>
  </main>

  <button class="tl-button tl-keyboard-trigger" id="keyboard-trigger" type="button" aria-expanded="false" aria-controls="keyboard-panel">
    <span aria-hidden="true">⌨</span><span>Keyboard</span>
  </button>
  <aside class="tl-keyboard-panel" id="keyboard-panel" aria-labelledby="keyboard-title" hidden>
    <div class="tl-panel-header">
      <h2 id="keyboard-title">Keyboard commands</h2>
      <button class="tl-button" type="button">Close</button>
    </div>
    <ul></ul>
  </aside>
`;

function standardData() {
  if (component.dataKind === "ranges") return syntheticRanges;
  if (component.dataKind === "journeys") return syntheticJourneys;
  return syntheticEvents;
}

function scenarioData(name) {
  const data = standardData();
  if (name === "empty") return [];
  if (name === "sparse") return data.slice(0, 3);
  if (name === "capped") return data.slice(0, 6);
  if (name === "dense" && component.dataKind !== "ranges" && component.dataKind !== "journeys") {
    return denseSyntheticEvents;
  }
  if (name === "long") {
    return data.map((item) => ({
      ...item,
      label: `${item.label} — an intentionally long fictional label used to verify collision handling`
    }));
  }
  return data;
}

function codeSample() {
  const fixture =
    component.dataKind === "ranges"
      ? "syntheticRanges"
      : component.dataKind === "journeys"
        ? "syntheticJourneys"
        : "syntheticEvents";
  return `import { ${component.exportName} } from "./src/index.js";
import { ${fixture} } from "./src/fixtures/synthetic-data.js";
import "./src/timeline.css";

const timeline = ${component.exportName}(element, {
  data: ${fixture},${
    component.supportsOrientation ? '\n  orientation: "horizontal",' : ""
  }${component.interval ? `\n  interval: "${component.interval}",` : ""}
});

timeline.update({ data: nextEvents });
timeline.setSelection("fiction-03");
timeline.destroy();`;
}

document.title = `${component.title} · Timeline components`;
document.querySelector("#example-title").textContent = component.title;
document.querySelector("#example-summary").textContent = component.summary;
document.querySelector("#example-use").textContent = component.use;
document.querySelector("#example-shape").textContent = component.dataShape;
document.querySelector("#example-options").textContent = component.options;
document.querySelector("#example-code").textContent = codeSample();
document.querySelector("#source-link").href = "../src/renderers.js";

const controls = document.querySelector("#example-controls");
const orientationSelect = document.querySelector("#orientation");
const intervalSelect = document.querySelector("#interval");
const reducerSelect = document.querySelector("#reducer");

if (!component.supportsOrientation) orientationSelect.closest("label").hidden = true;
if (!component.supportsInterval) intervalSelect.closest("label").hidden = true;
if (!component.supportsReducer) reducerSelect.closest("label").hidden = true;
if (![...controls.querySelectorAll("label")].some((label) => !label.hidden)) controls.hidden = true;

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get("theme") || document.documentElement.dataset.theme || "";
const target = document.querySelector("#example-visualization");

function rendererOptions() {
  return {
    data: scenarioData(document.querySelector("#scenario").value),
    orientation: orientationSelect.value,
    interval: intervalSelect.value,
    reducer: reducerSelect.value,
    showEventRug: true,
    showDensityTrack: true,
    markerAxisOffset: 0,
    labelGap: 22,
    ariaLabel: component.title
  };
}

const handle = rendererRegistry[component.id](target, rendererOptions());

document.querySelectorAll("#scenario, #orientation, #interval, #reducer").forEach((control) => {
  control.addEventListener("change", () => handle.update(rendererOptions()));
});

const themeButton = document.querySelector("#theme-toggle");
const removeThemeToggle = attachThemeToggle(themeButton);

const keyboardTrigger = document.querySelector("#keyboard-trigger");
const keyboardPanel = document.querySelector("#keyboard-panel");
const commandList = keyboardPanel.querySelector("ul");
(component.commands || defaultCommands).forEach((command) => {
  const item = document.createElement("li");
  item.textContent = command;
  commandList.append(item);
});

function closeKeyboardHelp() {
  keyboardPanel.hidden = true;
  keyboardTrigger.setAttribute("aria-expanded", "false");
  keyboardTrigger.focus();
}

keyboardTrigger.addEventListener("click", () => {
  const open = keyboardPanel.hidden;
  keyboardPanel.hidden = !open;
  keyboardTrigger.setAttribute("aria-expanded", String(open));
  if (open) keyboardPanel.querySelector("button")?.focus();
});
keyboardPanel.querySelector("button").addEventListener("click", closeKeyboardHelp);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !keyboardPanel.hidden) {
    event.preventDefault();
    closeKeyboardHelp();
  } else if (event.key === "Escape") {
    handle.setSelection(null);
  }
});

document.querySelector("#fixture-notice").textContent = syntheticFixtureMeta.notice;
window.addEventListener("pagehide", () => {
  removeThemeToggle();
  handle.destroy();
}, { once: true });

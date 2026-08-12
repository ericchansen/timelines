import { components, defaultCommands } from "./catalog-data.js";
import { createRendererControls } from "./controls.js";
import { demoRendererOptions } from "./demo-options.js";
import { rendererRegistry } from "./renderers.js";
import { componentHeadingMarkup, mountSiteHeader } from "./site-ui.js";

const componentId = document.body.dataset.renderer;
const component = components.find((item) => item.id === componentId);
if (!component) throw new Error(`Unknown timeline component: ${componentId}`);
const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get("theme") || document.documentElement.dataset.theme || "";

document.body.innerHTML = `
  <main class="tl-page tl-example-layout">
    ${componentHeadingMarkup(component, {
      headingLevel: "h1",
      headingId: "example-title",
      linkHref: "../index.html",
      linkText: "Back to catalog",
      linkDirection: "back"
    })}

    <h2 class="tl-visually-hidden" id="visualization-title">Live visualization</h2>
    <form class="tl-renderer-controls" id="example-controls" aria-labelledby="visualization-title"></form>
    <div id="example-visualization"></div>

    <section class="tl-guidance" aria-label="Component guidance">
      <h2>When to use it</h2>
      <p id="example-use"></p>

      <h3>Synthetic data shape</h3>
      <table class="tl-reference" id="example-shape">
        <thead><tr><th scope="col">Field</th><th scope="col">Requirement</th></tr></thead>
        <tbody></tbody>
      </table>

      <h3>Relevant options</h3>
      <table class="tl-reference" id="example-options">
        <thead><tr><th scope="col">Option</th><th scope="col">Accepted values</th></tr></thead>
        <tbody></tbody>
      </table>

      <h3>Minimal code</h3>
      <button class="tl-reset" id="example-copy" type="button">Copy</button>
      <pre><code id="example-code"></code></pre>
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
const siteHeader = mountSiteHeader(document.querySelector("main.tl-page"), { basePath: "../" });

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

function fillTable(selector, rows) {
  const body = document.querySelector(`${selector} tbody`);
  body.replaceChildren();
  rows.forEach(([term, detail]) => {
    const row = document.createElement("tr");
    const key = document.createElement("th");
    key.scope = "row";
    key.textContent = term;
    const value = document.createElement("td");
    value.textContent = detail;
    row.append(key, value);
    body.append(row);
  });
}

function dataShapeRows(shape) {
  return shape
    .replace(/[{}]/g, "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) =>
      field.endsWith("?") ? [field.slice(0, -1), "Optional"] : [field, "Required"]
    );
}

function optionRows(options) {
  return options
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(":");
      return separator === -1
        ? [entry, "—"]
        : [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
    });
}

document.title = `${component.title} · Timeline components`;
document.querySelector("#example-use").textContent = component.use;
fillTable("#example-shape", dataShapeRows(component.dataShape));
fillTable("#example-options", optionRows(component.options));
document.querySelector("#example-code").textContent = codeSample();

const copyButton = document.querySelector("#example-copy");
copyButton.addEventListener("click", async () => {
  await navigator.clipboard?.writeText(codeSample());
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy";
  }, 1500);
});

const target = document.querySelector("#example-visualization");

let handle;
const controls = createRendererControls(document.querySelector("#example-controls"), {
  component,
  onChange: (values) => handle?.update(demoRendererOptions(component, values))
});
handle = rendererRegistry[component.id](target, demoRendererOptions(component, controls.getValues()));

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

window.addEventListener("pagehide", () => {
  siteHeader.destroy();
  controls.destroy();
  handle.destroy();
}, { once: true });

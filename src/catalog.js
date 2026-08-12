import { components } from "./catalog-data.js";
import { attachThemeToggle } from "./core/theme.js";
import { createRendererControls } from "./controls.js";
import { rendererRegistry } from "./renderers.js";
import {
  denseSyntheticEvents,
  syntheticEvents,
  syntheticJourneys,
  syntheticRanges
} from "./fixtures/synthetic-data.js";

function dataFor(component) {
  if (component.dataKind === "ranges") return syntheticRanges;
  if (component.dataKind === "journeys") return syntheticJourneys;
  return syntheticEvents;
}

function scenarioData(component, scenario) {
  const data = dataFor(component);
  if (scenario === "empty") return [];
  if (scenario === "sparse") return data.slice(0, 3);
  if (scenario === "capped") return data.slice(0, 6);
  if (scenario === "dense" && component.dataKind !== "ranges" && component.dataKind !== "journeys") {
    return denseSyntheticEvents;
  }
  if (scenario === "long") {
    return data.map((item) => ({
      ...item,
      label: `${item.label} — an intentionally long fictional label used to verify collision handling`
    }));
  }
  return data;
}

function optionsFor(component, values) {
  return {
    ...values,
    data: scenarioData(component, values.scenario),
    interval: values.interval || component.interval,
    orientation: values.orientation || "horizontal",
    showEventRug: true,
    showDensityTrack: true,
    reducer: values.reducer || (component.id === "volume-lollipop" ? "sum" : "count"),
    ariaLabel: component.title
  };
}

const catalog = document.querySelector("#catalog");
const instances = [];

components.forEach((component, index) => {
  const section = document.createElement("section");
  section.className = "tl-catalog-section";
  section.setAttribute("aria-labelledby", `component-${component.id}`);
  section.innerHTML = `
    <header class="tl-component-heading">
      <h2 id="component-${component.id}"><span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>${component.title}</h2>
      <a class="tl-detail-link" href="./examples/${component.file}">Details and code</a>
      <p>${component.summary}</p>
    </header>
    <form class="tl-renderer-controls"></form>
    <div class="tl-catalog-visualization" aria-label="${component.title} live renderer"></div>
  `;
  catalog.append(section);

  let handle;
  const controls = createRendererControls(section.querySelector(".tl-renderer-controls"), {
    component,
    onChange: (values) => handle?.update(optionsFor(component, values))
  });
  handle = rendererRegistry[component.id](
    section.querySelector(".tl-catalog-visualization"),
    optionsFor(component, controls.getValues())
  );
  instances.push({ handle, controls });
});

const themeButton = document.querySelector("#theme-toggle");
const removeThemeToggle = attachThemeToggle(themeButton);

window.addEventListener("pagehide", () => {
  removeThemeToggle();
  instances.forEach(({ handle, controls }) => {
    controls.destroy();
    handle.destroy();
  });
}, { once: true });

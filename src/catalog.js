import { components, catalogGroups } from "./catalog-data.js";
import { attachThemeToggle } from "./core/theme.js";
import { rendererRegistry } from "./renderers.js";
import {
  syntheticEvents,
  syntheticJourneys,
  syntheticRanges
} from "./fixtures/synthetic-data.js";

function dataFor(component) {
  if (component.dataKind === "ranges") return syntheticRanges;
  if (component.dataKind === "journeys") return syntheticJourneys;
  return syntheticEvents;
}

function optionsFor(component) {
  return {
    data: dataFor(component),
    interval: component.interval,
    orientation: "horizontal",
    showEventRug: true,
    showDensityTrack: true,
    reducer: component.id === "volume-lollipop" ? "sum" : "count",
    ariaLabel: `${component.title} preview`
  };
}

const catalog = document.querySelector("#catalog");
const handles = [];

catalogGroups.forEach((group) => {
  const section = document.createElement("section");
  section.className = "tl-catalog-group";
  section.setAttribute("aria-labelledby", `group-${group.id}`);
  section.innerHTML = `
    <div class="tl-catalog-heading">
      <h2 id="group-${group.id}">${group.title}</h2>
      <p>${group.description}</p>
    </div>
    <div class="tl-catalog-grid"></div>
  `;
  const grid = section.querySelector(".tl-catalog-grid");

  components.filter((component) => component.group === group.id).forEach((component) => {
    const article = document.createElement("article");
    article.className = "tl-card";
    article.innerHTML = `
      <div class="tl-card-copy">
        <p class="tl-eyebrow">${group.title}</p>
        <h3>${component.title}</h3>
        <p>${component.summary}</p>
      </div>
      <div class="tl-card-preview" aria-label="${component.title} live preview"></div>
      <div class="tl-card-actions">
        <a href="./examples/${component.file}">Open component</a>
      </div>
    `;
    grid.append(article);
    const renderer = rendererRegistry[component.id];
    handles.push(renderer(article.querySelector(".tl-card-preview"), optionsFor(component)));
  });

  catalog.append(section);
});

const themeButton = document.querySelector("#theme-toggle");
const removeThemeToggle = attachThemeToggle(themeButton);

window.addEventListener("pagehide", () => {
  removeThemeToggle();
  handles.forEach((handle) => handle.destroy());
}, { once: true });

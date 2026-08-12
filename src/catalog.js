import { components } from "./catalog-data.js";
import { createRendererControls } from "./controls.js";
import { demoRendererOptions } from "./demo-options.js";
import { rendererRegistry } from "./renderers.js";
import { componentHeadingMarkup, mountSiteHeader } from "./site-ui.js";

const page = document.querySelector("main.tl-page");
const siteHeader = mountSiteHeader(page);
const catalog = document.querySelector("#catalog");
const instances = [];

components.forEach((component) => {
  const section = document.createElement("section");
  section.className = "tl-catalog-section";
  section.setAttribute("aria-labelledby", `component-${component.id}`);
  section.innerHTML = `
    ${componentHeadingMarkup(component, {
      headingId: `component-${component.id}`,
      linkHref: `./examples/${component.file}`,
      linkText: "View details"
    })}
    <form class="tl-renderer-controls"></form>
    <div class="tl-catalog-visualization" aria-label="${component.title} live renderer"></div>
  `;
  catalog.append(section);

  let handle;
  const controls = createRendererControls(section.querySelector(".tl-renderer-controls"), {
    component,
    onChange: (values) => handle?.update(demoRendererOptions(component, values))
  });
  handle = rendererRegistry[component.id](
    section.querySelector(".tl-catalog-visualization"),
    demoRendererOptions(component, controls.getValues())
  );
  instances.push({ handle, controls });
});

window.addEventListener("pagehide", () => {
  siteHeader.destroy();
  instances.forEach(({ handle, controls }) => {
    controls.destroy();
    handle.destroy();
  });
}, { once: true });

import { APPEARANCE_OPTIONS } from "./core/appearance.js";

const scenarioOptions = Object.freeze([
  ["standard", "Standard"],
  ["sparse", "Sparse"],
  ["dense", "Dense"],
  ["empty", "Empty"],
  ["long", "Long labels"],
  ["capped", "Capped"]
]);

const appearanceControls = Object.freeze({
  axis: [
    { name: "axisColor", label: "Axis color", type: "color", value: "#8a93a3" },
    { name: "axisWidth", label: "Axis width", type: "range", step: 0.25 }
  ],
  rug: [
    { name: "rugColor", label: "Rug mark color", type: "color", value: "#4c5dff" },
    { name: "rugWidth", label: "Rug mark width", type: "range", step: 0.25 },
    { name: "rugLength", label: "Rug mark length", type: "range", step: 1 }
  ],
  marker: [
    { name: "markerColor", label: "Marker color", type: "color", value: "#4c5dff" },
    { name: "markerRadius", label: "Marker size", type: "range", step: 1 }
  ],
  offset: [
    { name: "markerAxisOffset", label: "Axis offset", type: "range", step: 1 }
  ],
  lollipop: [
    { name: "aggregateColor", label: "Lollipop color", type: "color", value: "#00a57a" },
    { name: "aggregateStemWidth", label: "Stem width", type: "range", step: 0.5 },
    { name: "aggregateHeadSize", label: "Head size", type: "range", step: 1 }
  ],
  bar: [
    { name: "aggregateColor", label: "Aggregate color", type: "color", value: "#00a57a" },
    { name: "aggregateBarWidth", label: "Bar width", type: "range", step: 2 }
  ],
  label: [
    { name: "labelGap", label: "Label gap", type: "range", step: 1 }
  ],
  tick: [
    { name: "labelAngle", label: "Label angle", type: "range", step: 5, horizontalOnly: true }
  ]
});

function withNumericBounds(control) {
  const bounds = APPEARANCE_OPTIONS[control.name];
  return bounds
    ? {
        ...control,
        min: bounds.minimum,
        max: bounds.maximum,
        value: bounds.fallback
      }
    : control;
}

function uniqueAppearanceControls(component) {
  const seen = new Set();
  const groups = [
    ...(component.appearance || []),
    ...(component.supportsTickAngle ? ["tick"] : [])
  ];
  return groups.flatMap((group) =>
    (appearanceControls[group] || [])
      .map(withNumericBounds)
      .filter((control) => {
        if (seen.has(control.name)) return false;
        seen.add(control.name);
        return true;
      })
  );
}

export function getRendererControlMetadata(component) {
  const common = [
    { name: "scenario", label: "Scenario", options: scenarioOptions, value: "standard" },
    component.supportsOrientation
      ? { name: "orientation", label: "Orientation", options: [["horizontal", "Horizontal"], ["vertical", "Vertical"]], value: "horizontal" }
      : null,
    component.supportsInterval
      ? { name: "interval", label: "Interval", options: [["day", "Day"], ["week", "Week"], ["month", "Month"]], value: component.interval || "week" }
      : null,
    component.supportsReducer
      ? { name: "reducer", label: "Reducer", options: [["count", "Count"], ["sum", "Sum"], ["average", "Average"]], value: component.id === "volume-lollipop" ? "sum" : "count" }
      : null
  ].filter(Boolean);
  return Object.freeze({
    common: Object.freeze(common),
    appearance: Object.freeze(uniqueAppearanceControls(component))
  });
}

export function clampControlValue(control, value) {
  const number = Number(value);
  const fallback = Number(control.value);
  return Math.min(control.max, Math.max(control.min, Number.isFinite(number) ? number : fallback));
}

function controlMarkup(control, prefix) {
  const id = `${prefix}-${control.name}`;
  if (control.options) {
    return `<label class="tl-control tl-control--select" for="${id}"><span class="tl-control-label">${control.label}</span>
      <select class="tl-control-input" id="${id}" name="${control.name}">${control.options
        .map(([value, text]) => `<option value="${value}"${value === control.value ? " selected" : ""}>${text}</option>`)
        .join("")}</select></label>`;
  }
  const range =
    control.type === "range"
      ? ` min="${control.min}" max="${control.max}" step="${control.step}"`
      : "";
  const output =
    control.type === "range"
      ? `<output class="tl-control-readout" for="${id}">${control.value}</output>`
      : "";
  return `<label class="tl-control tl-control--${control.type}"${control.horizontalOnly ? ' data-horizontal-only="true"' : ""} for="${id}">
    <span class="tl-control-label">${control.label}</span>
    <input class="tl-control-input tl-control-input--${control.type}" id="${id}" name="${control.name}" type="${control.type}" value="${control.value}"${range}>${output}</label>`;
}

function groupMarkup(legend, controls, prefix, trailing = "") {
  if (!controls.length) return "";
  return `<fieldset class="tl-control-group tl-control-group--${legend.toLowerCase()}">
    <legend class="tl-visually-hidden">${legend}</legend>
    <span class="tl-control-group-name" aria-hidden="true">${legend}</span>
    ${controls.map((control) => controlMarkup(control, prefix)).join("")}${trailing}
  </fieldset>`;
}

export function createRendererControls(container, { component, onChange = () => {} } = {}) {
  const metadata = getRendererControlMetadata(component);
  const customControls = metadata.appearance;

  container.classList.add("tl-renderer-controls");
  container.innerHTML =
    groupMarkup("Data", metadata.common, component.id) +
    groupMarkup(
      "Appearance",
      customControls,
      component.id,
      '<button class="tl-reset" type="button">Reset</button>'
    );

  const defaults = Object.fromEntries(customControls.map((control) => [control.name, control.value]));
  function getValues() {
    const formValues = {};
    container.querySelectorAll("select, input").forEach((control) => {
      formValues[control.name] = control.type === "range" ? Number(control.value) : control.value;
    });
    return { ...defaults, ...formValues };
  }

  function notify(event) {
    const control = event.target;
    if (control.type === "range") {
      const definition = customControls.find((item) => item.name === control.name);
      control.value = String(clampControlValue(definition, control.value));
      control.closest("label")?.querySelector("output")?.replaceChildren(control.value);
    }
    updateConditionalControls();
    onChange(getValues());
  }

  function updateConditionalControls() {
    const vertical = container.querySelector('[name="orientation"]')?.value === "vertical";
    container.querySelectorAll('[data-horizontal-only="true"]').forEach((control) => {
      control.hidden = vertical;
    });
  }

  const controller = new AbortController();
  container.addEventListener("change", notify, { signal: controller.signal });
  container.addEventListener("input", notify, { signal: controller.signal });
  container.querySelector(".tl-reset")?.addEventListener("click", () => {
    customControls.forEach((control) => {
      const input = container.querySelector(`[name="${control.name}"]`);
      input.value = String(control.value);
      input.closest("label")?.querySelector("output")?.replaceChildren(String(control.value));
    });
    onChange(getValues());
  }, { signal: controller.signal });
  updateConditionalControls();

  return Object.freeze({
    getValues,
    destroy() {
      controller.abort();
      container.replaceChildren();
    }
  });
}

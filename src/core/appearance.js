import { clamp, finite } from "./time.js";

export const APPEARANCE_OPTIONS = Object.freeze({
  axisWidth: Object.freeze({ minimum: 0.5, maximum: 8, fallback: 1.5 }),
  rugWidth: Object.freeze({ minimum: 0.5, maximum: 8, fallback: 1.25 }),
  rugLength: Object.freeze({ minimum: 4, maximum: 72, fallback: 16 }),
  markerRadius: Object.freeze({ minimum: 2, maximum: 20, fallback: 7 }),
  markerAxisOffset: Object.freeze({ minimum: -80, maximum: 80, fallback: 0 }),
  aggregateStemWidth: Object.freeze({ minimum: 0.5, maximum: 10, fallback: 3 }),
  aggregateBarWidth: Object.freeze({ minimum: 0, maximum: 56, fallback: 0 }),
  aggregateHeadSize: Object.freeze({ minimum: 2, maximum: 20, fallback: 7 }),
  labelGap: Object.freeze({ minimum: 4, maximum: 80, fallback: 20 }),
  labelAngle: Object.freeze({ minimum: -90, maximum: 0, fallback: -45 })
});

const colorOptions = ["axisColor", "rugColor", "markerColor", "aggregateColor"];

export function normalizeAppearanceOptions(options = {}) {
  const normalized = {};
  Object.entries(APPEARANCE_OPTIONS).forEach(([name, { minimum, maximum, fallback }]) => {
    normalized[name] = clamp(finite(options[name], fallback), minimum, maximum);
  });
  colorOptions.forEach((name) => {
    normalized[name] = typeof options[name] === "string" && options[name].trim() ? options[name].trim() : null;
  });
  return normalized;
}

export function applyAppearanceStyles(element, appearance) {
  const values = {
    "--tl-axis-color-local": appearance.axisColor,
    "--tl-axis-width-local": appearance.axisWidth,
    "--tl-rug-color-local": appearance.rugColor,
    "--tl-rug-width-local": appearance.rugWidth,
    "--tl-marker-color-local": appearance.markerColor,
    "--tl-marker-size-local": `${appearance.markerRadius * 2}px`,
    "--tl-aggregate-color-local": appearance.aggregateColor,
    "--tl-stem-width-local": appearance.aggregateStemWidth
  };
  Object.entries(values).forEach(([name, value]) => {
    if (value !== null && value !== undefined) element.style.setProperty(name, String(value));
  });
}

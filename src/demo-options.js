import {
  denseSyntheticEvents,
  syntheticEvents,
  syntheticJourneys,
  syntheticRanges
} from "./fixtures/synthetic-data.js";

export function dataForComponent(component) {
  if (component.dataKind === "ranges") return syntheticRanges;
  if (component.dataKind === "journeys") return syntheticJourneys;
  return syntheticEvents;
}

export function scenarioDataFor(component, scenario = "standard") {
  const data = dataForComponent(component);
  if (scenario === "empty") return [];
  if (scenario === "sparse") return data.slice(0, 3);
  if (scenario === "capped") return data.slice(0, 6);
  if (
    scenario === "dense" &&
    component.dataKind !== "ranges" &&
    component.dataKind !== "journeys"
  ) {
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

export function demoRendererOptions(component, values) {
  return {
    ...values,
    data: scenarioDataFor(component, values.scenario),
    interval: values.interval || component.interval,
    orientation: values.orientation || "horizontal",
    showEventRug: true,
    showDensityTrack: true,
    reducer: values.reducer || (component.id === "volume-lollipop" ? "sum" : "count"),
    ariaLabel: component.title
  };
}

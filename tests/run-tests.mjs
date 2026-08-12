import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  aggregateTimeBuckets,
  attachEventInteractions,
  clampRange,
  createInteractionState,
  createTimeScale,
  createTicks,
  createUtcInterval,
  estimatedLabelWidth,
  formatResponsiveTick,
  layoutLabels,
  markerGeometry,
  normalizeAppearanceOptions,
  panRange,
  renderCalendarHeatmap,
  renderEventRug,
  renderLifecycleRanges,
  renderOverviewDetail,
  renderRelativeJourneys,
  renderVolumeLollipop,
  rendererRegistry,
  resizeRange,
  selectResponsiveTicks
} from "../src/index.js";
import * as packageExports from "../src/index.js";
import { attachThemeToggle } from "../src/core/theme.js";
import { createRenderer } from "../src/core/renderer.js";
import { components } from "../src/catalog-data.js";
import { clampControlValue, getRendererControlMetadata } from "../src/controls.js";
import {
  syntheticEvents,
  syntheticJourneys,
  syntheticRanges
} from "../src/fixtures/synthetic-data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;

function test(name, callback) {
  callback();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      entry.name === ".git" ||
      entry.name === ".screenshots" ||
      entry.name === ".impeccable" ||
      entry.name === "browser-check"
    ) return [];
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function utc(year, month, day, hour = 0) {
  return Date.UTC(year, month - 1, day, hour);
}

class FakeElement extends EventTarget {
  constructor(ownerDocument, name = "div") {
    super();
    this.ownerDocument = ownerDocument;
    this.name = name;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.style = {
      display: "",
      setProperty: (name, value) => {
        this.style[name] = value;
      }
    };
    this.clientWidth = ownerDocument?.renderWidth ?? 960;
    this.clientHeight = 430;
    this.tabIndex = -1;
  }
  append(...children) {
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children = children;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  focus() {
    this.dispatchEvent(new Event("focus"));
  }
  setPointerCapture(pointerId) {
    this.capturedPointer = pointerId;
  }
  releasePointerCapture(pointerId) {
    if (this.capturedPointer === pointerId) this.capturedPointer = null;
  }
  getBoundingClientRect() {
    return { width: this.clientWidth, height: this.clientHeight };
  }
}

class FakeDocument {
  constructor(defaultView = {}, renderWidth = 960) {
    this.defaultView = defaultView;
    this.renderWidth = renderWidth;
  }
  createElement(name) {
    return new FakeElement(this, name);
  }
  createElementNS(_namespace, name) {
    return new FakeElement(this, name);
  }
}

function findByClass(node, className) {
  if ((node.getAttribute?.("class") || "").split(/\s+/).includes(className)) return node;
  for (const child of node.children || []) {
    const match = findByClass(child, className);
    if (match) return match;
  }
  return null;
}

function findAllByClass(node, className, matches = []) {
  if ((node.getAttribute?.("class") || "").split(/\s+/).includes(className)) matches.push(node);
  for (const child of node.children || []) findAllByClass(child, className, matches);
  return matches;
}

function pointerEvent(type, properties) {
  const event = new Event(type, { cancelable: true });
  Object.entries(properties).forEach(([name, value]) => {
    Object.defineProperty(event, name, { value });
  });
  return event;
}

function catalogFixture(component) {
  if (component.dataKind === "ranges") return syntheticRanges;
  if (component.dataKind === "journeys") return syntheticJourneys;
  return syntheticEvents;
}

function tickAngles(container) {
  return findAllByClass(container, "tl-tick-label").map(
    (label) => (label.getAttribute("transform") || "").match(/rotate\((-?[\d.]+)/)?.[1] ?? "0"
  );
}

test("time scales stay finite for normal, reversed, and identical domains", () => {
  const scale = createTimeScale([0, 100], [20, 220]);
  assert.equal(scale(50), 120);
  assert.equal(scale.invert(70), 25);
  assert.equal(createTimeScale([100, 0], [0, 1])(50), 0.5);
  assert.equal(createTimeScale([50, 50], [10, 30])(50), 20);
  assert.ok(Number.isFinite(createTimeScale([50, 50], [10, 30])(999)));
});

test("day, week, and month intervals align to UTC calendar boundaries", () => {
  assert.equal(createUtcInterval("day").floor(utc(2026, 5, 4, 19)), utc(2026, 5, 4));
  assert.equal(createUtcInterval("week").floor(utc(2026, 5, 7)), utc(2026, 5, 4));
  assert.equal(createUtcInterval("month").floor(utc(2026, 5, 22)), utc(2026, 5, 1));
  assert.equal(createUtcInterval("month").offset(utc(2026, 12, 1), 1), utc(2027, 1, 1));
  assert.deepEqual(
    createTicks([utc(2026, 5, 1), utc(2026, 7, 1)], "month").map((tick) => tick.value),
    [utc(2026, 5, 1), utc(2026, 6, 1), utc(2026, 7, 1)]
  );
});

test("custom intervals must advance and can generate ticks", () => {
  const custom = createUtcInterval({
    floor: (value) => Math.floor(value / 10) * 10,
    offset: (value, step) => value + step * 10,
    label: (value) => `T${value}`
  });
  assert.deepEqual(custom.range([3, 24]), [0, 10, 20, 30]);
  assert.throws(
    () => createUtcInterval({ floor: (value) => value, offset: (value) => value }).range([0, 1]),
    /advance/
  );
});

test("aggregation zero-fills bins and supports count, sum, average, and custom reducers", () => {
  const data = [
    { time: new Date(utc(2026, 5, 4, 1)).toISOString(), value: 2 },
    { time: new Date(utc(2026, 5, 4, 2)).toISOString(), value: 4 },
    { time: new Date(utc(2026, 5, 6, 3)).toISOString(), value: 9 }
  ];
  const domain = [utc(2026, 5, 4), utc(2026, 5, 6)];
  assert.deepEqual(
    aggregateTimeBuckets(data, { domain, interval: "day", reducer: "count" }).map((bin) => bin.value),
    [2, 0, 1]
  );
  assert.deepEqual(
    aggregateTimeBuckets(data, { domain, interval: "day", reducer: "sum" }).map((bin) => bin.value),
    [6, 0, 9]
  );
  assert.deepEqual(
    aggregateTimeBuckets(data, { domain, interval: "day", reducer: "average" }).map((bin) => bin.value),
    [3, 0, 9]
  );
  assert.deepEqual(
    aggregateTimeBuckets(data, {
      domain,
      interval: "day",
      reducer: (values) => values.reduce((maximum, value) => Math.max(maximum, value), 0)
    }).map((bin) => bin.value),
    [4, 0, 9]
  );
});

test("week and month aggregation bins preserve calendar boundaries", () => {
  const data = [{ time: new Date(utc(2026, 5, 31)).toISOString(), value: 1 }];
  const weekBins = aggregateTimeBuckets(data, {
    domain: [utc(2026, 5, 25), utc(2026, 6, 8)],
    interval: "week"
  });
  assert.equal(new Date(weekBins[0].start).getUTCDay(), 1);
  assert.equal(weekBins[0].end - weekBins[0].start, 7 * 24 * 60 * 60 * 1000);
  const monthBins = aggregateTimeBuckets(data, {
    domain: [utc(2026, 5, 1), utc(2026, 7, 1)],
    interval: "month"
  });
  assert.deepEqual(monthBins.map((bin) => bin.start), [utc(2026, 5, 1), utc(2026, 6, 1), utc(2026, 7, 1)]);
});

test("responsive ticks preserve calendar positions, formats, bounds, and non-overlap", () => {
  const domain = [utc(2026, 7, 6), utc(2026, 9, 7)];
  const candidates = createTicks(domain, "week");
  const wide = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 840
  });
  const narrow = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 220
  });
  const vertical = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "vertical",
    renderedLength: 180
  });
  const flat = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 220,
    labelAngle: 0
  });
  const verticalLabels = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 220,
    labelAngle: -90
  });
  assert.equal(formatResponsiveTick(utc(2026, 7, 13), "week", 840), "Week of Jul 13");
  assert.equal(formatResponsiveTick(utc(2026, 7, 13), "week", 500), "Jul 13");
  assert.equal(formatResponsiveTick(utc(2026, 7, 13), "week", 220), "7/13");
  assert.equal(formatResponsiveTick(utc(2026, 7, 1), "month", 840), "Jul 2026");
  assert.equal(formatResponsiveTick(utc(2026, 7, 1), "month", 220), "7/1/26");
  assert.match(wide[0].label, /^Week of /);
  assert.match(narrow[0].label, /^\d+\/\d+$/);
  assert.ok(narrow.length < candidates.length);
  assert.equal(narrow[0].value, candidates[0].value);
  assert.equal(narrow.at(-1).value, candidates.at(-1).value);
  assert.ok(narrow.every((tick) => tick.value >= domain[0] && tick.value <= domain[1]));
  assert.ok(vertical.length < candidates.length);
  assert.ok(vertical.every((tick) => tick.rotated === false));
  assert.ok(flat.every((tick) => tick.labelAngle === 0 && tick.rotated === false));
  assert.ok(verticalLabels.every((tick) => tick.labelAngle === -90 && tick.rotated));
  const scale = createTimeScale(domain, [0, 220]);
  assert.ok(narrow.every((tick) => scale(tick.value) >= 0 && scale(tick.value) <= 220));
  assert.ok(selectResponsiveTicks(candidates.slice(0, 2), {
    domain: [candidates[0].value, candidates[1].value],
    interval: "week",
    renderedLength: 60
  }).every((tick) => tick.rotated));
});

test("appearance options and control inputs clamp to finite scoped values", () => {
  const options = normalizeAppearanceOptions({
    axisWidth: 99,
    rugWidth: -2,
    rugLength: 999,
    markerRadius: Number.NaN,
    markerAxisOffset: -999,
    aggregateBarWidth: 999,
    labelGap: -1,
    labelAngle: -999,
    axisColor: "  #123456 "
  });
  assert.equal(options.axisWidth, 8);
  assert.equal(options.rugWidth, 0.5);
  assert.equal(options.rugLength, 72);
  assert.equal(options.markerRadius, 7);
  assert.equal(options.markerAxisOffset, -80);
  assert.equal(options.aggregateBarWidth, 56);
  assert.equal(options.labelGap, 4);
  assert.equal(options.labelAngle, -90);
  assert.equal(options.axisColor, "#123456");

  const rug = getRendererControlMetadata(components.find((component) => component.id === "event-rug"));
  assert.deepEqual(rug.common.map((control) => control.name), ["scenario", "orientation", "interval"]);
  assert.deepEqual(rug.appearance.map((control) => control.name), [
    "axisColor",
    "axisWidth",
    "rugColor",
    "rugWidth",
    "rugLength",
    "labelGap",
    "labelAngle"
  ]);
  assert.equal(rug.appearance.find((control) => control.name === "labelAngle").horizontalOnly, true);
  const width = rug.appearance.find((control) => control.name === "rugWidth");
  assert.equal(clampControlValue(width, "999"), 8);
  assert.equal(clampControlValue(width, "not-a-number"), 1.25);
});

test("calendar heatmap rows use the core Monday-based week contract", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  const handle = renderCalendarHeatmap(container, {
    data: [
      { id: "monday", time: new Date(utc(2026, 5, 4)).toISOString(), label: "Paper moon opened" },
      { id: "sunday", time: new Date(utc(2026, 5, 10)).toISOString(), label: "Paper moon folded" }
    ]
  });
  const cells = findAllByClass(container, "tl-calendar-cell");
  assert.equal(cells.length, 7);
  assert.equal(cells[0].getAttribute("transform"), "translate(110 34)");
  assert.equal(cells[6].getAttribute("transform"), "translate(110 238)");
  handle.destroy();
});

test("calendar heatmap labels its weekday gutter and month columns", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  const handle = renderCalendarHeatmap(container, { data: syntheticEvents });
  const weekdays = findAllByClass(container, "tl-tick-label--weekday").map((label) => label.textContent);
  const months = findAllByClass(container, "tl-tick-label--month").map((label) => label.textContent);
  assert.deepEqual(weekdays, ["Mon", "Wed", "Fri", "Sun"]);
  assert.ok(months.length >= 2, `expected month labels, saw ${months.join(",")}`);
  assert.ok(months.every((label) => /^[A-Z][a-z]{2} \d{4}$/.test(label)), months.join(","));
  assert.ok(
    findAllByClass(container, "tl-calendar-cell").every((cell) =>
      cell.children.some((child) => child.name === "title")
    ),
    "every calendar cell needs an accessible title"
  );
  handle.destroy();
});

test("default marker centers exactly equal axis centers in both orientations", () => {
  const horizontal = markerGeometry(123.5, { orientation: "horizontal", axis: 72, markerAxisOffset: 0 });
  assert.equal(horizontal.x, horizontal.axisX);
  assert.equal(horizontal.y, horizontal.axisY);
  assert.equal(horizontal.connector, null);
  const vertical = markerGeometry(123.5, { orientation: "vertical", axis: 72, markerAxisOffset: 0 });
  assert.equal(vertical.x, vertical.axisX);
  assert.equal(vertical.y, vertical.axisY);
  assert.equal(vertical.connector, null);
});

test("event rug applies scoped appearance without leaking to siblings", () => {
  const document = new FakeDocument();
  const data = [
    { id: "a", time: new Date(utc(2026, 5, 4)).toISOString(), label: "Paper moon opened" },
    { id: "b", time: new Date(utc(2026, 5, 11)).toISOString(), label: "Paper moon folded" }
  ];
  const customized = new FakeElement(document);
  const defaulted = new FakeElement(document);
  const customHandle = renderEventRug(customized, {
    data,
    axisColor: "#123456",
    axisWidth: 99,
    rugColor: "#654321",
    rugWidth: 7,
    rugLength: 999,
    markerAxisOffset: 999
  });
  const defaultHandle = renderEventRug(defaulted, { data });
  const customChart = findByClass(customized, "tl-chart");
  const defaultChart = findByClass(defaulted, "tl-chart");
  const mark = findByClass(customized, "tl-rug-mark");
  assert.equal(customChart.style["--tl-axis-color-local"], "#123456");
  assert.equal(customChart.style["--tl-axis-width-local"], "8");
  assert.equal(customChart.style["--tl-rug-color-local"], "#654321");
  assert.equal(defaultChart.style["--tl-axis-color-local"], undefined);
  assert.equal(Math.abs(Number(mark.getAttribute("y2")) - Number(mark.getAttribute("y1"))), 72);
  customHandle.destroy();
  defaultHandle.destroy();
});

test("responsive axes retain bounded anchors and honor scoped label angles", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  const data = Array.from({ length: 12 }, (_, index) => ({
    id: `event-${index}`,
    time: new Date(utc(2026, 5, 1 + index)).toISOString(),
    label: `Fictional event ${index}`
  }));
  const handle = renderEventRug(container, { data, interval: "day", labelAngle: -45 });
  const labels = findAllByClass(container, "tl-tick-label");
  assert.ok(labels.length >= 2);
  const anchors = new Set(labels.map((label) => label.getAttribute("text-anchor")));
  assert.deepEqual([...anchors], ["end"]);
  const angles = new Set(
    labels.map((label) => label.getAttribute("transform").match(/^rotate\((-?\d+(?:\.\d+)?) /)[1])
  );
  assert.deepEqual([...angles], ["-45"]);
  assert.ok(labels.every((label) => label.getAttribute("aria-label")));
  handle.update({ labelAngle: 0 });
  const flat = findAllByClass(container, "tl-tick-label");
  assert.ok(flat.every((label) => !label.getAttribute("transform")));
  assert.equal(flat[0].getAttribute("text-anchor"), "start");
  assert.equal(flat.at(-1).getAttribute("text-anchor"), "end");
  handle.update({ orientation: "vertical", labelAngle: -90 });
  assert.ok(findAllByClass(container, "tl-tick-label").every((label) => !label.getAttribute("transform")));
  handle.destroy();
});

test("responsive ticks keep a uniform stride and measure in plot units", () => {
  const domain = [utc(2026, 5, 4), utc(2026, 8, 31)];
  const candidates = createTicks(domain, "week");
  const picked = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 960,
    measureLength: 400,
    labelAngle: -45
  });
  assert.ok(picked.length >= 3);
  const scale = createTimeScale(domain, [0, 400]);
  const gaps = picked.slice(1).map((tick, index) => scale(tick.value) - scale(picked[index].value));
  const rhythm = gaps.slice(1);
  const spread = Math.max(...rhythm) - Math.min(...rhythm);
  assert.ok(spread < 1, `expected a uniform stride, saw gaps ${gaps.join(",")}`);
  assert.ok(gaps[0] >= rhythm[0] - 1, "leading remainder gap must not be tighter than the rhythm");

  const roomy = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 960,
    measureLength: 960
  });
  const cramped = selectResponsiveTicks(candidates, {
    domain,
    interval: "week",
    orientation: "horizontal",
    renderedLength: 960,
    measureLength: 240
  });
  assert.ok(cramped.length < roomy.length, "measureLength must drive overlap math, not renderedLength");
  assert.equal(roomy[0].label, cramped[0].label, "renderedLength alone must drive the abbreviation tier");
});

test("every datetime renderer draws uniformly rotated date ticks", () => {
  const document = new FakeDocument();
  const rotating = components.filter((component) => component.supportsTickAngle);
  assert.equal(rotating.length, 9);
  rotating.forEach((component) => {
    const container = new FakeElement(document);
    const handle = rendererRegistry[component.id](container, {
      data: catalogFixture(component),
      interval: component.interval,
      labelAngle: -45
    });
    const labels = findAllByClass(container, "tl-tick-label").filter((label) => {
      const className = label.getAttribute("class") || "";
      return !className.includes("--weekday") && !className.includes("--month");
    });
    assert.ok(labels.length >= 2, `${component.id} drew ${labels.length} date labels`);
    const angles = new Set(
      labels.map((label) => (label.getAttribute("transform") || "").match(/rotate\((-?[\d.]+)/)?.[1])
    );
    const anchors = new Set(labels.map((label) => label.getAttribute("text-anchor")));
    assert.deepEqual([...angles], ["-45"], `${component.id} mixed tick angles`);
    assert.deepEqual([...anchors], ["end"], `${component.id} mixed text anchors`);
    handle.destroy();
  });
  components
    .filter((component) => !component.supportsTickAngle)
    .forEach((component) => {
      assert.equal(
        getRendererControlMetadata(component).appearance.some((control) => control.name === "labelAngle"),
        false,
        `${component.id} must not expose an angle control`
      );
    });
});

test("relative journeys label an elapsed-day axis instead of a fixed origin", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  const handle = renderRelativeJourneys(container, { data: syntheticJourneys });
  const labels = findAllByClass(container, "tl-tick-label").map((label) => label.textContent);
  assert.ok(labels.length >= 3, `expected an elapsed-day axis, saw ${labels.join(",")}`);
  assert.ok(
    labels.every((label) => /^Day \d+$/.test(label)),
    `elapsed-day labels must read "Day N", saw ${labels.join(",")}`
  );
  assert.equal(labels[0], "Day 0", "the axis must start at the shared origin");
  const days = labels.map((label) => Number(label.slice(4)));
  assert.deepEqual(days, [...days].sort((a, b) => a - b), "elapsed days must ascend");
  assert.equal(new Set(days).size, days.length, "elapsed-day labels must be distinct");
  handle.destroy();
});

test("calendar renderers without an explicit interval still snap to whole weeks", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  // lifecycle-ranges builds its own scale and passes no interval, so the axis has
  // to infer "day" candidates and land on a weekly rhythm rather than an
  // arbitrary stride that drifts across weekdays.
  const handle = renderLifecycleRanges(container, { data: syntheticRanges });
  const labels = findAllByClass(container, "tl-tick-label").filter(
    (label) => !/tl-tick-label--(weekday|month)/.test(label.getAttribute("class") || "")
  );
  assert.ok(labels.length >= 4, `expected a labelled date axis, saw ${labels.length}`);
  const days = labels.map((label) => Number(label.getAttribute("data-tick-time")));
  const gaps = days.slice(2).map((value, index) => Math.round((value - days[index + 1]) / 86400000));
  assert.ok(gaps.length > 0, "expected at least one interior gap to measure");
  assert.equal(
    new Set(gaps).size,
    1,
    `interior ticks must share one stride, saw ${gaps.join(",")} days`
  );
  assert.equal(gaps[0] % 7, 0, `a day axis must snap to whole weeks, saw ${gaps[0]} days`);
  handle.destroy();
});

test("label angle survives orientation round trips without leaking to siblings", () => {
  const document = new FakeDocument();
  const rotated = new FakeElement(document);
  const untouched = new FakeElement(document);
  const data = Array.from({ length: 10 }, (_, index) => ({
    id: `event-${index}`,
    time: new Date(utc(2026, 5, 1 + index)).toISOString(),
    label: `Fictional event ${index}`
  }));
  const handle = renderEventRug(rotated, { data, interval: "day", labelAngle: -90 });
  const neighbor = renderEventRug(untouched, { data, interval: "day" });
  assert.deepEqual([...new Set(tickAngles(rotated))], ["-90"]);
  assert.deepEqual([...new Set(tickAngles(untouched))], ["-45"]);
  handle.update({ orientation: "vertical" });
  assert.deepEqual([...new Set(tickAngles(rotated))], ["0"], "vertical labels stay horizontal");
  handle.update({ orientation: "horizontal" });
  assert.deepEqual([...new Set(tickAngles(rotated))], ["-90"], "angle restores on return to horizontal");
  assert.deepEqual([...new Set(tickAngles(untouched))], ["-45"], "sibling renderer never changed");
  handle.destroy();
  neighbor.destroy();
});

test("rotated labels stay inside the drawing surface at every width", () => {
  [960, 640, 420].forEach((width) => {
    const document = new FakeDocument({}, width);
    const container = new FakeElement(document);
    const handle = renderEventRug(container, {
      data: syntheticEvents,
      interval: "week",
      labelAngle: -45
    });
    const labels = findAllByClass(container, "tl-tick-label");
    assert.ok(labels.length >= 2, `width ${width} drew ${labels.length} labels`);
    labels.forEach((label) => {
      const x = Number(label.getAttribute("x"));
      // Rotated labels are anchored at their end, so each one reaches back from
      // its tick by the horizontal component of its footprint.
      const reach = estimatedLabelWidth(label.textContent) * Math.cos(Math.PI / 4);
      assert.ok(x - reach >= 0, `width ${width}: "${label.textContent}" overflows the left edge`);
      assert.ok(x <= 960, `width ${width}: "${label.textContent}" overflows the right edge`);
    });
    handle.destroy();
  });
});

test("overview detail redraws its detail ticks when the viewport pans", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  const handle = renderOverviewDetail(container, {
    data: syntheticEvents,
    interval: "week",
    labelAngle: -45
  });
  const detailTicks = findByClass(container, "tl-axis-ticks");
  assert.ok(detailTicks, "detail ticks are grouped for redraw");
  const before = detailTicks.children.map((node) => node.getAttribute("x")).join(",");
  assert.ok(before.length > 0, "detail axis starts with ticks");

  const domain = [Date.parse(syntheticEvents[0].time), Date.parse(syntheticEvents.at(-1).time)];
  const span = domain[1] - domain[0];
  handle.update({ visibleRange: [domain[0] + span / 2, domain[0] + (span * 5) / 6] });

  const after = findByClass(container, "tl-axis-ticks")
    .children.map((node) => node.getAttribute("x"))
    .join(",");
  assert.notEqual(after, before, "moving the viewport redraws the detail axis");

  // The overview strip and the detail axis must agree on one angle and anchor.
  const angles = new Set(tickAngles(container));
  const anchors = new Set(
    findAllByClass(container, "tl-tick-label").map((label) => label.getAttribute("text-anchor"))
  );
  assert.deepEqual([...angles], ["-45"], "overview and detail axes share one angle");
  assert.deepEqual([...anchors], ["end"], "overview and detail axes share one anchor");
  handle.destroy();
});

test("lollipop geometry stays finite and within its derived plot space", () => {
  const document = new FakeDocument();
  const data = [
    { id: "a", time: new Date(utc(2026, 5, 4)).toISOString(), label: "Paper moon", value: 2 },
    { id: "b", time: new Date(utc(2026, 5, 18)).toISOString(), label: "Clockwork cloud", value: 10 }
  ];
  ["horizontal", "vertical"].forEach((orientation) => {
    [["day", "count"], ["week", "sum"], ["month", "average"]].forEach(([interval, reducer]) => {
      const container = new FakeElement(document);
      const handle = renderVolumeLollipop(container, {
        data,
        orientation,
        interval,
        reducer,
        aggregateHeadSize: 20
      });
      const chart = findByClass(container, "tl-chart");
      const [, , viewBoxWidth, viewBoxHeight] = chart.getAttribute("viewBox").split(/\s+/).map(Number);
      const stems = findAllByClass(container, "tl-lollipop-stem");
      const heads = findAllByClass(container, "tl-lollipop-head");
      assert.ok(stems.length > 0);
      [...stems, ...heads].forEach((node) => {
        [...node.attributes.values()].forEach((value) => {
          if (/^-?\d+(?:\.\d+)?$/.test(value)) assert.ok(Number.isFinite(Number(value)));
        });
      });
      heads.forEach((head) => {
        assert.ok(Number(head.getAttribute("cx")) >= 0 && Number(head.getAttribute("cx")) <= viewBoxWidth);
        assert.ok(Number(head.getAttribute("cy")) >= 0 && Number(head.getAttribute("cy")) <= viewBoxHeight);
      });
      handle.destroy();
    });
  });
  [[], data.slice(0, 1)].forEach((scenario) => {
    const container = new FakeElement(document);
    const handle = renderVolumeLollipop(container, { data: scenario, interval: "month" });
    assert.ok(findByClass(container, "tl-chart"));
    findAllByClass(container, "tl-lollipop-head").forEach((head) => {
      assert.ok(Number.isFinite(Number(head.getAttribute("cx"))));
      assert.ok(Number.isFinite(Number(head.getAttribute("cy"))));
    });
    handle.destroy();
  });
});

test("marker offsets create connectors without changing the timestamp coordinate", () => {
  const horizontal = markerGeometry(120, { orientation: "horizontal", axis: 70, markerAxisOffset: 14 });
  assert.equal(horizontal.x, 120);
  assert.equal(horizontal.y, 84);
  assert.deepEqual(horizontal.connector, { x1: 120, y1: 70, x2: 120, y2: 84 });
  const vertical = markerGeometry(120, { orientation: "vertical", axis: 70, markerAxisOffset: -10 });
  assert.equal(vertical.y, 120);
  assert.equal(vertical.x, 60);
  assert.deepEqual(vertical.connector, { x1: 70, y1: 120, x2: 60, y2: 120 });
});

test("collision-aware labels use stable lanes and honor placement overrides", () => {
  const labels = layoutLabels(
    [
      { id: "a", position: 100, markerCross: 50, width: 100, height: 30, placement: "above" },
      { id: "b", position: 120, markerCross: 50, width: 100, height: 30, placement: "above" },
      { id: "c", position: 140, markerCross: 50, width: 100, height: 30, placement: "below" }
    ],
    { orientation: "horizontal", labelGap: 20, laneSize: 30, maxLanes: 3 }
  );
  assert.equal(labels[0].side, "above");
  assert.equal(labels[0].lane, 0);
  assert.equal(labels[1].lane, 1);
  assert.equal(labels[2].side, "below");
  assert.ok(labels[0].y < 50);
  assert.ok(labels[2].y > 50);
});

test("range pan and resize clamp while enforcing minimum duration", () => {
  assert.deepEqual(clampRange([-20, 30], [0, 100], 20), [0, 50]);
  assert.deepEqual(panRange([20, 50], [0, 100], -40), [0, 30]);
  assert.deepEqual(resizeRange([20, 80], [0, 100], "start", 50, 30), [50, 80]);
  assert.deepEqual(resizeRange([20, 80], [0, 100], "end", -60, 30), [20, 50]);
});

test("interaction state preserves only IDs present after update", () => {
  const state = createInteractionState(["a", "b"], { selectedId: "b", focusedId: "a" });
  assert.equal(state.getState().selectedId, "b");
  state.set({ previewId: "a" });
  assert.equal(state.getState().previewId, "a");
  state.updateIds(["a"]);
  assert.equal(state.getState().selectedId, null);
  assert.equal(state.getState().focusedId, "a");
});

test("event interactions support activation, orientation arrows, and cleanup", () => {
  class FakeNode extends EventTarget {
    constructor(id) {
      super();
      this.dataset = { eventId: id };
      this.tabIndex = -1;
    }
    focus() {
      this.dispatchEvent(new Event("focus"));
    }
  }
  const nodes = [new FakeNode("a"), new FakeNode("b")];
  const selected = [];
  const focused = [];
  const remove = attachEventInteractions(nodes, {
    orientation: "horizontal",
    onSelect: (id) => selected.push(id),
    onFocus: (id) => focused.push(id)
  });
  const enter = new Event("keydown", { cancelable: true });
  Object.defineProperty(enter, "key", { value: "Enter" });
  nodes[0].dispatchEvent(enter);
  assert.deepEqual(selected, ["a"]);
  const next = new Event("keydown", { cancelable: true });
  Object.defineProperty(next, "key", { value: "ArrowRight" });
  nodes[0].dispatchEvent(next);
  assert.equal(nodes[1].tabIndex, 0);
  assert.equal(focused.at(-1), "b");
  remove();
  nodes[0].dispatchEvent(enter);
  assert.deepEqual(selected, ["a"]);
});

test("theme toggles start from the effective preference and clean up", () => {
  const document = new FakeDocument();
  const button = new FakeElement(document, "button");
  const label = { textContent: "" };
  button.querySelector = () => label;
  const root = { dataset: {} };
  const remove = attachThemeToggle(button, {
    root,
    matchMedia: () => ({ matches: true })
  });
  assert.equal(root.dataset.theme, "dark");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.equal(label.textContent, "Light theme");
  button.dispatchEvent(new Event("click"));
  assert.equal(root.dataset.theme, "light");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(label.textContent, "Dark theme");
  remove();
  button.dispatchEvent(new Event("click"));
  assert.equal(root.dataset.theme, "light");
});

test("renderer handles copy inputs, preserve state, update, and destroy", () => {
  let observerDisconnected = 0;
  class FakeResizeObserver {
    observe() {}
    disconnect() {
      observerDisconnected += 1;
    }
  }
  const container = {
    ownerDocument: { defaultView: { ResizeObserver: FakeResizeObserver } },
    children: [],
    replaceChildren(...children) {
      this.children = children;
    }
  };
  const input = { data: [{ id: "a", label: "Original" }], orientation: "horizontal" };
  let draws = 0;
  let destroyed = 0;
  let synced = null;
  const handle = createRenderer(container, input, (_target, options) => {
    draws += 1;
    options.data[0] && (options.data[0].label = "Mutated clone");
    return {
      syncState: (state) => {
        synced = state;
      },
      destroy: () => {
        destroyed += 1;
      }
    };
  });
  assert.equal(input.data[0].label, "Original");
  handle.setSelection("a");
  assert.equal(handle.getState().selectedId, "a");
  assert.equal(synced.selectedId, "a");
  handle.update({ orientation: "vertical" });
  assert.equal(handle.getState().orientation, "vertical");
  assert.equal(draws, 2);
  assert.equal(destroyed, 1);
  handle.destroy();
  assert.equal(handle.getState().destroyed, true);
  assert.deepEqual(container.children, []);
  assert.equal(destroyed, 2);
  assert.equal(observerDisconnected, 1);
});

test("overview pointer capture survives continuous pan and destroy removes behavior", () => {
  const document = new FakeDocument();
  const container = new FakeElement(document);
  const data = [
    { id: "a", time: new Date(utc(2026, 5, 1)).toISOString(), label: "Paper moon opened" },
    { id: "b", time: new Date(utc(2026, 5, 15)).toISOString(), label: "Paper moon folded" },
    { id: "c", time: new Date(utc(2026, 6, 1)).toISOString(), label: "Paper moon archived" }
  ];
  const handle = renderOverviewDetail(container, { data });
  const chart = findByClass(container, "tl-chart");
  const viewport = findByClass(container, "tl-viewport");
  const startHandle = findByClass(container, "tl-viewport-handle--start");
  const endHandle = findByClass(container, "tl-viewport-handle--end");
  const detailItems = findAllByClass(container, "tl-event--detail");
  assert.equal(chart.getAttribute("role"), "group");
  assert.ok(viewport);
  assert.equal(startHandle.getAttribute("role"), "slider");
  assert.equal(endHandle.getAttribute("role"), "slider");
  assert.ok(detailItems.some((item) => item.getAttribute("aria-hidden") === "true"));
  detailItems
    .filter((item) => item.getAttribute("aria-hidden") === "true")
    .forEach((item) => assert.equal(item.getAttribute("role"), null));
  const initial = handle.getState().visibleRange;

  viewport.dispatchEvent(pointerEvent("pointerdown", { pointerId: 7, button: 0, clientX: 100, clientY: 0 }));
  viewport.dispatchEvent(pointerEvent("pointermove", { pointerId: 7, clientX: 140, clientY: 0 }));
  const afterFirstMove = handle.getState().visibleRange;
  assert.notDeepEqual(afterFirstMove, initial);
  assert.equal(findByClass(container, "tl-viewport"), viewport);
  assert.equal(viewport.capturedPointer, 7);

  viewport.dispatchEvent(pointerEvent("pointermove", { pointerId: 7, clientX: 180, clientY: 0 }));
  assert.notDeepEqual(handle.getState().visibleRange, afterFirstMove);
  viewport.dispatchEvent(pointerEvent("pointerup", { pointerId: 7, clientX: 180, clientY: 0 }));
  assert.equal(viewport.capturedPointer, null);

  const beforeDestroy = handle.getState().visibleRange;
  handle.destroy();
  viewport.dispatchEvent(pointerEvent("pointermove", { pointerId: 7, clientX: 220, clientY: 0 }));
  assert.deepEqual(handle.getState().visibleRange, beforeDestroy);
  assert.deepEqual(container.children, []);
});

test("package exports all twelve named renderers and declares every public symbol", () => {
  assert.equal(Object.keys(rendererRegistry).length, 12);
  assert.equal(components.length, 12);
  components.forEach((component) => {
    assert.equal(typeof rendererRegistry[component.id], "function", component.id);
  });
  const declarations = fs.readFileSync(path.join(root, "src", "index.d.ts"), "utf8");
  [
    "update(options",
    "setSelection(id",
    "getState()",
    "destroy()",
    ...components.map((component) => component.exportName),
    ...Object.keys(packageExports)
  ].forEach((text) => assert.match(declarations, new RegExp(text.replace(/[()]/g, "\\$&"))));
});

test("package metadata is build-free, dependency-free, and export-ready", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(manifest.type, "module");
  assert.equal(manifest.exports["."].import, "./src/index.js");
  assert.equal(manifest.exports["."].types, "./src/index.d.ts");
  assert.equal(manifest.exports["./styles"], "./src/timeline.css");
  assert.equal(manifest.dependencies, undefined);
  assert.doesNotMatch(JSON.stringify(manifest.scripts), /build/);
  assert.ok(manifest.files.includes("docs"));
  assert.ok(manifest.files.includes("CONTRIBUTING.md"));
});

test("catalog mounts all twelve full renderers without card or preview wrappers", () => {
  const catalogData = fs.readFileSync(path.join(root, "src", "catalog-data.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "src", "catalog.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "src", "timeline.css"), "utf8");
  const controls = fs.readFileSync(path.join(root, "src", "controls.js"), "utf8");
  assert.equal((catalogData.match(/exportName:/g) || []).length, 12);
  components.forEach((component) => {
    assert.ok(fs.existsSync(path.join(root, "examples", component.file)), component.file);
  });
  assert.match(catalog, /components\.forEach/);
  assert.match(catalog, /rendererRegistry\[component\.id\]/);
  assert.match(catalog, /tl-catalog-visualization/);
  assert.match(catalog, /createRendererControls/);
  assert.doesNotMatch(catalog, /tl-card|preview|thumbnail/i);
  assert.doesNotMatch(styles, /min-width:\s*34rem/);
  assert.doesNotMatch(styles, /\.tl-card\b/);
  assert.doesNotMatch(controls, /tl-customize|<details/);
  assert.match(controls, /labelAngle/);
  assert.doesNotMatch(catalogData, /keyboard-navigation/);
  const retired = fs.readFileSync(path.join(root, "examples", "keyboard-navigation.html"), "utf8");
  assert.match(retired, /Keyboard parity is now built into every interactive renderer/);
  const landing = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(landing, /tl-eyebrow|tl-notice|tl-lede/);
  assert.doesNotMatch(styles, /\.tl-chart\s*\{[^}]*min-width/s);
  assert.doesNotMatch(styles, /\.tl-catalog-visualization\s*\{[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(catalog, /tl-controls-host|class="tl-visualization"/);
  assert.match(catalog, /<header class="tl-component-heading">[\s\S]*<\/header>\s*<form class="tl-renderer-controls">/);
  const examplePage = fs.readFileSync(path.join(root, "src", "example-page.js"), "utf8");
  assert.doesNotMatch(examplePage, /tl-code-disclosure|<details/);
  assert.match(examplePage, /tl-reference/);
  assert.match(controls, /tl-control-group/);
  assert.match(styles, /grid-template-rows:\s*subgrid/);
});

test("all local HTML references resolve under the project site", () => {
  const htmlFiles = walk(root).filter((file) => file.endsWith(".html"));
  const projectBase = new URL("https://example.test/timelines/");
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((reference) => !/^(?:https?:|#|data:)/.test(reference));
    references.forEach((reference) => {
      const clean = reference.split(/[?#]/)[0];
      const target = path.resolve(path.dirname(file), clean || ".");
      const fromRoot = path.relative(root, path.dirname(file)).replaceAll(path.sep, "/");
      const resolved = new URL(path.posix.join(fromRoot, reference), projectBase);
      assert.ok(resolved.pathname.startsWith("/timelines/"), `${reference} escaped the project site`);
      assert.ok(fs.existsSync(target), `${reference} is missing from ${path.relative(root, file)}`);
    });
    const docsIndex = fs.readFileSync(path.join(root, "docs", "index.html"), "utf8");
    assert.doesNotMatch(docsIndex, /href="[^"]+\.md"/);
  });
});

test("fixtures are obviously fictional and exclude prohibited operational language", () => {
  const fixture = fs.readFileSync(path.join(root, "src", "fixtures", "synthetic-data.js"), "utf8");
  assert.match(fixture, /fictional/i);
  assert.doesNotMatch(fixture, /customer|quota|local monitor|localhost|tenant|subscription|account id/i);
  assert.doesNotMatch(fixture, /@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(fixture, /\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/i);
});

test("overview implementation contains pointer capture, two handles, and resize observation", () => {
  const renderer = fs.readFileSync(path.join(root, "src", "renderers.js"), "utf8");
  const interaction = fs.readFileSync(path.join(root, "src", "core", "interaction.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "src", "core", "renderer.js"), "utf8");
  assert.match(renderer, /tl-viewport-handle--start/);
  assert.match(renderer, /tl-viewport-handle--end/);
  assert.match(renderer, /attachPointerDrag\(viewport/);
  assert.match(interaction, /setPointerCapture/);
  assert.match(interaction, /releasePointerCapture/);
  assert.match(lifecycle, /ResizeObserver/);
});

test("all JavaScript modules pass the Node syntax checker", () => {
  walk(path.join(root, "src"))
    .filter((file) => file.endsWith(".js"))
    .forEach((file) => {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(result.status, 0, `${path.relative(root, file)}\n${result.stderr}`);
    });
});

console.log(`1..${passed}`);

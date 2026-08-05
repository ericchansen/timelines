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
  layoutLabels,
  markerGeometry,
  panRange,
  renderCalendarHeatmap,
  renderOverviewDetail,
  rendererRegistry,
  resizeRange
} from "../src/index.js";
import * as packageExports from "../src/index.js";
import { attachThemeToggle } from "../src/core/theme.js";
import { createRenderer } from "../src/core/renderer.js";
import { components } from "../src/catalog-data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;

function test(name, callback) {
  callback();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === ".screenshots" || entry.name === ".impeccable") return [];
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
    this.clientWidth = 960;
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
    return { width: 960, height: 430 };
  }
}

class FakeDocument {
  constructor(defaultView = {}) {
    this.defaultView = defaultView;
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

test("catalog registers twelve honest example routes and hides the retired keyboard example", () => {
  const catalog = fs.readFileSync(path.join(root, "src", "catalog-data.js"), "utf8");
  assert.equal((catalog.match(/exportName:/g) || []).length, 12);
  components.forEach((component) => {
    assert.ok(fs.existsSync(path.join(root, "examples", component.file)), component.file);
  });
  assert.doesNotMatch(catalog, /keyboard-navigation/);
  const retired = fs.readFileSync(path.join(root, "examples", "keyboard-navigation.html"), "utf8");
  assert.match(retired, /Keyboard parity is now built into every interactive renderer/);
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

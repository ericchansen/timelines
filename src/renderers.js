import {
  aggregateTimeBuckets,
  clamp,
  clampRange,
  createTicks,
  createTimeScale,
  ensureTimeVisible,
  extent,
  finite,
  formatUtc,
  normalizeDomain,
  panRange,
  resizeRange,
  toTime
} from "./core/time.js";
import { labelTextWidth, layoutLabels, markerGeometry } from "./core/geometry.js";
import { attachEventInteractions, attachPointerDrag } from "./core/interaction.js";
import { createRenderer } from "./core/renderer.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 960;
const HEIGHT = 360;
const PLOT_START = 72;
const PLOT_END = 888;

function svgElement(document, name, attributes = {}, text = "") {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) element.setAttribute(key, String(value));
  });
  if (text) element.textContent = text;
  return element;
}

function htmlElement(document, name, className, text = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createSvg(container, label, height = HEIGHT) {
  const document = container.ownerDocument;
  const svg = svgElement(document, "svg", {
    class: "tl-chart",
    viewBox: `0 0 ${WIDTH} ${height}`,
    role: "group",
    "aria-label": label,
    preserveAspectRatio: "xMidYMid meet"
  });
  container.append(svg);
  return svg;
}

function dataDomain(data, options, accessor = (item) => item.time) {
  return normalizeDomain(options.domain || extent(data, accessor));
}

function addTitle(node, text) {
  node.append(svgElement(node.ownerDocument, "title", {}, text));
}

function axisCoordinates(orientation) {
  return orientation === "vertical"
    ? { axis: 280, start: 56, end: 304 }
    : { axis: 178, start: PLOT_START, end: PLOT_END };
}

function drawAxis(svg, domain, orientation, interval, coordinates = axisCoordinates(orientation)) {
  const document = svg.ownerDocument;
  const scale = createTimeScale(domain, [coordinates.start, coordinates.end]);
  const horizontal = orientation !== "vertical";
  svg.append(
    svgElement(document, "line", {
      class: "tl-axis",
      x1: horizontal ? coordinates.start : coordinates.axis,
      y1: horizontal ? coordinates.axis : coordinates.start,
      x2: horizontal ? coordinates.end : coordinates.axis,
      y2: horizontal ? coordinates.axis : coordinates.end
    })
  );

  createTicks(domain, interval || "day").forEach((tick) => {
    const position = scale(tick.value);
    svg.append(
      svgElement(document, "line", {
        class: "tl-tick",
        x1: horizontal ? position : coordinates.axis - 5,
        y1: horizontal ? coordinates.axis - 5 : position,
        x2: horizontal ? position : coordinates.axis + 5,
        y2: horizontal ? coordinates.axis + 5 : position
      }),
      svgElement(
        document,
        "text",
        {
          class: "tl-tick-label",
          x: horizontal ? position : coordinates.axis - 12,
          y: horizontal ? coordinates.axis + 24 : position + 4,
          "text-anchor": horizontal ? "middle" : "end"
        },
        tick.label
      )
    );
  });

  return { scale, coordinates };
}

function syncInteractive(nodes, state) {
  nodes.forEach((node) => {
    const id = node.dataset.eventId;
    node.dataset.preview = String(state.previewId === id || state.focusedId === id);
    node.dataset.selected = String(state.selectedId === id);
    node.setAttribute("aria-pressed", String(state.selectedId === id));
  });
}

function bindInteractive(nodes, orientation, state, api) {
  const remove = attachEventInteractions(nodes, {
    orientation,
    onPreview: (previewId) => api.setState({ previewId }),
    onFocus: (focusedId) => api.setState({ focusedId }),
    onSelect: (selectedId) => api.setState({ selectedId })
  });
  api.register(remove);
  syncInteractive(nodes, state);
}

function eventLabel(event) {
  return `${event.label}, ${formatUtc(event.time, { date: true, year: true, seconds: true })}`;
}

function drawEventAxis(container, options, state, api, variant = "run") {
  const data = options.data || [];
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const domain = dataDomain(data, options);
  const svg = createSvg(container, options.ariaLabel || "Proportional event timeline");
  const { scale, coordinates } = drawAxis(svg, domain, orientation, options.interval || "week");
  const labels = layoutLabels(
    data.map((event) => {
      const geometry = markerGeometry(scale(event.time), {
        orientation,
        axis: coordinates.axis,
        markerAxisOffset: event.markerAxisOffset ?? options.markerAxisOffset ?? 0
      });
      return {
        id: event.id,
        position: orientation === "horizontal" ? geometry.x : geometry.y,
        markerCross: orientation === "horizontal" ? geometry.y : geometry.x,
        width: labelTextWidth(event.label),
        height: 30,
        placement: event.labelPlacement
      };
    }),
    {
      orientation,
      axis: coordinates.axis,
      labelGap: options.labelGap ?? 20,
      maxLanes: options.maxLabelLanes ?? 3
    }
  );
  const nodes = [];

  data.forEach((event, index) => {
    const document = svg.ownerDocument;
    const geometry = markerGeometry(scale(event.time), {
      orientation,
      axis: coordinates.axis,
      markerAxisOffset: event.markerAxisOffset ?? options.markerAxisOffset ?? 0
    });
    const label = labels[index];
    const group = svgElement(document, "g", {
      class: `tl-event tl-event--${variant}`,
      role: "button",
      "aria-label": `${eventLabel(event)}. Press Enter or Space to pin.`,
      "data-event-id": event.id
    });
    group.dataset.eventId = event.id;
    if (geometry.connector) {
      group.append(svgElement(document, "line", { class: "tl-connector", ...geometry.connector }));
    }

    if (variant === "rug") {
      const length = 22;
      group.append(
        svgElement(document, "line", {
          class: "tl-rug-mark",
          x1: orientation === "horizontal" ? geometry.x : geometry.x - length / 2,
          y1: orientation === "horizontal" ? geometry.y - length / 2 : geometry.y,
          x2: orientation === "horizontal" ? geometry.x : geometry.x + length / 2,
          y2: orientation === "horizontal" ? geometry.y + length / 2 : geometry.y
        })
      );
    } else {
      group.append(
        svgElement(document, "circle", {
          class: "tl-marker-hit",
          cx: geometry.x,
          cy: geometry.y,
          r: 18
        }),
        svgElement(document, "circle", {
          class: "tl-marker",
          cx: geometry.x,
          cy: geometry.y,
          r: options.markerRadius || 7
        })
      );
    }

    const labelGroup = svgElement(document, "g", {
      class: "tl-event-label",
      transform: `translate(${label.x - label.width / 2} ${label.y - label.height / 2})`
    });
    labelGroup.append(
      svgElement(document, "rect", {
        width: label.width,
        height: label.height,
        rx: 7
      }),
      svgElement(
        document,
        "text",
        {
          x: label.width / 2,
          y: 19,
          "text-anchor": "middle"
        },
        event.label.length > 28 ? `${event.label.slice(0, 27)}…` : event.label
      )
    );
    addTitle(labelGroup, event.label);
    group.append(labelGroup);
    svg.append(group);
    nodes.push(group);
  });

  bindInteractive(nodes, orientation, state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawBucketChart(container, options, state, api, variant) {
  const data = options.data || [];
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const domain = dataDomain(data, options);
  const bins = aggregateTimeBuckets(data, {
    domain,
    interval: options.interval || "day",
    customInterval: options.customInterval,
    reducer: options.reducer || (variant === "lollipop" ? "sum" : "count"),
    value: options.value || ((item) => item.value)
  });
  const svg = createSvg(container, options.ariaLabel || "Time bucket chart");
  const { scale, coordinates } = drawAxis(svg, domain, orientation, options.interval || "day", {
    ...axisCoordinates(orientation),
    axis: orientation === "horizontal" ? 292 : 112
  });
  const maxValue = Math.max(1, ...bins.map((bin) => bin.value));
  const nodes = [];

  bins.forEach((bin, index) => {
    const document = svg.ownerDocument;
    const start = scale(bin.start);
    const end = scale(Math.min(bin.end, domain[1]));
    const center = (start + end) / 2;
    const magnitude = (bin.value / maxValue) * 180;
    const group = svgElement(document, "g", {
      class: `tl-bucket tl-bucket--${variant}`,
      role: "button",
      "aria-label": `${bin.label}: ${bin.value}`,
      "data-event-id": `bucket-${index}`
    });
    group.dataset.eventId = `bucket-${index}`;

    if (variant === "lollipop") {
      if (orientation === "horizontal") {
        group.append(
          svgElement(document, "line", { class: "tl-lollipop-stem", x1: center, y1: coordinates.axis, x2: center, y2: coordinates.axis - magnitude }),
          svgElement(document, "circle", { class: "tl-lollipop-head", cx: center, cy: coordinates.axis - magnitude, r: 7 })
        );
      } else {
        group.append(
          svgElement(document, "line", { class: "tl-lollipop-stem", x1: coordinates.axis, y1: center, x2: coordinates.axis + magnitude, y2: center }),
          svgElement(document, "circle", { class: "tl-lollipop-head", cx: coordinates.axis + magnitude, cy: center, r: 7 })
        );
      }
    } else {
      const thickness = Math.max(3, Math.abs(end - start) - 3);
      group.append(
        svgElement(document, "rect", {
          class: "tl-density-bar",
          x: orientation === "horizontal" ? Math.min(start, end) + 1.5 : coordinates.axis,
          y: orientation === "horizontal" ? coordinates.axis - magnitude : Math.min(start, end) + 1.5,
          width: orientation === "horizontal" ? thickness : magnitude,
          height: orientation === "horizontal" ? magnitude : thickness,
          rx: 3
        })
      );
    }

    svg.append(group);
    nodes.push(group);
  });

  if (variant === "histogram" && options.showEventRug !== false) {
    data.forEach((event) => {
      const position = scale(event.time);
      svg.append(
        svgElement(svg.ownerDocument, "line", {
          class: "tl-rug-mark tl-rug-mark--overlay",
          x1: orientation === "horizontal" ? position : coordinates.axis - 7,
          y1: orientation === "horizontal" ? coordinates.axis + 5 : position,
          x2: orientation === "horizontal" ? position : coordinates.axis + 7,
          y2: orientation === "horizontal" ? coordinates.axis + 19 : position
        })
      );
    });
  }

  bindInteractive(nodes, orientation, state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawStacked(container, options, state, api) {
  const data = options.data || [];
  const domain = dataDomain(data, options);
  const interval = options.interval || "week";
  const bins = aggregateTimeBuckets(data, { domain, interval, reducer: "count" });
  const types = [...new Set(data.map((item) => item.type))];
  const svg = createSvg(container, options.ariaLabel || "Stacked change plot");
  const { scale, coordinates } = drawAxis(svg, domain, "horizontal", interval, {
    ...axisCoordinates("horizontal"),
    axis: 302
  });
  const maximum = Math.max(
    1,
    ...bins.map((bin) => types.reduce((sum, type) => sum + bin.items.filter((item) => item.type === type).length, 0))
  );
  const nodes = [];

  bins.forEach((bin, binIndex) => {
    const start = scale(bin.start);
    const end = scale(Math.min(bin.end, domain[1]));
    const width = Math.max(4, end - start - 3);
    let y = coordinates.axis;
    types.forEach((type, typeIndex) => {
      const count = bin.items.filter((item) => item.type === type).length;
      const height = (count / maximum) * 190;
      if (height === 0) return;
      const node = svgElement(svg.ownerDocument, "rect", {
        class: `tl-stack-segment tl-type-${typeIndex + 1}`,
        x: start + 1.5,
        y: y - height,
        width,
        height,
        rx: 2,
        role: "button",
        "aria-label": `${bin.label}, ${type}: ${count}`,
        "data-event-id": `stack-${binIndex}-${type}`
      });
      node.dataset.eventId = `stack-${binIndex}-${type}`;
      svg.append(node);
      nodes.push(node);
      y -= height;
    });
  });

  bindInteractive(nodes, "horizontal", state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawSwimlanes(container, options, state, api, smallMultiples = false) {
  const data = options.data || [];
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const domain = dataDomain(data, options);
  const series = [...new Set(data.map((item) => item.series))];
  const height = Math.max(320, series.length * 100 + 70);
  const svg = createSvg(container, options.ariaLabel || "Series swimlanes", height);
  const scale = createTimeScale(domain, orientation === "horizontal" ? [180, 890] : [70, height - 50]);
  const nodes = [];

  series.forEach((name, seriesIndex) => {
    const cross = 74 + seriesIndex * 92;
    svg.append(
      svgElement(svg.ownerDocument, "text", {
        class: "tl-lane-label",
        x: orientation === "horizontal" ? 18 : 96 + seriesIndex * 250,
        y: orientation === "horizontal" ? cross + 4 : 30,
        "text-anchor": orientation === "horizontal" ? "start" : "middle"
      }, name)
    );
    const axisStart = orientation === "horizontal" ? 180 : 56;
    const axisEnd = orientation === "horizontal" ? 890 : height - 50;
    const axisCross = orientation === "horizontal" ? cross : 96 + seriesIndex * 250;
    svg.append(
      svgElement(svg.ownerDocument, "line", {
        class: "tl-axis tl-axis--lane",
        x1: orientation === "horizontal" ? axisStart : axisCross,
        y1: orientation === "horizontal" ? axisCross : axisStart,
        x2: orientation === "horizontal" ? axisEnd : axisCross,
        y2: orientation === "horizontal" ? axisCross : axisEnd
      })
    );

    data.filter((item) => item.series === name).forEach((event) => {
      const primary = scale(event.time);
      const geometry = markerGeometry(primary, {
        orientation,
        axis: axisCross,
        markerAxisOffset: event.markerAxisOffset ?? options.markerAxisOffset ?? 0
      });
      const group = svgElement(svg.ownerDocument, "g", {
        class: smallMultiples ? "tl-event tl-event--small-multiple" : "tl-event tl-event--lane",
        role: "button",
        "aria-label": eventLabel(event),
        "data-event-id": event.id
      });
      group.dataset.eventId = event.id;
      group.append(
        svgElement(svg.ownerDocument, "circle", { class: "tl-marker-hit", cx: geometry.x, cy: geometry.y, r: 16 }),
        svgElement(svg.ownerDocument, "circle", { class: "tl-marker", cx: geometry.x, cy: geometry.y, r: 6 })
      );
      addTitle(group, event.label);
      svg.append(group);
      nodes.push(group);
    });
  });

  bindInteractive(nodes, orientation, state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawRanges(container, options, state, api) {
  const data = options.data || [];
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const rangeTimes = data.flatMap((item) => [toTime(item.start), toTime(item.end)]);
  const domain = normalizeDomain(
    options.domain ||
      (rangeTimes.length
        ? [Math.min(...rangeTimes), Math.max(...rangeTimes)]
        : [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2)])
  );
  const height = Math.max(320, data.length * 74 + 70);
  const svg = createSvg(container, options.ariaLabel || "Lifecycle range timeline", height);
  const scale = createTimeScale(domain, orientation === "horizontal" ? [210, 890] : [56, height - 40]);
  const nodes = [];

  data.forEach((item, index) => {
    const cross = 62 + index * 68;
    const start = scale(item.start);
    const end = scale(item.end);
    const group = svgElement(svg.ownerDocument, "g", {
      class: "tl-range",
      role: "button",
      "aria-label": `${item.label}, ${formatUtc(item.start, { date: true })} through ${formatUtc(item.end, { date: true })}`,
      "data-event-id": item.id
    });
    group.dataset.eventId = item.id;
    group.append(
      svgElement(svg.ownerDocument, "text", {
        class: "tl-lane-label",
        x: orientation === "horizontal" ? 18 : 48 + index * 190,
        y: orientation === "horizontal" ? cross + 4 : 28,
        "text-anchor": "start"
      }, item.label),
      svgElement(svg.ownerDocument, "rect", {
        class: "tl-range-bar",
        x: orientation === "horizontal" ? start : 34 + index * 190,
        y: orientation === "horizontal" ? cross - 9 : start,
        width: orientation === "horizontal" ? Math.max(2, end - start) : 28,
        height: orientation === "horizontal" ? 18 : Math.max(2, end - start),
        rx: 9
      })
    );
    svg.append(group);
    nodes.push(group);
  });

  bindInteractive(nodes, orientation, state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawCalendar(container, options, state, api) {
  const data = options.data || [];
  const bins = aggregateTimeBuckets(data, { interval: "day", reducer: options.reducer || "count" });
  const svg = createSvg(container, options.ariaLabel || "Calendar heatmap", 300);
  const maximum = Math.max(1, ...bins.map((bin) => bin.value));
  const startWeek = bins.length ? (new Date(bins[0].start).getUTCDay() + 6) % 7 : 0;
  const nodes = [];

  bins.forEach((bin, index) => {
    const dayIndex = startWeek + index;
    const column = Math.floor(dayIndex / 7);
    const row = dayIndex % 7;
    const group = svgElement(svg.ownerDocument, "g", {
      class: "tl-calendar-cell",
      role: "button",
      "aria-label": `${bin.label}: ${bin.value}`,
      "data-event-id": `calendar-${index}`,
      transform: `translate(${110 + column * 34} ${34 + row * 34})`
    });
    group.dataset.eventId = `calendar-${index}`;
    group.style.setProperty("--tl-intensity", String(bin.value / maximum));
    group.append(svgElement(svg.ownerDocument, "rect", { width: 28, height: 28, rx: 5 }));
    svg.append(group);
    nodes.push(group);
  });

  bindInteractive(nodes, "horizontal", state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawJourneys(container, options, state, api) {
  const data = options.data || [];
  const series = [...new Set(data.map((item) => item.series))];
  const maxDay = Math.max(1, ...data.map((item) => finite(item.day)));
  const scale = (day) => 200 + (finite(day) / maxDay) * 680;
  const height = Math.max(320, series.length * 94 + 80);
  const svg = createSvg(container, options.ariaLabel || "Relative journeys aligned to day zero", height);
  const nodes = [];

  series.forEach((name, seriesIndex) => {
    const y = 70 + seriesIndex * 90;
    svg.append(
      svgElement(svg.ownerDocument, "text", { class: "tl-lane-label", x: 18, y: y + 4 }, name),
      svgElement(svg.ownerDocument, "line", { class: "tl-axis tl-axis--lane", x1: 200, y1: y, x2: 880, y2: y }),
      svgElement(svg.ownerDocument, "text", { class: "tl-tick-label", x: 200, y: y + 28, "text-anchor": "middle" }, "Day 0")
    );
    data.filter((item) => item.series === name).forEach((item) => {
      const x = scale(item.day);
      const group = svgElement(svg.ownerDocument, "g", {
        class: "tl-event tl-event--journey",
        role: "button",
        "aria-label": `${item.series}, day ${item.day}: ${item.label}`,
        "data-event-id": item.id
      });
      group.dataset.eventId = item.id;
      group.append(
        svgElement(svg.ownerDocument, "circle", { class: "tl-marker-hit", cx: x, cy: y, r: 16 }),
        svgElement(svg.ownerDocument, "circle", { class: "tl-marker", cx: x, cy: y, r: 6 })
      );
      addTitle(group, item.label);
      svg.append(group);
      nodes.push(group);
    });
  });

  bindInteractive(nodes, "horizontal", state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function drawOverviewDetail(container, options, state, api) {
  const data = options.data || [];
  const domain = dataDomain(data, options);
  const minimumDuration = finite(options.minimumDuration, (domain[1] - domain[0]) / 8);
  let visible = clampRange(
    state.visibleRange || options.visibleRange || [domain[0], domain[0] + (domain[1] - domain[0]) / 3],
    domain,
    minimumDuration
  );
  const svg = createSvg(container, options.ariaLabel || "Linked overview and detail timeline", 430);
  const document = svg.ownerDocument;
  const overviewScale = createTimeScale(domain, [PLOT_START, PLOT_END]);
  let detailScale = createTimeScale(visible, [PLOT_START, PLOT_END]);
  const overviewY = 102;
  const detailY = 310;

  svg.append(
    svgElement(document, "line", { class: "tl-axis", x1: PLOT_START, y1: overviewY, x2: PLOT_END, y2: overviewY }),
    svgElement(document, "line", { class: "tl-axis", x1: PLOT_START, y1: detailY, x2: PLOT_END, y2: detailY })
  );

  if (options.showDensityTrack !== false) {
    const bins = aggregateTimeBuckets(data, { domain, interval: options.densityInterval || "week", reducer: "count" });
    const maximum = Math.max(1, ...bins.map((bin) => bin.value));
    bins.forEach((bin) => {
      const start = overviewScale(bin.start);
      const end = overviewScale(Math.min(bin.end, domain[1]));
      const height = (bin.value / maximum) * 38;
      svg.append(svgElement(document, "rect", {
        class: "tl-density-bar tl-density-bar--overview",
        x: start,
        y: overviewY - height,
        width: Math.max(2, end - start - 1),
        height
      }));
    });
  }

  const viewportX = overviewScale(visible[0]);
  const viewportEnd = overviewScale(visible[1]);
  const viewport = svgElement(document, "rect", {
    class: "tl-viewport",
    x: viewportX,
    y: overviewY - 36,
    width: Math.max(24, viewportEnd - viewportX),
    height: 72,
    rx: 8,
    tabindex: 0,
    role: "group",
    "aria-label": `Visible range ${formatUtc(visible[0], { date: true, year: true })} to ${formatUtc(visible[1], { date: true, year: true })}. Use Left and Right Arrow keys to pan.`
  });
  const startHandle = svgElement(document, "rect", {
    class: "tl-viewport-handle tl-viewport-handle--start",
    x: viewportX - 8,
    y: overviewY - 42,
    width: 16,
    height: 84,
    rx: 8,
    tabindex: 0,
    role: "slider",
    "aria-label": "Visible range start",
    "aria-valuemin": domain[0],
    "aria-valuemax": domain[1],
    "aria-valuenow": visible[0],
    "aria-valuetext": formatUtc(visible[0], { date: true, year: true })
  });
  const endHandle = svgElement(document, "rect", {
    class: "tl-viewport-handle tl-viewport-handle--end",
    x: viewportEnd - 8,
    y: overviewY - 42,
    width: 16,
    height: 84,
    rx: 8,
    tabindex: 0,
    role: "slider",
    "aria-label": "Visible range end",
    "aria-valuemin": domain[0],
    "aria-valuemax": domain[1],
    "aria-valuenow": visible[1],
    "aria-valuetext": formatUtc(visible[1], { date: true, year: true })
  });
  svg.append(viewport, startHandle, endHandle);

  const detailItems = data.map((event) => {
    const group = svgElement(document, "g", {
      class: "tl-event tl-event--detail",
      role: "button",
      "aria-label": eventLabel(event),
      "data-event-id": event.id
    });
    const hit = svgElement(document, "circle", { class: "tl-marker-hit", cx: 0, cy: detailY, r: 18 });
    const marker = svgElement(document, "circle", { class: "tl-marker", cx: 0, cy: detailY, r: 7 });
    group.dataset.eventId = event.id;
    group.append(hit, marker);
    addTitle(group, event.label);
    svg.append(group);
    return { event, group, hit, marker, time: toTime(event.time) };
  });

  let interactionState = state;
  let visibleNodes = [];
  let removeDetailInteractions = () => {};

  function bindDetailInteractions() {
    removeDetailInteractions();
    visibleNodes = detailItems
      .filter((item) => item.time >= visible[0] && item.time <= visible[1])
      .map((item) => item.group);
    removeDetailInteractions = attachEventInteractions(visibleNodes, {
      orientation: "horizontal",
      onPreview: (previewId) => api.setState({ previewId }),
      onFocus: (focusedId) => api.setState({ focusedId }),
      onSelect: (selectedId) => api.setState({ selectedId })
    });
    syncInteractive(visibleNodes, interactionState);
  }

  function updateVisibleGeometry() {
    detailScale = createTimeScale(visible, [PLOT_START, PLOT_END]);
    const nextViewportX = overviewScale(visible[0]);
    const nextViewportEnd = overviewScale(visible[1]);
    viewport.setAttribute("x", String(nextViewportX));
    viewport.setAttribute("width", String(Math.max(24, nextViewportEnd - nextViewportX)));
    viewport.setAttribute(
      "aria-label",
      `Visible range ${formatUtc(visible[0], { date: true, year: true })} to ${formatUtc(visible[1], { date: true, year: true })}. Use Left and Right Arrow keys to pan.`
    );
    startHandle.setAttribute("x", String(nextViewportX - 8));
    startHandle.setAttribute("aria-valuenow", String(visible[0]));
    startHandle.setAttribute("aria-valuetext", formatUtc(visible[0], { date: true, year: true }));
    endHandle.setAttribute("x", String(nextViewportEnd - 8));
    endHandle.setAttribute("aria-valuenow", String(visible[1]));
    endHandle.setAttribute("aria-valuetext", formatUtc(visible[1], { date: true, year: true }));

    detailItems.forEach((item) => {
      const isVisible = item.time >= visible[0] && item.time <= visible[1];
      item.group.style.display = isVisible ? "" : "none";
      item.group.tabIndex = -1;
      if (isVisible) {
        item.group.removeAttribute("aria-hidden");
        item.group.setAttribute("role", "button");
        item.group.setAttribute("aria-label", eventLabel(item.event));
      } else {
        item.group.setAttribute("aria-hidden", "true");
        item.group.removeAttribute("role");
        item.group.removeAttribute("aria-label");
      }
      if (!isVisible) return;
      const x = detailScale(item.time);
      item.hit.setAttribute("cx", String(x));
      item.marker.setAttribute("cx", String(x));
    });
    bindDetailInteractions();
  }

  function commitRange(nextRange) {
    visible = clampRange(nextRange, domain, minimumDuration);
    api.setState({ visibleRange: visible });
    updateVisibleGeometry();
    options.onRangeChange?.([...visible]);
  }

  function millisecondsPerClientPixel() {
    const renderedWidth = svg.getBoundingClientRect?.().width || WIDTH;
    const renderedPlotWidth = Math.max(1, renderedWidth * ((PLOT_END - PLOT_START) / WIDTH));
    return (domain[1] - domain[0]) / renderedPlotWidth;
  }

  api.register(attachPointerDrag(viewport, {
    onMove: (delta) => commitRange(panRange(visible, domain, delta.x * millisecondsPerClientPixel()))
  }));
  api.register(attachPointerDrag(startHandle, {
    onMove: (delta) =>
      commitRange(resizeRange(visible, domain, "start", delta.x * millisecondsPerClientPixel(), minimumDuration))
  }));
  api.register(attachPointerDrag(endHandle, {
    onMove: (delta) =>
      commitRange(resizeRange(visible, domain, "end", delta.x * millisecondsPerClientPixel(), minimumDuration))
  }));

  const keyboardStep = finite(options.keyboardStep, (domain[1] - domain[0]) / 30);
  const keyHandlers = [
    [viewport, (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        commitRange(panRange(visible, domain, (event.key === "ArrowLeft" ? -1 : 1) * keyboardStep));
      } else if (event.key === "Home") {
        event.preventDefault();
        commitRange([domain[0], domain[0] + (visible[1] - visible[0])]);
      } else if (event.key === "End") {
        event.preventDefault();
        commitRange([domain[1] - (visible[1] - visible[0]), domain[1]]);
      }
    }],
    [startHandle, (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        commitRange(resizeRange(visible, domain, "start", (event.key === "ArrowLeft" ? -1 : 1) * keyboardStep, minimumDuration));
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const nextStart = event.key === "Home" ? domain[0] : visible[1] - minimumDuration;
        commitRange(clampRange([nextStart, visible[1]], domain, minimumDuration, "end"));
      }
    }],
    [endHandle, (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        commitRange(resizeRange(visible, domain, "end", (event.key === "ArrowLeft" ? -1 : 1) * keyboardStep, minimumDuration));
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const nextEnd = event.key === "Home" ? visible[0] + minimumDuration : domain[1];
        commitRange(clampRange([visible[0], nextEnd], domain, minimumDuration, "start"));
      }
    }]
  ];
  keyHandlers.forEach(([node, listener]) => {
    node.addEventListener("keydown", listener);
    api.register(() => node.removeEventListener("keydown", listener));
  });

  data.forEach((event) => {
    const x = overviewScale(event.time);
    svg.append(svgElement(document, "circle", { class: "tl-marker tl-marker--overview", cx: x, cy: overviewY, r: 4 }));
  });

  updateVisibleGeometry();
  return {
    destroy: () => removeDetailInteractions(),
    syncState: (nextState) => {
      interactionState = nextState;
      syncInteractive(visibleNodes, nextState);
    }
  };
}

function drawSemanticFeed(container, options) {
  const data = [...(options.data || [])].sort((a, b) => toTime(a.time) - toTime(b.time));
  const orientation = options.orientation === "horizontal" ? "horizontal" : "vertical";
  const document = container.ownerDocument;
  const list = htmlElement(document, "ol", `tl-semantic-feed tl-semantic-feed--${orientation}`);
  list.setAttribute("aria-label", options.ariaLabel || "Chronological synthetic events");

  data.forEach((event) => {
    const item = htmlElement(document, "li", "tl-semantic-item");
    const marker = htmlElement(document, "span", "tl-semantic-marker");
    marker.setAttribute("aria-hidden", "true");
    const article = htmlElement(document, "article", "tl-semantic-card");
    const heading = htmlElement(document, "h3", "", event.label);
    const time = htmlElement(document, "time", "tl-semantic-time", formatUtc(event.time, { date: true }));
    time.dateTime = new Date(toTime(event.time)).toISOString();
    const detail = htmlElement(document, "p", "", `A fictional ${event.type} from ${event.series}.`);
    article.append(heading, time, detail);
    item.append(marker, article);
    list.append(item);
  });
  container.append(list);
  return { syncState: () => {} };
}

export function renderProportionalRun(container, options = {}) {
  return createRenderer(container, options, (target, next, state, api) => drawEventAxis(target, next, state, api, "run"));
}

export function renderEventRug(container, options = {}) {
  return createRenderer(container, options, (target, next, state, api) => drawEventAxis(target, next, state, api, "rug"));
}

export function renderVolumeLollipop(container, options = {}) {
  return createRenderer(container, options, (target, next, state, api) => drawBucketChart(target, next, state, api, "lollipop"));
}

export function renderStackedChangePlot(container, options = {}) {
  return createRenderer(container, options, drawStacked);
}

export function renderSeriesSwimlanes(container, options = {}) {
  return createRenderer(container, options, (target, next, state, api) => drawSwimlanes(target, next, state, api, false));
}

export function renderLifecycleRanges(container, options = {}) {
  return createRenderer(container, options, drawRanges);
}

export function renderDensityHistogram(container, options = {}) {
  return createRenderer(container, options, (target, next, state, api) => drawBucketChart(target, next, state, api, "histogram"));
}

export function renderCalendarHeatmap(container, options = {}) {
  return createRenderer(container, options, drawCalendar);
}

export function renderRelativeJourneys(container, options = {}) {
  return createRenderer(container, options, drawJourneys);
}

export function renderAlignedSmallMultiples(container, options = {}) {
  return createRenderer(container, options, (target, next, state, api) => drawSwimlanes(target, next, state, api, true));
}

export function renderOverviewDetail(container, options = {}) {
  return createRenderer(container, options, drawOverviewDetail);
}

export function renderSemanticFeed(container, options = {}) {
  return createRenderer(container, options, drawSemanticFeed);
}

export const rendererRegistry = Object.freeze({
  "proportional-run": renderProportionalRun,
  "event-rug": renderEventRug,
  "volume-lollipop": renderVolumeLollipop,
  "stacked-change-plot": renderStackedChangePlot,
  "series-swimlanes": renderSeriesSwimlanes,
  "lifecycle-ranges": renderLifecycleRanges,
  "density-histogram": renderDensityHistogram,
  "calendar-heatmap": renderCalendarHeatmap,
  "relative-journeys": renderRelativeJourneys,
  "aligned-small-multiples": renderAlignedSmallMultiples,
  "overview-detail": renderOverviewDetail,
  "semantic-feed": renderSemanticFeed
});

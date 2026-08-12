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
import { applyAppearanceStyles, normalizeAppearanceOptions } from "./core/appearance.js";
import { selectResponsiveTicks, estimatedLabelWidth, formatResponsiveTick } from "./core/ticks.js";

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

function createSvg(container, label, height = HEIGHT, appearance = normalizeAppearanceOptions()) {
  const document = container.ownerDocument;
  const svg = svgElement(document, "svg", {
    class: "tl-chart",
    viewBox: `0 0 ${WIDTH} ${height}`,
    role: "group",
    "aria-label": label,
    preserveAspectRatio: "xMidYMid meet"
  });
  applyAppearanceStyles(svg, appearance);
  svg.style.setProperty("--tl-chart-ratio", String(WIDTH / height));
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

function viewBoxHeight(svg) {
  return Number(svg.getAttribute("viewBox")?.split(/\s+/).at(-1)) || HEIGHT;
}

/**
 * Resolve the responsive tick set for a time axis and reserve the plot margins a
 * rotated label set needs. Returns the adjusted layout so callers build their
 * scale from the same numbers the labels were measured against.
 */
function resolveAxisTicks(svg, domain, interval, layout, options = {}) {
  const horizontal = layout.orientation !== "vertical";
  const renderedBox = svg.getBoundingClientRect?.() || {};
  const viewLength = horizontal ? WIDTH : viewBoxHeight(svg);
  const renderedLength = horizontal
    ? renderedBox.width || WIDTH
    : renderedBox.height || viewLength;
  const intervalName = typeof interval === "string" ? interval : "day";
  const candidates = createTicks(domain, interval || "day");
  const pick = (plot) =>
    selectResponsiveTicks(candidates, {
      domain,
      orientation: layout.orientation,
      interval: intervalName,
      labelAngle: options.labelAngle,
      renderedLength: renderedLength * ((plot.end - plot.start) / viewLength),
      measureLength: Math.max(1, plot.end - plot.start)
    });

  const next = { ...layout };
  let ticks = pick(next);
  const rotated = horizontal && ticks.some((tick) => tick.rotated);
  if (rotated) {
    const radians = Math.abs(ticks[0]?.labelAngle || 0) * Math.PI / 180;
    const longestLabel = Math.max(30, ...ticks.map((tick) => estimatedLabelWidth(tick.label)));
    // Every rotated label is anchored at its end, so the leftmost one reaches
    // back from the first tick. Reserve that inset instead of mirroring it.
    const start = Math.max(next.start, Math.ceil(longestLabel * Math.cos(radians)) + 8);
    if (start !== next.start) {
      // The plot just narrowed, so re-pick against the span labels actually get.
      next.start = start;
      ticks = pick(next);
    }
    if (options.reserveAxisMargin !== false) {
      const bottomMargin = 28 + longestLabel * Math.sin(radians) + 16 * Math.cos(radians);
      next.axis = Math.min(next.axis, viewBoxHeight(svg) - bottomMargin);
    }
  }
  return { ticks, layout: next };
}

/**
 * Draw tick marks and labels for an already-positioned time scale. Shared by the
 * standalone axis and by renderers that lay out their own lanes or viewports.
 */
function drawTimeTicks(svg, scale, ticks, layout) {
  const document = svg.ownerDocument;
  const horizontal = layout.orientation !== "vertical";
  const tickSize = layout.tickSize ?? 5;
  const labelOffset = layout.labelOffset ?? 0;

  ticks.forEach((tick, index) => {
    const position = scale(tick.value);
    const rotated = horizontal && tick.rotated;
    const angle = rotated ? tick.labelAngle || 0 : 0;
    const labelY = layout.axis + labelOffset + (rotated ? 20 : 24);
    const anchor = horizontal
      ? rotated
        ? angle < 0
          ? "end"
          : "start"
        : index === 0
          ? "start"
          : index === ticks.length - 1
            ? "end"
            : "middle"
      : "end";
    const label = svgElement(
      document,
      "text",
      {
        class: rotated ? "tl-tick-label tl-tick-label--rotated" : "tl-tick-label",
        x: horizontal ? position : layout.axis - 12,
        y: horizontal ? labelY : position + 4,
        "text-anchor": anchor,
        transform: rotated ? `rotate(${angle} ${position} ${labelY})` : undefined,
        "data-tick-time": Number(tick.value),
        "aria-label": tick.fullLabel
      },
      tick.label
    );
    addTitle(label, tick.fullLabel);
    svg.append(
      svgElement(document, "line", {
        class: "tl-tick",
        x1: horizontal ? position : layout.axis - tickSize,
        y1: horizontal ? layout.axis - tickSize : position,
        x2: horizontal ? position : layout.axis + tickSize,
        y2: horizontal ? layout.axis + tickSize : position
      }),
      label
    );
  });
}

function drawAxis(
  svg,
  domain,
  orientation,
  interval,
  coordinates = axisCoordinates(orientation),
  options = {}
) {
  const document = svg.ownerDocument;
  const horizontal = orientation !== "vertical";
  const { ticks, layout } = resolveAxisTicks(
    svg,
    domain,
    interval,
    { ...coordinates, orientation },
    options
  );
  const scale = createTimeScale(domain, [layout.start, layout.end]);
  svg.append(
    svgElement(document, "line", {
      class: "tl-axis",
      x1: horizontal ? layout.start : layout.axis,
      y1: horizontal ? layout.axis : layout.start,
      x2: horizontal ? layout.end : layout.axis,
      y2: horizontal ? layout.axis : layout.end
    })
  );

  drawTimeTicks(svg, scale, ticks, layout);

  return { scale, coordinates: layout, ticks };
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
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Proportional event timeline", HEIGHT, appearance);
  const { scale, coordinates } = drawAxis(
    svg,
    domain,
    orientation,
    options.interval || "week",
    axisCoordinates(orientation),
    appearance
  );
  const labels = layoutLabels(
    data.map((event) => {
      const geometry = markerGeometry(scale(event.time), {
        orientation,
        axis: coordinates.axis,
        markerAxisOffset: event.markerAxisOffset ?? appearance.markerAxisOffset
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
      labelGap: appearance.labelGap,
      maxLanes: options.maxLabelLanes ?? 3
    }
  );
  const nodes = [];

  data.forEach((event, index) => {
    const document = svg.ownerDocument;
    const geometry = markerGeometry(scale(event.time), {
      orientation,
      axis: coordinates.axis,
      markerAxisOffset: event.markerAxisOffset ?? appearance.markerAxisOffset
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
      const length = appearance.rugLength;
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
          r: appearance.markerRadius
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
    addTitle(group, eventLabel(event));
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
  const appearance = normalizeAppearanceOptions(options);
  const chartHeight = orientation === "vertical" ? 520 : 400;
  const svg = createSvg(container, options.ariaLabel || "Time bucket chart", chartHeight, appearance);
  svg.setAttribute("class", `tl-chart tl-chart--${variant}`);
  const chartCoordinates =
    orientation === "horizontal"
      ? { axis: chartHeight - 76, start: PLOT_START, end: PLOT_END }
      : { axis: 144, start: 56, end: chartHeight - 52 };
  const { scale, coordinates } = drawAxis(svg, domain, orientation, options.interval || "day", {
    ...chartCoordinates
  }, appearance);
  const maxValue = Math.max(1, ...bins.map((bin) => bin.value));
  const maxMagnitude =
    orientation === "horizontal"
      ? Math.max(24, coordinates.axis - 52 - appearance.aggregateHeadSize - 28)
      : Math.max(24, WIDTH - coordinates.axis - 58 - appearance.aggregateHeadSize - 40);
  const nodes = [];

  bins.forEach((bin, index) => {
    const document = svg.ownerDocument;
    const start = scale(bin.start);
    const end = scale(Math.min(bin.end, domain[1]));
    const center = (start + end) / 2;
    const magnitude = (bin.value / maxValue) * maxMagnitude;
    const group = svgElement(document, "g", {
      class: `tl-bucket tl-bucket--${variant}`,
      role: "button",
      "aria-label": `${bin.label}: ${bin.value}`,
      "data-event-id": `bucket-${index}`
    });
    group.dataset.eventId = `bucket-${index}`;

    if (variant === "lollipop") {
      const showValue = bin.value !== 0 && bins.length <= 16;
      if (orientation === "horizontal") {
        const elements = [
          svgElement(document, "line", { class: "tl-lollipop-stem", x1: center, y1: coordinates.axis, x2: center, y2: coordinates.axis - magnitude }),
          svgElement(document, "circle", { class: "tl-lollipop-head", cx: center, cy: coordinates.axis - magnitude, r: appearance.aggregateHeadSize })
        ];
        if (showValue) {
          elements.push(svgElement(document, "text", {
            class: "tl-value-label",
            x: center,
            y: coordinates.axis - magnitude - appearance.aggregateHeadSize - 8,
            "text-anchor": "middle"
          }, String(bin.value)));
        }
        group.append(...elements);
      } else {
        const elements = [
          svgElement(document, "line", { class: "tl-lollipop-stem", x1: coordinates.axis, y1: center, x2: coordinates.axis + magnitude, y2: center }),
          svgElement(document, "circle", { class: "tl-lollipop-head", cx: coordinates.axis + magnitude, cy: center, r: appearance.aggregateHeadSize })
        ];
        if (showValue) {
          elements.push(svgElement(document, "text", {
            class: "tl-value-label",
            x: coordinates.axis + magnitude + appearance.aggregateHeadSize + 8,
            y: center + 4,
            "text-anchor": "start"
          }, String(bin.value)));
        }
        group.append(...elements);
      }
    } else {
      const availableThickness = Math.max(3, Math.abs(end - start) - 3);
      const thickness = appearance.aggregateBarWidth
        ? Math.min(availableThickness, appearance.aggregateBarWidth)
        : availableThickness;
      const inset = (Math.abs(end - start) - thickness) / 2;
      group.append(
        svgElement(document, "rect", {
          class: "tl-density-bar",
          x: orientation === "horizontal" ? Math.min(start, end) + inset : coordinates.axis,
          y: orientation === "horizontal" ? coordinates.axis - magnitude : Math.min(start, end) + inset,
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
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Stacked change plot", HEIGHT, appearance);
  const { scale, coordinates } = drawAxis(svg, domain, "horizontal", interval, {
    ...axisCoordinates("horizontal"),
    axis: 302
  }, appearance);
  const maximum = Math.max(
    1,
    ...bins.map((bin) => types.reduce((sum, type) => sum + bin.items.filter((item) => item.type === type).length, 0))
  );
  const nodes = [];

  bins.forEach((bin, binIndex) => {
    const start = scale(bin.start);
    const end = scale(Math.min(bin.end, domain[1]));
    const availableWidth = Math.max(4, end - start - 3);
    const width = appearance.aggregateBarWidth
      ? Math.min(availableWidth, appearance.aggregateBarWidth)
      : availableWidth;
    const x = start + Math.max(1.5, (end - start - width) / 2);
    let y = coordinates.axis;
    types.forEach((type, typeIndex) => {
      const count = bin.items.filter((item) => item.type === type).length;
      const height = (count / maximum) * 190;
      if (height === 0) return;
      const node = svgElement(svg.ownerDocument, "rect", {
        class: `tl-stack-segment tl-type-${typeIndex + 1}`,
        x,
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
  const height = Math.max(320, series.length * 100 + 70) + (orientation === "horizontal" ? 96 : 0);
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Series swimlanes", height, appearance);
  const { scale, coordinates } = drawAxis(
    svg,
    domain,
    orientation,
    options.interval,
    orientation === "horizontal"
      ? { axis: height - 84, start: 180, end: 890 }
      : { axis: 74, start: 70, end: height - 50 },
    { labelAngle: appearance.labelAngle }
  );
  const laneStart = coordinates.start;
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
    const axisStart = orientation === "horizontal" ? laneStart : coordinates.start;
    const axisEnd = orientation === "horizontal" ? 890 : coordinates.end;
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
        markerAxisOffset: event.markerAxisOffset ?? appearance.markerAxisOffset
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
        svgElement(svg.ownerDocument, "circle", { class: "tl-marker", cx: geometry.x, cy: geometry.y, r: appearance.markerRadius })
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
  const height = Math.max(320, data.length * 74 + 70) + (orientation === "horizontal" ? 96 : 0);
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Lifecycle range timeline", height, appearance);
  const { scale, coordinates } = drawAxis(
    svg,
    domain,
    orientation,
    options.interval,
    orientation === "horizontal"
      ? { axis: height - 84, start: 210, end: 890 }
      : { axis: 74, start: 56, end: height - 40 },
    { labelAngle: appearance.labelAngle }
  );
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
        x: orientation === "horizontal" ? 18 : 138 + index * 190,
        y: orientation === "horizontal" ? cross + 4 : 28,
        "text-anchor": "start"
      }, item.label),
      svgElement(svg.ownerDocument, "rect", {
        class: "tl-range-bar",
        x: orientation === "horizontal" ? start : 124 + index * 190,
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

const WEEKDAY_ROWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CALENDAR_CELL = 34;
const CALENDAR_ORIGIN_X = 110;
const CALENDAR_ORIGIN_Y = 34;

function drawCalendar(container, options, state, api) {
  const data = options.data || [];
  const bins = aggregateTimeBuckets(data, { interval: "day", reducer: options.reducer || "count" });
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Calendar heatmap", 300, appearance);
  const document = svg.ownerDocument;
  const maximum = Math.max(1, ...bins.map((bin) => bin.value));
  const startWeek = bins.length ? (new Date(bins[0].start).getUTCDay() + 6) % 7 : 0;
  const nodes = [];

  // Sparse weekday gutter: labelling every row crowds a 28px cell.
  WEEKDAY_ROWS.forEach((name, row) => {
    if (row % 2 !== 0) return;
    svg.append(svgElement(document, "text", {
      class: "tl-tick-label tl-tick-label--weekday",
      x: CALENDAR_ORIGIN_X - 10,
      y: CALENDAR_ORIGIN_Y + row * CALENDAR_CELL + 18,
      "text-anchor": "end"
    }, name));
  });

  let lastMonth = null;
  bins.forEach((bin, index) => {
    const dayIndex = startWeek + index;
    const column = Math.floor(dayIndex / 7);
    const row = dayIndex % 7;
    const x = CALENDAR_ORIGIN_X + column * CALENDAR_CELL;
    const date = new Date(bin.start);
    const month = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (month !== lastMonth) {
      lastMonth = month;
      svg.append(svgElement(document, "text", {
        class: "tl-tick-label tl-tick-label--month",
        x,
        y: CALENDAR_ORIGIN_Y - 12,
        "text-anchor": "start"
      }, formatResponsiveTick(bin.start, "month", 960)));
    }
    const group = svgElement(document, "g", {
      class: "tl-calendar-cell",
      role: "button",
      "aria-label": `${bin.label}: ${bin.value}`,
      "data-event-id": `calendar-${index}`,
      transform: `translate(${x} ${CALENDAR_ORIGIN_Y + row * CALENDAR_CELL})`
    });
    group.dataset.eventId = `calendar-${index}`;
    group.style.setProperty("--tl-intensity", String(bin.value / maximum));
    group.append(svgElement(document, "rect", { width: 28, height: 28, rx: 5 }));
    addTitle(group, `${bin.label}: ${bin.value}`);
    svg.append(group);
    nodes.push(group);
  });

  bindInteractive(nodes, "horizontal", state, api);
  return { syncState: (nextState) => syncInteractive(nodes, nextState) };
}

function relativeDayTicks(maxDay) {
  const strides = [1, 2, 5, 7, 14, 28, 56, 91, 182, 364];
  const stride = strides.find((value) => maxDay / value <= 6) ?? Math.ceil(maxDay / 6);
  const ticks = [];
  for (let day = 0; day <= maxDay; day += stride) ticks.push(day);
  if (ticks.at(-1) !== maxDay) ticks.push(maxDay);
  return ticks;
}

function drawJourneys(container, options, state, api) {
  const data = options.data || [];
  const series = [...new Set(data.map((item) => item.series))];
  const maxDay = Math.max(1, ...data.map((item) => finite(item.day)));
  const scale = (day) => 200 + (finite(day) / maxDay) * 680;
  const axisY = 70 + Math.max(0, series.length - 1) * 90 + 46;
  const height = Math.max(320, axisY + 60);
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Relative journeys aligned to day zero", height, appearance);
  const nodes = [];

  series.forEach((name, seriesIndex) => {
    const y = 70 + seriesIndex * 90;
    svg.append(
      svgElement(svg.ownerDocument, "text", { class: "tl-lane-label", x: 18, y: y + 4 }, name),
      svgElement(svg.ownerDocument, "line", { class: "tl-axis tl-axis--lane", x1: 200, y1: y, x2: 880, y2: y })
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
        svgElement(svg.ownerDocument, "circle", { class: "tl-marker", cx: x, cy: y, r: appearance.markerRadius })
      );
      addTitle(group, item.label);
      svg.append(group);
      nodes.push(group);
    });
  });

  svg.append(
    svgElement(svg.ownerDocument, "line", {
      class: "tl-axis",
      x1: 200,
      y1: axisY,
      x2: 880,
      y2: axisY,
      stroke: appearance.axisColor,
      "stroke-width": appearance.axisWidth
    })
  );
  relativeDayTicks(maxDay).forEach((day) => {
    const x = scale(day);
    const label = svgElement(
      svg.ownerDocument,
      "text",
      { class: "tl-tick-label", x, y: axisY + 20, "text-anchor": "middle" },
      `Day ${day}`
    );
    addTitle(label, `Day ${day} after each journey started`);
    svg.append(
      svgElement(svg.ownerDocument, "line", {
        class: "tl-tick",
        x1: x,
        y1: axisY - 5,
        x2: x,
        y2: axisY + 5
      }),
      label
    );
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
  const appearance = normalizeAppearanceOptions(options);
  const svg = createSvg(container, options.ariaLabel || "Linked overview and detail timeline", 470, appearance);
  const document = svg.ownerDocument;
  const overviewY = 102;
  const detailY = 320;
  const overviewLayout = { orientation: "horizontal", axis: overviewY, start: PLOT_START, end: PLOT_END };
  const overviewAxis = resolveAxisTicks(svg, domain, options.overviewInterval || "month", overviewLayout, {
    labelAngle: appearance.labelAngle,
    reserveAxisMargin: false
  });
  const overviewScale = createTimeScale(domain, [overviewAxis.layout.start, overviewAxis.layout.end]);
  const detailStart = overviewAxis.layout.start;
  let detailScale = createTimeScale(visible, [detailStart, PLOT_END]);

  const detailAxisLine = svgElement(document, "line", {
    class: "tl-axis",
    x1: detailStart,
    y1: detailY,
    x2: PLOT_END,
    y2: detailY
  });
  const detailTicks = svgElement(document, "g", { class: "tl-axis-ticks" });
  svg.append(
    svgElement(document, "line", {
      class: "tl-axis",
      x1: overviewAxis.layout.start,
      y1: overviewY,
      x2: PLOT_END,
      y2: overviewY
    }),
    detailAxisLine,
    detailTicks
  );
  drawTimeTicks(svg, overviewScale, overviewAxis.ticks, { ...overviewAxis.layout, labelOffset: 32 });

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
    const marker = svgElement(document, "circle", { class: "tl-marker", cx: 0, cy: detailY, r: appearance.markerRadius });
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
    const detailAxis = resolveAxisTicks(
      svg,
      visible,
      options.interval,
      { orientation: "horizontal", axis: detailY, start: detailStart, end: PLOT_END },
      { labelAngle: appearance.labelAngle, reserveAxisMargin: false }
    );
    detailScale = createTimeScale(visible, [detailAxis.layout.start, detailAxis.layout.end]);
    detailAxisLine.setAttribute("x1", String(detailAxis.layout.start));
    detailTicks.replaceChildren();
    drawTimeTicks(detailTicks, detailScale, detailAxis.ticks, detailAxis.layout);
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
  applyAppearanceStyles(list, normalizeAppearanceOptions(options));
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

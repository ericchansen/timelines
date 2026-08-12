import { finite } from "./time.js";

export function markerGeometry(position, options = {}) {
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const axis = finite(options.axis, 0);
  const offset = finite(options.markerAxisOffset, 0);
  const primary = finite(position, 0);

  if (orientation === "vertical") {
    return {
      x: axis + offset,
      y: primary,
      axisX: axis,
      axisY: primary,
      connector: offset === 0 ? null : { x1: axis, y1: primary, x2: axis + offset, y2: primary }
    };
  }

  return {
    x: primary,
    y: axis + offset,
    axisX: primary,
    axisY: axis,
    connector: offset === 0 ? null : { x1: primary, y1: axis, x2: primary, y2: axis + offset }
  };
}

export function layoutLabels(items, options = {}) {
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const gap = Math.max(0, finite(options.labelGap, 18));
  const positiveGap = Math.max(gap, finite(options.positiveGap, gap));
  const negativeGap = Math.max(gap, finite(options.negativeGap, gap));
  const laneSize = Math.max(1, finite(options.laneSize, 34));
  const maxLanes = Math.max(1, Math.floor(finite(options.maxLanes, 4)));
  const occupied = new Map();

  return items
    .map((item, index) => ({ ...item, _index: index }))
    .sort((a, b) => finite(a.position) - finite(b.position))
    .map((item) => {
      const width = Math.max(1, finite(item.width, 120));
      const height = Math.max(1, finite(item.height, 30));
      const primarySize = orientation === "horizontal" ? width : height;
      const labelPosition = finite(item.labelPosition, finite(item.position));
      const start = labelPosition - primarySize / 2;
      const end = start + primarySize;
      const positive = orientation === "horizontal" ? "below" : "right";
      const negative = orientation === "horizontal" ? "above" : "left";
      const requested = item.placement;
      const side = requested === positive || requested === negative
        ? requested
        : item._index % 2 === 0
          ? negative
          : positive;
      const lanes = occupied.get(side) || Array(maxLanes).fill(-Infinity);
      let lane = lanes.findIndex((lastEnd) => start >= lastEnd + 6);
      if (lane < 0) lane = maxLanes - 1;
      lanes[lane] = Math.max(lanes[lane], end);
      occupied.set(side, lanes);
      const direction = side === positive ? 1 : -1;
      const sideGap = side === positive ? positiveGap : negativeGap;
      const markerCross = finite(item.markerCross, finite(options.axis, 0));
      const cross = markerCross + direction * (sideGap + lane * laneSize + (orientation === "horizontal" ? height : width) / 2);

      return {
        ...item,
        lane,
        side,
        x: orientation === "horizontal" ? labelPosition : cross,
        y: orientation === "horizontal" ? cross : labelPosition,
        width,
        height
      };
    })
    .sort((a, b) => a._index - b._index)
    .map(({ _index, ...item }) => item);
}

export function finiteBox(box = {}) {
  return {
    x: finite(box.x),
    y: finite(box.y),
    width: Math.max(0, finite(box.width)),
    height: Math.max(0, finite(box.height))
  };
}

export function labelTextWidth(text, characterWidth = 7.2, maximum = 190) {
  return Math.min(maximum, Math.max(64, String(text).length * characterWidth + 24));
}

import { normalizeDomain, toTime } from "./time.js";

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});
const NUMERIC_DATE = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  timeZone: "UTC"
});
const NUMERIC_MONTH = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
  timeZone: "UTC"
});
const FULL_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

export function formatResponsiveTick(value, interval = "day", renderedLength = 960, fallback = "") {
  const date = toTime(value);
  const tier = renderedLength >= 720 ? "wide" : renderedLength >= 420 ? "medium" : "narrow";
  if (!["day", "week", "month"].includes(interval)) return fallback || FULL_DATE.format(date);
  if (tier === "narrow") return interval === "month" ? NUMERIC_MONTH.format(date) : NUMERIC_DATE.format(date);
  if (interval === "month") return MONTH_YEAR.format(date);
  const compact = MONTH_DAY.format(date);
  return interval === "week" && tier === "wide" ? `Week of ${compact}` : compact;
}

export function estimatedLabelWidth(label) {
  return Math.max(30, String(label).length * 7 + 8);
}

export function selectResponsiveTicks(candidates, options = {}) {
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const renderedLength = Math.max(1, Number(options.renderedLength) || 1);
  // Label widths are estimated in user units, so overlap must be measured in the
  // same coordinate space. `renderedLength` is CSS pixels and only picks the
  // abbreviation tier; `measureLength` is the plot span the labels are drawn in.
  const measureLength = Math.max(1, Number(options.measureLength) || renderedLength);
  const interval = options.interval || "day";
  const labelScale = Math.max(1, Number(options.labelScale) || 1);
  const requestedAngle = Number(options.labelAngle);
  const labelAngle =
    orientation === "horizontal"
      ? Math.min(0, Math.max(-90, Number.isFinite(requestedAngle) ? requestedAngle : -45))
      : 0;
  if (!candidates.length) return [];
  const domain = normalizeDomain(options.domain || [candidates[0].value, candidates.at(-1).value]);
  const ticks = candidates.map((tick, index) => ({
    ...tick,
    index,
    label: formatResponsiveTick(tick.value, interval, renderedLength, tick.label),
    fullLabel: FULL_DATE.format(toTime(tick.value))
  }));
  const span = Math.max(1, domain[1] - domain[0]);
  const position = (tick) => ((toTime(tick.value) - domain[0]) / span) * measureLength;

  function labelBounds(tick, index) {
    const center = position(tick);
    const labelWidth = estimatedLabelWidth(tick.label) * labelScale;
    const radians = Math.abs(labelAngle) * Math.PI / 180;
    const footprint =
      orientation === "vertical"
        ? 22 * labelScale
        : labelWidth * Math.cos(radians) + 16 * Math.sin(radians);
    // Rotated labels are anchored at their end, so every one of them extends
    // back from its own tick. Unrotated labels are centred except at the edges.
    if (orientation === "horizontal" && labelAngle !== 0) return [center - footprint, center];
    if (orientation === "horizontal" && index === 0) return [center, center + footprint];
    if (orientation === "horizontal" && index === ticks.length - 1) return [center - footprint, center];
    return [center - footprint / 2, center + footprint / 2];
  }

  // Calendar-aware stride preferences. Keeping every 6th day is evenly spaced
  // but lands on a different weekday each time, which reads as arbitrary; the
  // next honest step up is a whole week. Week and month strides already land on
  // the same weekday or the same day of the month, so they need no snapping.
  const NICE_DAY_STRIDES = [1, 2, 7, 14, 28, 91, 182, 364];

  function niceStride(minimum) {
    if (interval !== "day") return minimum;
    return NICE_DAY_STRIDES.find((value) => value >= minimum) ?? minimum;
  }

  function select() {
    if (ticks.length <= 2) return ticks;
    const widest = Math.max(
      ...ticks.map((tick) => {
        const bounds = labelBounds(tick, tick.index);
        return bounds[1] - bounds[0];
      })
    );
    const pitch = Math.max(
      1,
      (position(ticks.at(-1)) - position(ticks[0])) / (ticks.length - 1)
    );
    // Keep every nth tick so the gaps read as a deliberate rhythm. Anchor the
    // stride on the last tick, which is always drawn, and let the remainder fall
    // next to the first tick where the axis already has an inset.
    const minimumStride = Math.max(1, Math.ceil((widest + 10) / pitch));
    // Snapping can overshoot badly (a 5-day minimum becomes a whole week), so
    // only take the calendar-friendly stride when it still leaves a usable axis.
    const snapped = niceStride(minimumStride);
    const stride = ticks.length / snapped >= 3 ? snapped : minimumStride;
    const selected = [];
    for (let index = ticks.length - 1; index > 0; index -= stride) selected.unshift(ticks[index]);
    const firstEnd = labelBounds(ticks[0], 0)[1];
    while (selected.length && labelBounds(selected[0], selected[0].index)[0] < firstEnd + 10) {
      selected.shift();
    }
    return [ticks[0], ...selected];
  }

  return select().map((tick) => ({
    ...tick,
    labelAngle,
    rotated: labelAngle !== 0
  }));
}

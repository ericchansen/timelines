export const DAY = 24 * 60 * 60 * 1000;
export const WEEK = 7 * DAY;

export function toTime(value) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) {
    throw new TypeError("Expected a finite timestamp");
  }
  return time;
}

export function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, finite(value, minimum)));
}

export function normalizeDomain(domain) {
  if (!Array.isArray(domain) || domain.length !== 2) {
    throw new TypeError("Expected a two-value time domain");
  }
  const first = toTime(domain[0]);
  const second = toTime(domain[1]);
  return first <= second ? [first, second] : [second, first];
}

export function extent(items, accessor = (item) => item.time) {
  const values = items.map(accessor).map(toTime);
  if (!values.length) {
    const now = Date.UTC(2026, 0, 1);
    return [now, now + DAY];
  }
  return [Math.min(...values), Math.max(...values)];
}

export function createTimeScale(domain, output = [0, 1]) {
  const [start, end] = normalizeDomain(domain);
  const [outputStart, outputEnd] = output.map((value) => finite(value));
  const inputSpan = end - start;
  const outputSpan = outputEnd - outputStart;

  function scale(value) {
    if (inputSpan === 0) {
      return outputStart + outputSpan / 2;
    }
    return outputStart + clamp((toTime(value) - start) / inputSpan, 0, 1) * outputSpan;
  }

  scale.invert = (position) => {
    if (outputSpan === 0) {
      return start + inputSpan / 2;
    }
    return start + clamp((finite(position) - outputStart) / outputSpan, 0, 1) * inputSpan;
  };
  scale.domain = () => [start, end];
  scale.range = () => [outputStart, outputEnd];
  return scale;
}

function utcDayFloor(value) {
  const date = new Date(toTime(value));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcWeekFloor(value) {
  const day = utcDayFloor(value);
  const weekday = new Date(day).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  return day - mondayOffset * DAY;
}

function utcMonthFloor(value) {
  const date = new Date(toTime(value));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function utcMonthOffset(value, step = 1) {
  const date = new Date(toTime(value));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + step, 1);
}

export function createUtcInterval(kind = "day", custom) {
  if (typeof kind === "object" && kind) {
    custom = kind;
    kind = "custom";
  }

  const definitions = {
    day: {
      floor: utcDayFloor,
      offset: (value, step = 1) => utcDayFloor(value) + step * DAY,
      label: (value) =>
        new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        }).format(toTime(value))
    },
    week: {
      floor: utcWeekFloor,
      offset: (value, step = 1) => utcWeekFloor(value) + step * WEEK,
      label: (value) =>
        `Week of ${new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        }).format(toTime(value))}`
    },
    month: {
      floor: utcMonthFloor,
      offset: utcMonthOffset,
      label: (value) =>
        new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC"
        }).format(toTime(value))
    }
  };

  const definition = kind === "custom" ? custom : definitions[kind];
  if (!definition || typeof definition.floor !== "function" || typeof definition.offset !== "function") {
    throw new TypeError("Expected day, week, month, or a custom interval");
  }

  return {
    kind,
    floor: (value) => toTime(definition.floor(toTime(value))),
    offset: (value, step = 1) => toTime(definition.offset(toTime(value), step)),
    label:
      typeof definition.label === "function"
        ? (value) => String(definition.label(toTime(value)))
        : (value) => formatUtc(value, { date: true }),
    range(domain) {
      const [start, end] = normalizeDomain(domain);
      const boundaries = [];
      let cursor = this.floor(start);
      let guard = 0;
      while (cursor <= end && guard < 10000) {
        boundaries.push(cursor);
        const next = this.offset(cursor, 1);
        if (!Number.isFinite(next) || next <= cursor) {
          throw new RangeError("Interval offset must advance time");
        }
        cursor = next;
        guard += 1;
      }
      if (boundaries.length === 0 || boundaries[boundaries.length - 1] < end) {
        boundaries.push(cursor);
      }
      return boundaries;
    }
  };
}

export function createTicks(domain, interval = "day") {
  const definition = createUtcInterval(interval);
  const [start, end] = normalizeDomain(domain);
  return definition
    .range([start, end])
    .filter((value) => value >= start && value <= end)
    .map((value) => ({ value, label: definition.label(value) }));
}

export function aggregateTimeBuckets(items, options = {}) {
  const interval = createUtcInterval(options.interval || "day", options.customInterval);
  const timeAccessor = options.time || ((item) => item.time);
  const valueAccessor = options.value || ((item) => item.value ?? 1);
  const rawDomain = options.domain || extent(items, timeAccessor);
  const [domainStart, domainEnd] = normalizeDomain(rawDomain);
  const first = interval.floor(domainStart);
  const starts = interval.range([first, domainEnd]);
  const bins = starts.map((start) => ({
    start,
    end: interval.offset(start, 1),
    label: interval.label(start),
    items: [],
    count: 0,
    value: 0
  }));

  items.forEach((item) => {
    const time = toTime(timeAccessor(item));
    const bin = bins.find(
      (candidate, index) =>
        time >= candidate.start &&
        (time < candidate.end || (time === domainEnd && index === bins.length - 1))
    );
    if (bin) {
      bin.items.push(item);
    }
  });

  const reducer = options.reducer || "count";
  bins.forEach((bin) => {
    const values = bin.items.map(valueAccessor).map((value) => finite(value));
    bin.count = bin.items.length;
    if (typeof reducer === "function") {
      bin.value = finite(reducer(values.slice(), bin.items.slice(), { ...bin, items: undefined }), 0);
    } else if (reducer === "sum") {
      bin.value = values.reduce((sum, value) => sum + value, 0);
    } else if (reducer === "average") {
      bin.value = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    } else {
      bin.value = values.length;
    }
  });

  return bins;
}

export function formatUtc(value, options = {}) {
  const settings = {
    month: options.date ? "short" : undefined,
    day: options.date ? "numeric" : undefined,
    year: options.year ? "numeric" : undefined,
    hour: options.time === false ? undefined : "2-digit",
    minute: options.time === false ? undefined : "2-digit",
    second: options.seconds ? "2-digit" : undefined,
    hour12: false,
    timeZone: "UTC"
  };
  return `${new Intl.DateTimeFormat("en-US", settings).format(toTime(value))} UTC`;
}

export function formatRangeUtc(domain) {
  const [start, end] = normalizeDomain(domain);
  return `${formatUtc(start)} to ${formatUtc(end)}`;
}

export function clampRange(range, bounds, minimumDuration = 0, anchor = "center") {
  const [boundStart, boundEnd] = normalizeDomain(bounds);
  let [start, end] = normalizeDomain(range);
  const available = boundEnd - boundStart;
  const minimum = clamp(minimumDuration, 0, available);

  if (anchor === "start") {
    start = clamp(start, boundStart, boundEnd);
    end = clamp(end, start + minimum, boundEnd);
    if (end - start < minimum) start = end - minimum;
    return [start, end];
  }

  if (anchor === "end") {
    end = clamp(end, boundStart, boundEnd);
    start = clamp(start, boundStart, end - minimum);
    if (end - start < minimum) end = start + minimum;
    return [start, end];
  }

  const duration = clamp(Math.max(end - start, minimum), 0, available);
  const midpoint = (start + end) / 2;
  start = midpoint - duration / 2;
  end = midpoint + duration / 2;
  if (start < boundStart) {
    end += boundStart - start;
    start = boundStart;
  }
  if (end > boundEnd) {
    start -= end - boundEnd;
    end = boundEnd;
  }
  return [start, end];
}

export function panRange(range, bounds, delta) {
  const [boundStart, boundEnd] = normalizeDomain(bounds);
  const [start, end] = normalizeDomain(range);
  const duration = end - start;
  if (duration >= boundEnd - boundStart) return [boundStart, boundEnd];
  const nextStart = clamp(start + finite(delta), boundStart, boundEnd - duration);
  return [nextStart, nextStart + duration];
}

export function resizeRange(range, bounds, edge, delta, minimumDuration = 0) {
  const [start, end] = normalizeDomain(range);
  if (edge === "start") {
    return clampRange([start + finite(delta), end], bounds, minimumDuration, "end");
  }
  if (edge === "end") {
    return clampRange([start, end + finite(delta)], bounds, minimumDuration, "start");
  }
  throw new TypeError('Expected edge to be "start" or "end"');
}

export function ensureTimeVisible(range, bounds, value) {
  const [start, end] = normalizeDomain(range);
  const time = toTime(value);
  if (time < start) return panRange(range, bounds, time - start);
  if (time > end) return panRange(range, bounds, time - end);
  return [start, end];
}

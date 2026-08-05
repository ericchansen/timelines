(function initTimelineKit(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.TimelineKit = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createTimelineKit() {
  "use strict";

  function toMillis(value) {
    const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new TypeError("Expected a valid timestamp");
    }

    return milliseconds;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalizeRange(range) {
    if (!Array.isArray(range) || range.length !== 2) {
      throw new TypeError("Expected a two-value time range");
    }

    const first = toMillis(range[0]);
    const second = toMillis(range[1]);
    return first <= second ? [first, second] : [second, first];
  }

  function positionForTime(value, range) {
    const time = toMillis(value);
    const [start, end] = normalizeRange(range);

    if (start === end) {
      return 0;
    }

    return clamp((time - start) / (end - start), 0, 1);
  }

  function timeForPosition(position, range) {
    const [start, end] = normalizeRange(range);
    return start + clamp(Number(position), 0, 1) * (end - start);
  }

  function clampRange(range, bounds, minimumDuration, anchor) {
    const [boundStart, boundEnd] = normalizeRange(bounds);
    let [start, end] = normalizeRange(range);
    const availableDuration = boundEnd - boundStart;
    const requiredDuration = clamp(Number(minimumDuration) || 0, 0, availableDuration);
    const mode = anchor || "center";

    if (mode === "start") {
      start = clamp(start, boundStart, boundEnd);
      end = clamp(end, start, boundEnd);

      if (end - start < requiredDuration) {
        end = start + requiredDuration;

        if (end > boundEnd) {
          end = boundEnd;
          start = end - requiredDuration;
        }
      }

      return [start, end];
    }

    if (mode === "end") {
      end = clamp(end, boundStart, boundEnd);
      start = clamp(start, boundStart, end);

      if (end - start < requiredDuration) {
        start = end - requiredDuration;

        if (start < boundStart) {
          start = boundStart;
          end = start + requiredDuration;
        }
      }

      return [start, end];
    }

    if (end - start >= availableDuration) {
      return [boundStart, boundEnd];
    }

    if (end - start < requiredDuration) {
      const midpoint = (start + end) / 2;
      start = midpoint - requiredDuration / 2;
      end = midpoint + requiredDuration / 2;
    }

    if (start < boundStart) {
      end += boundStart - start;
      start = boundStart;
    }

    if (end > boundEnd) {
      start -= end - boundEnd;
      end = boundEnd;
    }

    start = clamp(start, boundStart, boundEnd);
    end = clamp(end, boundStart, boundEnd);
    return [start, end];
  }

  function panRange(range, bounds, delta) {
    const [boundStart, boundEnd] = normalizeRange(bounds);
    const [start, end] = normalizeRange(range);
    const duration = end - start;

    if (duration >= boundEnd - boundStart) {
      return [boundStart, boundEnd];
    }

    const nextStart = clamp(start + Number(delta), boundStart, boundEnd - duration);
    return [nextStart, nextStart + duration];
  }

  function resizeRange(range, bounds, edge, delta, minimumDuration) {
    const [start, end] = normalizeRange(range);

    if (edge === "start") {
      return clampRange(
        [start + Number(delta), end],
        bounds,
        minimumDuration,
        "end"
      );
    }

    if (edge === "end") {
      return clampRange(
        [start, end + Number(delta)],
        bounds,
        minimumDuration,
        "start"
      );
    }

    throw new TypeError('Expected edge to be "start" or "end"');
  }

  function rangeContains(range, value) {
    const [start, end] = normalizeRange(range);
    const time = toMillis(value);
    return time >= start && time <= end;
  }

  function ensureTimeVisible(range, bounds, value) {
    const [start, end] = normalizeRange(range);
    const time = toMillis(value);

    if (time < start) {
      return panRange([start, end], bounds, time - start);
    }

    if (time > end) {
      return panRange([start, end], bounds, time - end);
    }

    return [start, end];
  }

  function formatUtc(value, options) {
    const settings = options || {};
    const formatterOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC"
    };

    if (settings.seconds) {
      formatterOptions.second = "2-digit";
    }

    if (settings.date) {
      formatterOptions.month = "short";
      formatterOptions.day = "numeric";
    }

    return `${new Intl.DateTimeFormat("en-US", formatterOptions).format(toMillis(value))} UTC`;
  }

  function formatRangeUtc(range) {
    const [start, end] = normalizeRange(range);
    return `${formatUtc(start)} to ${formatUtc(end)}`;
  }

  function setTimePosition(element, value, range) {
    element.style.setProperty("--tl-position", `${positionForTime(value, range) * 100}%`);
  }

  function applySelectionState(elements, selectedId, getId) {
    elements.forEach((element, index) => {
      const id = getId ? getId(element, index) : element.dataset.eventId;
      const selected = id === selectedId;
      element.dataset.selected = String(selected);
      element.setAttribute("aria-selected", String(selected));
    });
  }

  function createRovingFocus(elements, options) {
    const items = Array.from(elements);
    const settings = options || {};
    let currentIndex = clamp(Number(settings.initialIndex) || 0, 0, Math.max(items.length - 1, 0));
    const removers = [];

    function updateTabStops() {
      items.forEach((item, index) => {
        item.tabIndex = index === currentIndex ? 0 : -1;
      });
    }

    function moveTo(nextIndex) {
      currentIndex = clamp(nextIndex, 0, items.length - 1);
      updateTabStops();
      items[currentIndex].focus();

      if (settings.onFocus) {
        settings.onFocus(currentIndex, items[currentIndex]);
      }
    }

    items.forEach((item, index) => {
      const onFocus = () => {
        currentIndex = index;
        updateTabStops();

        if (settings.onFocus) {
          settings.onFocus(index, item);
        }
      };

      const onClick = () => {
        currentIndex = index;
        updateTabStops();

        if (settings.onSelect) {
          settings.onSelect(index, item);
        }
      };

      const onKeyDown = (event) => {
        const previousKeys = settings.orientation === "horizontal"
          ? ["ArrowLeft"]
          : settings.orientation === "vertical"
            ? ["ArrowUp"]
            : ["ArrowLeft", "ArrowUp"];
        const nextKeys = settings.orientation === "horizontal"
          ? ["ArrowRight"]
          : settings.orientation === "vertical"
            ? ["ArrowDown"]
            : ["ArrowRight", "ArrowDown"];

        if (previousKeys.includes(event.key)) {
          event.preventDefault();
          moveTo(currentIndex - 1);
        } else if (nextKeys.includes(event.key)) {
          event.preventDefault();
          moveTo(currentIndex + 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          moveTo(0);
        } else if (event.key === "End") {
          event.preventDefault();
          moveTo(items.length - 1);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();

          if (settings.onSelect) {
            settings.onSelect(currentIndex, items[currentIndex]);
          }
        }
      };

      item.addEventListener("focus", onFocus);
      item.addEventListener("click", onClick);
      item.addEventListener("keydown", onKeyDown);
      removers.push(() => item.removeEventListener("focus", onFocus));
      removers.push(() => item.removeEventListener("click", onClick));
      removers.push(() => item.removeEventListener("keydown", onKeyDown));
    });

    updateTabStops();

    return {
      getIndex() {
        return currentIndex;
      },
      setIndex(index, shouldFocus) {
        currentIndex = clamp(Number(index), 0, items.length - 1);
        updateTabStops();

        if (shouldFocus) {
          items[currentIndex].focus();
        }
      },
      destroy() {
        removers.forEach((remove) => remove());
      }
    };
  }

  function attachPointerDrag(element, handlers) {
    function onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      const context = handlers.onStart ? handlers.onStart(event) : {};

      if (context === false) {
        return;
      }

      event.preventDefault();

      if (element.tabIndex >= 0 && typeof element.focus === "function") {
        element.focus({ preventScroll: true });
      }

      element.setPointerCapture(event.pointerId);

      function onPointerMove(moveEvent) {
        if (handlers.onMove) {
          handlers.onMove(moveEvent, context);
        }
      }

      function finish(endEvent) {
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerup", finish);
        element.removeEventListener("pointercancel", finish);

        if (element.hasPointerCapture(endEvent.pointerId)) {
          element.releasePointerCapture(endEvent.pointerId);
        }

        if (handlers.onEnd) {
          handlers.onEnd(endEvent, context);
        }
      }

      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointerup", finish);
      element.addEventListener("pointercancel", finish);
    }

    element.addEventListener("pointerdown", onPointerDown);
    return () => element.removeEventListener("pointerdown", onPointerDown);
  }

  function applyEmbedMode(documentObject) {
    const documentRef = documentObject || document;
    const params = new URLSearchParams(documentRef.defaultView.location.search);

    if (params.get("embed") === "1") {
      documentRef.body.classList.add("tl-embed");
    }
  }

  return Object.freeze({
    applyEmbedMode,
    applySelectionState,
    attachPointerDrag,
    clamp,
    clampRange,
    createRovingFocus,
    ensureTimeVisible,
    formatRangeUtc,
    formatUtc,
    normalizeRange,
    panRange,
    positionForTime,
    rangeContains,
    resizeRange,
    setTimePosition,
    timeForPosition,
    toMillis
  });
});

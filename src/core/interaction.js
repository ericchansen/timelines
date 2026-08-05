export const DEFAULT_EVENT_COMMANDS = [
  "Arrow keys move focus along time",
  "Home and End move to the first or last event",
  "Enter or Space pins the focused event",
  "Escape clears the pinned event"
];

export function createInteractionState(ids = [], initial = {}) {
  let eventIds = [...ids];
  let state = {
    focusedId: eventIds.includes(initial.focusedId) ? initial.focusedId : null,
    previewId: null,
    selectedId: eventIds.includes(initial.selectedId) ? initial.selectedId : null
  };

  return {
    updateIds(nextIds) {
      eventIds = [...nextIds];
      state = {
        focusedId: eventIds.includes(state.focusedId) ? state.focusedId : null,
        previewId: eventIds.includes(state.previewId) ? state.previewId : null,
        selectedId: eventIds.includes(state.selectedId) ? state.selectedId : null
      };
      return this.getState();
    },
    set(patch) {
      state = { ...state, ...patch };
      return this.getState();
    },
    getState() {
      return { ...state };
    }
  };
}

export function attachEventInteractions(nodes, options = {}) {
  const items = Array.from(nodes);
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const previousKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const removers = [];
  let index = Math.max(0, items.findIndex((item) => item.tabIndex === 0));

  function focusAt(nextIndex) {
    index = Math.max(0, Math.min(items.length - 1, nextIndex));
    items.forEach((item, itemIndex) => {
      item.tabIndex = itemIndex === index ? 0 : -1;
    });
    items[index]?.focus();
  }

  items.forEach((node, nodeIndex) => {
    node.tabIndex = nodeIndex === index ? 0 : -1;
    const id = node.dataset.eventId;
    const listeners = {
      pointerenter: () => options.onPreview?.(id),
      pointerleave: () => options.onPreview?.(null),
      focus: () => {
        index = nodeIndex;
        items.forEach((item, itemIndex) => {
          item.tabIndex = itemIndex === index ? 0 : -1;
        });
        options.onFocus?.(id);
        options.onPreview?.(id);
      },
      blur: () => options.onPreview?.(null),
      click: () => options.onSelect?.(id),
      keydown: (event) => {
        if (event.key === previousKey) {
          event.preventDefault();
          focusAt(index - 1);
        } else if (event.key === nextKey) {
          event.preventDefault();
          focusAt(index + 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          focusAt(0);
        } else if (event.key === "End") {
          event.preventDefault();
          focusAt(items.length - 1);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          options.onSelect?.(id);
        } else if (event.key === "Escape") {
          event.preventDefault();
          options.onSelect?.(null);
        }
      }
    };

    Object.entries(listeners).forEach(([type, listener]) => {
      node.addEventListener(type, listener);
      removers.push(() => node.removeEventListener(type, listener));
    });
  });

  return () => removers.splice(0).forEach((remove) => remove());
}

export function attachPointerDrag(element, options = {}) {
  let active = null;

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    active = { id: event.pointerId, x: event.clientX, y: event.clientY };
    element.setPointerCapture?.(event.pointerId);
    element.focus?.();
    options.onStart?.(event);
  };
  const onPointerMove = (event) => {
    if (!active || event.pointerId !== active.id) return;
    const delta = { x: event.clientX - active.x, y: event.clientY - active.y };
    active = { id: active.id, x: event.clientX, y: event.clientY };
    options.onMove?.(delta, event);
  };
  const onPointerEnd = (event) => {
    if (!active || event.pointerId !== active.id) return;
    element.releasePointerCapture?.(event.pointerId);
    active = null;
    options.onEnd?.(event);
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerEnd);
  element.addEventListener("pointercancel", onPointerEnd);

  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerEnd);
    element.removeEventListener("pointercancel", onPointerEnd);
  };
}

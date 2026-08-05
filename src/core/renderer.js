function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

export function createRenderer(container, initialOptions, draw) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("Expected a DOM container");
  }

  let options = cloneValue(initialOptions || {});
  let state = {
    selectedId: options.selectedId ?? null,
    previewId: null,
    focusedId: null,
    orientation: options.orientation === "vertical" ? "vertical" : "horizontal"
  };
  let destroyed = false;
  let cleanup = [];
  let syncState = () => {};
  let resizeFrame = null;

  const api = {
    setState(patch) {
      if (destroyed) return;
      state = { ...state, ...patch };
      syncState({ ...state });
    },
    register(remove) {
      if (typeof remove === "function") cleanup.push(remove);
    }
  };

  function render() {
    if (destroyed) return;
    cleanup.splice(0).forEach((remove) => remove());
    container.replaceChildren();
    const result = draw(container, cloneValue(options), { ...state }, api) || {};
    syncState = typeof result.syncState === "function" ? result.syncState : () => {};
    if (typeof result.destroy === "function") cleanup.push(result.destroy);
    syncState({ ...state });
  }

  const view = container.ownerDocument?.defaultView || globalThis;
  const ResizeObserverClass = view.ResizeObserver;
  let lastWidth = container.clientWidth || 0;
  let lastHeight = container.clientHeight || 0;
  const observer =
    typeof ResizeObserverClass === "function"
      ? new ResizeObserverClass((entries) => {
          const box = entries[0]?.contentRect;
          const width = box?.width || container.clientWidth || 0;
          const height = box?.height || container.clientHeight || 0;
          if (Math.abs(width - lastWidth) < 1 && Math.abs(height - lastHeight) < 1) return;
          lastWidth = width;
          lastHeight = height;
          if (resizeFrame !== null) view.cancelAnimationFrame?.(resizeFrame);
          resizeFrame = view.requestAnimationFrame
            ? view.requestAnimationFrame(() => {
                resizeFrame = null;
                render();
              })
            : null;
          if (resizeFrame === null) render();
        })
      : null;
  observer?.observe(container);
  render();

  return Object.freeze({
    update(nextOptions = {}) {
      if (destroyed) return;
      options = { ...options, ...cloneValue(nextOptions) };
      state.orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
      const ids = (options.data || []).map((item) => item.id);
      if (state.selectedId && !ids.includes(state.selectedId)) state.selectedId = null;
      if (state.focusedId && !ids.includes(state.focusedId)) state.focusedId = null;
      if (state.previewId && !ids.includes(state.previewId)) state.previewId = null;
      render();
    },
    setSelection(id) {
      if (destroyed) return;
      state.selectedId = id ?? null;
      syncState({ ...state });
    },
    getState() {
      return cloneValue({ ...state, destroyed });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      if (resizeFrame !== null) view.cancelAnimationFrame?.(resizeFrame);
      cleanup.splice(0).forEach((remove) => remove());
      syncState = () => {};
      container.replaceChildren();
    }
  });
}

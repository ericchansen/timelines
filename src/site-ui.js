import { attachThemeToggle } from "./core/theme.js";

const SOURCE_URL = "https://github.com/ericchansen/timelines";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

export function mountSiteHeader(container, { basePath = "./" } = {}) {
  if (!container || typeof container.prepend !== "function") {
    throw new TypeError("Expected a page container");
  }

  const header = container.ownerDocument.createElement("header");
  header.className = "tl-site-header";
  header.innerHTML = `
    <nav class="tl-toolbar tl-site-toolbar" aria-label="Site">
      <button class="tl-button" type="button" aria-label="Dark theme" aria-pressed="false" data-theme-toggle title="Dark theme">
        <span aria-hidden="true">◐</span>
      </button>
      <a href="${basePath}docs/index.html">Docs</a>
      <a href="${SOURCE_URL}">Source</a>
    </nav>
  `;
  container.prepend(header);

  const removeThemeToggle = attachThemeToggle(header.querySelector("[data-theme-toggle]"));
  let destroyed = false;

  return Object.freeze({
    element: header,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      removeThemeToggle();
      header.remove();
    }
  });
}

export function componentHeadingMarkup(component, {
  headingLevel = "h2",
  headingId,
  linkHref,
  linkText,
  linkDirection = "forward"
} = {}) {
  if (headingLevel !== "h1" && headingLevel !== "h2") {
    throw new TypeError("Expected an h1 or h2 component heading");
  }
  const id = headingId ? ` id="${escapeHtml(headingId)}"` : "";
  const linkClass = linkDirection === "back"
    ? "tl-detail-link tl-detail-link--back"
    : "tl-detail-link";
  return `
    <header class="tl-component-heading">
      <${headingLevel}${id}>${escapeHtml(component.title)}</${headingLevel}>
      <a class="${linkClass}" href="${escapeHtml(linkHref)}">${escapeHtml(linkText)}</a>
      <p>${escapeHtml(component.summary)}</p>
    </header>
  `;
}

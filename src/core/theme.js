export function attachThemeToggle(button, {
  root = document.documentElement,
  matchMedia = globalThis.matchMedia
} = {}) {
  if (!button) throw new TypeError("Expected a theme toggle button");

  const preferredTheme =
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  let currentTheme = root.dataset.theme === "dark" || root.dataset.theme === "light"
    ? root.dataset.theme
    : preferredTheme;
  const label = button.querySelector?.("[data-theme-label]");

  function sync() {
    root.dataset.theme = currentTheme;
    button.setAttribute("aria-pressed", String(currentTheme === "dark"));
    const action = currentTheme === "dark" ? "Light theme" : "Dark theme";
    button.setAttribute("aria-label", action);
    button.setAttribute("title", action);
    if (label) label.textContent = action;
  }

  function toggle() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    sync();
  }

  sync();
  button.addEventListener("click", toggle);
  return () => button.removeEventListener("click", toggle);
}

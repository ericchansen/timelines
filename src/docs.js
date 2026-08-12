import { mountSiteHeader } from "./site-ui.js";

const page = document.querySelector("main.tl-page");
if (!page) throw new Error("Expected a documentation page");

const siteHeader = mountSiteHeader(page, { basePath: "../" });
window.addEventListener("pagehide", () => siteHeader.destroy(), { once: true });

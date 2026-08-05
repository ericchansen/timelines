"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  clampRange,
  ensureTimeVisible,
  formatRangeUtc,
  formatUtc,
  panRange,
  positionForTime,
  rangeContains,
  resizeRange,
  setTimePosition,
  timeForPosition
} = require("../src/timeline/timeline.js");

const root = path.resolve(__dirname, "..");
let passed = 0;

function test(name, callback) {
  callback();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

test("converts timestamps to clamped positions", () => {
  const range = ["2026-01-15T10:00:00Z", "2026-01-15T11:00:00Z"];
  assert.equal(positionForTime("2026-01-15T10:30:00Z", range), 0.5);
  assert.equal(positionForTime("2026-01-15T09:00:00Z", range), 0);
  assert.equal(positionForTime("2026-01-15T12:00:00Z", range), 1);
  assert.equal(
    timeForPosition(0.25, range),
    Date.parse("2026-01-15T10:15:00Z")
  );
});

test("clamps ranges and enforces a minimum duration", () => {
  const bounds = [0, 100];
  assert.deepEqual(clampRange([-20, 30], bounds, 10), [0, 50]);
  assert.deepEqual(clampRange([92, 95], bounds, 20, "start"), [80, 100]);
  assert.deepEqual(clampRange([45, 46], bounds, 10, "end"), [36, 46]);
});

test("pans while preserving duration and respecting bounds", () => {
  assert.deepEqual(panRange([20, 50], [0, 100], 15), [35, 65]);
  assert.deepEqual(panRange([20, 50], [0, 100], -40), [0, 30]);
  assert.deepEqual(panRange([70, 100], [0, 100], 30), [70, 100]);
});

test("resizes either viewport edge with a minimum duration", () => {
  assert.deepEqual(resizeRange([20, 80], [0, 100], "start", 40, 30), [50, 80]);
  assert.deepEqual(resizeRange([20, 80], [0, 100], "end", -50, 30), [20, 50]);
  assert.deepEqual(resizeRange([20, 80], [0, 100], "end", 50, 30), [20, 100]);
});

test("auto-pans to reveal a selected event", () => {
  assert.deepEqual(ensureTimeVisible([20, 50], [0, 100], 75), [45, 75]);
  assert.deepEqual(ensureTimeVisible([20, 50], [0, 100], 10), [10, 40]);
  assert.deepEqual(ensureTimeVisible([20, 50], [0, 100], 35), [20, 50]);
  assert.equal(rangeContains([20, 50], 35), true);
});

test("formats explicit UTC labels", () => {
  assert.match(formatUtc("2026-01-15T10:15:30Z"), /UTC$/);
  assert.match(
    formatRangeUtc(["2026-01-15T10:00:00Z", "2026-01-15T11:00:00Z"]),
    /UTC to .* UTC$/
  );
});

test("writes reusable percentage positions", () => {
  const properties = new Map();
  const element = {
    style: {
      setProperty(name, value) {
        properties.set(name, value);
      }
    }
  };

  setTimePosition(element, 50, [0, 100]);
  assert.equal(properties.get("--tl-position"), "50%");
});

test("all JavaScript files and inline scripts parse", () => {
  const scripts = walk(root).filter(
    (file) => file.endsWith(".js") && !file.includes(`${path.sep}.git${path.sep}`)
  );

  scripts.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotThrow(() => new Function(source), path.relative(root, file));
  });

  const htmlFiles = walk(root).filter((file) => file.endsWith(".html"));
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    inlineScripts.forEach((match, index) => {
      assert.doesNotThrow(
        () => new Function(match[1]),
        `${path.relative(root, file)} inline script ${index + 1}`
      );
    });
  });
});

test("local HTML links stay inside the project site and resolve", () => {
  const htmlFiles = walk(root).filter((file) => file.endsWith(".html"));
  const projectBase = new URL("https://example.test/timelines/");

  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((reference) =>
        !reference.startsWith("http") &&
        !reference.startsWith("#") &&
        !reference.startsWith("data:")
      );

    references.forEach((reference) => {
      const cleanReference = reference.split(/[?#]/)[0];
      const sourceDirectory = path.dirname(file);
      const target = path.resolve(sourceDirectory, cleanReference || ".");
      const resolved = new URL(
        path.posix.join(
          path.relative(root, sourceDirectory).replaceAll(path.sep, "/"),
          reference
        ),
        projectBase
      );

      assert.ok(
        resolved.pathname.startsWith("/timelines/"),
        `${reference} escaped /timelines/ in ${path.relative(root, file)}`
      );
      assert.ok(
        fs.existsSync(target),
        `${reference} is missing in ${path.relative(root, file)}`
      );
    });
  });
});

test("examples consume the shared core and fixture", () => {
  const exampleFiles = [
    "basic.html",
    "overview-detail.html",
    "semantic-feed.html",
    "keyboard-navigation.html"
  ];

  exampleFiles.forEach((name) => {
    const html = fs.readFileSync(path.join(root, "examples", name), "utf8");
    assert.match(html, /\.\.\/src\/timeline\/timeline\.css/);
    assert.match(html, /\.\.\/src\/timeline\/timeline\.js/);
    assert.match(html, /\.\.\/src\/fixtures\/synthetic-events\.js/);
    assert.match(html, /new URLSearchParams\(window\.location\.search\)/);
  });
});

test("overview viewport exposes the required interaction surfaces", () => {
  const html = fs.readFileSync(path.join(root, "examples", "overview-detail.html"), "utf8");
  assert.match(html, /tl-viewport-handle--start/);
  assert.match(html, /tl-viewport-handle--end/);
  assert.match(html, /attachPointerDrag\(viewport/);
  assert.match(html, /attachHandleKeyboard/);
  assert.match(html, /ensureTimeVisible/);
  assert.match(html, /minimumDuration = 20 \* minute/);
});

test("the canonical fixture is synthetic and structurally stable", () => {
  const fixture = fs.readFileSync(
    path.join(root, "src", "fixtures", "synthetic-events.js"),
    "utf8"
  );
  assert.doesNotMatch(fixture, /@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(fixture, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  assert.equal((fixture.match(/id: "evt-\d{3}"/g) || []).length, 4);
  assert.match(fixture, /synthetic|fictional/i);
});

console.log(`1..${passed}`);

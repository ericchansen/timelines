---
name: Timelines
description: A linear, unboxed catalog of twelve timeline renderers, each live in the scroll with its own controls.
colors:
  ink: "#17191f"
  muted: "#5e6570"
  faint: "#7d8590"
  page: "#f7f8fa"
  surface-strong: "#ffffff"
  border: "#d9dde4"
  axis: "#8a93a3"
  accent: "#4c5dff"
  accent-strong: "#2638e8"
  accent-soft: "#e8eaff"
  secondary: "#00a57a"
  tertiary: "#df8b19"
  focus: "#005fcc"
  ink-dark: "#f3f5f8"
  muted-dark: "#aeb5c0"
  faint-dark: "#858e9c"
  page-dark: "#101217"
  surface-strong-dark: "#181b22"
  border-dark: "#2b303b"
  axis-dark: "#737d8d"
  accent-dark: "#8290ff"
  accent-strong-dark: "#a7b0ff"
  accent-soft-dark: "#252b4d"
  secondary-dark: "#3fd4a9"
  tertiary-dark: "#f0ae4a"
  focus-dark: "#9cc4ff"
typography:
  display:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  subtitle:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 3vw, 2.15rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  lede:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "clamp(1rem, 2vw, 1.18rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  summary:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "normal"
  group-name:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "0.67rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
  readout:
    fontFamily: "Consolas, \"Courier New\", monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  toolbar:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "normal"
  meta:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "normal"
  breadcrumb:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  code:
    fontFamily: "Consolas, \"Courier New\", monospace"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  chart-tick:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  chart-month:
    fontFamily: "\"Helvetica Neue\", \"Segoe UI\", Aptos, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  none: "0"
  sm: "0.375rem"
  lg: "1rem"
  pill: "50%"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
components:
  button-toolbar:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.25rem"
    height: "2rem"
  button-toolbar-hover:
    backgroundColor: "transparent"
    textColor: "{colors.accent-strong}"
  button-toolbar-pressed:
    backgroundColor: "transparent"
    textColor: "{colors.accent-strong}"
  button-reset:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.7rem"
    height: "2.75rem"
  button-reset-hover:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
  control-select:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 2rem 0 0.75rem"
    height: "2.75rem"
    width: "10rem"
  control-range:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    height: "2.75rem"
    width: "7.25rem"
  control-swatch:
    backgroundColor: "transparent"
    rounded: "{rounded.sm}"
    padding: "0.625rem"
    height: "2.75rem"
    width: "2.75rem"
  control-readout:
    backgroundColor: "transparent"
    textColor: "{colors.faint}"
    typography: "{typography.readout}"
  link-toolbar:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    padding: "0.375rem 0.5rem"
  link-detail:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  catalog-section:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "clamp(1rem, 1.8vw, 1.5rem) 0"
  notice:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
---

# Design System: Timelines

## Overview

**Creative North Star: "The Open Bench"**

Timelines is a workbench, not a showroom. Twelve real renderers are laid out in one
vertical scroll, each with its own controls bolted directly above it, and nothing is
put behind glass. There is no hero, no card grid, no numbered section decoration, and
no narrative copy between examples. An engineer arrives, reads a name and one line of
summary, turns two rows of knobs, watches the live SVG respond, and scrolls to the
next instrument. The page is the evidence.

The surface is a cool neutral light or dark field with no tonal container ladder:
every example sits on the same background and is separated from its neighbour by
whitespace and heading hierarchy. Density is compact and instrument-like. Indigo
carries every event, marker, and interactive edge; green carries every aggregate
magnitude; the chrome is otherwise ink and muted grey. Rectangles are honest
rectangles — only the interactive inputs soften, and only by 6px.

Rejections are explicit and confirmed: no hero section, no card grid, no
section-number decoration, no explanatory prose beyond the one-line summary, and no
boxed containers wrapping a chart. Depth is not a tool here. If something needs to
read as separate, spacing and typography must do the work.

**Key Characteristics:**
- One vertical scroll containing all twelve live renderers, in order, unwrapped.
- Controls grouped as exactly two labelled rows — Data, then Appearance — above the chart they drive.
- Cool neutral surfaces (`#f7f8fa` / `#101217`) with whitespace instead of section dividers.
- Indigo for events, green for aggregates; a third amber only inside stacked composition.
- Compact system-sans throughout; monospace reserved for numeric readouts and code.
- Flat by default: one structural `box-shadow` exists in the whole system.

## Colors

A cool-neutral field with two working signal colours and a hard-earned third, tuned so
that the same token names carry both themes.

### Primary
- **Signal Indigo** (`#4c5dff`): Every discrete event. Markers, rug marks, connectors, the overview viewport, semantic-feed dots, and the range-slider accent all read indigo. It is the colour of "a thing happened here."
- **Pressed Indigo** (`#2638e8`): The engaged state — hovered or selected markers, `<a>` link text, and the mono timestamp in the semantic feed. It is indigo under load.
- **Indigo Wash** (`#e8eaff`): The only tinted fill in the chrome. Pressed toolbar buttons, selected event-label plates, and the overview viewport body. Never used as a page or section background.

### Secondary
- **Aggregate Green** (`#00a57a`): Every summarized magnitude. Lollipop stems and heads, density bars, lifecycle range bars, and the notice rule. Green means "this is a count, a sum, or a span," never "success."

### Tertiary
- **Composition Amber** (`#df8b19`): The third categorical slot, used only for `.tl-type-3` inside stacked composition. It exists so a three-way stack stays legible; it is not a general accent.

### Neutral
- **Ink** (`#17191f`): Body text, headings, lane labels, event labels, value labels.
- **Muted Ink** (`#5e6570`): Summaries, ledes, control labels, toolbar links, tick labels — everything that supports rather than states.
- **Faint Ink** (`#7d8590`): The quietest tier: control-group names, numeric readouts, table column heads.
- **Cool Paper** (`#f7f8fa`): The page and the toolbar-button rest state. Page and surface are the same value on purpose; there is no container ladder.
- **Raised Paper** (`#ffffff`): Input fields, the keyboard panel, marker strokes. The only surface allowed to be lighter than the page.
- **Hairline** (`#d9dde4`): Interactive and semantic boundaries only, always 1px.
- **Axis Grey** (`#8a93a3`): The default axis and tick stroke — deliberately weaker than ink so data outranks scaffolding.
- **Focus Blue** (`#005fcc`): Focus outlines (3px, 3px offset) and the 4px focus stroke on chart geometry. Never used decoratively.

Dark theme keeps every role and shifts the value: paper becomes `#101217`, ink `#f3f5f8`, indigo lifts to `#8290ff`, green to `#3fd4a9`, focus to `#9cc4ff`. It is applied by `data-theme="dark"` on the root and also honoured via `prefers-color-scheme` when the user has not chosen.

### Named Rules
**The Two-Signal Rule.** Indigo means an individual event; green means an aggregated quantity. A renderer never swaps them, and no third colour enters a chart unless it is encoding a categorical type.

**The Whitespace Rule.** Catalog sections and control groups are separated by spacing and typography, never horizontal rules. Hairlines are reserved for interactive or semantic boundaries.

**The Wash-Never-Ground Rule.** `#e8eaff` is a state tint on small elements only. It never becomes a section, panel, or card background.

## Typography

**Display Font:** Helvetica Neue (with Segoe UI, Aptos, system-ui, sans-serif)
**Body Font:** the same stack — there is exactly one family
**Label/Mono Font:** Consolas (with Courier New, monospace)

**Character:** Neutral, compact, system-native sans with tight negative tracking on
headings and a plain 1.5 body rhythm. It reads like a well-set technical document
rather than a brand: the typography's job is to get out of the way of twelve charts.

### Hierarchy
- **Display** (700, `clamp(2rem, 6vw, 4rem)`, 1.08, `-0.025em`): The `h1` on an individual example page. The catalog index does not use it.
- **Headline** (700, `clamp(1.6rem, 3vw, 2.35rem)`, 1.08, `-0.035em`): The example name at the top of each catalog section. The single strongest type on the index page.
- **Subtitle** (700, `1.05rem`): `h3` inside guidance and keyboard panels.
- **Section Title** (700, `clamp(1.45rem, 3vw, 2.15rem)`): Supporting `h2` headings outside the catalog index.
- **Lede** (400, `clamp(1rem, 2vw, 1.18rem)`): The single-line description beneath an example-page title.
- **Body** (400, `1rem`, 1.5): Prose, guidance, panel lists. Constrained to 72ch.
- **Summary** (400, `0.95rem`, 1.5, muted): The one-line example description under each headline, capped at 58ch.
- **Label** (650, `0.72rem`): Every control label and the reset button. Compact enough that two control rows fit above the fold.
- **Group Name** (700, `0.67rem`, `0.1em`, uppercase): "DATA" and "APPEARANCE" — the only uppercase type in the system.
- **Readout** (mono, `0.72rem/1.4`, faint, right-aligned): Live numeric values next to sliders.
- **Toolbar** (650, `0.875rem`): Header controls and navigation actions.
- **Meta** (650, `0.82rem`): Detail links and semantic-feed timestamps.
- **Breadcrumb** (400, `0.9rem`): The compact page-position line above example titles.
- **Code** (mono, `0.85rem/1.6`): Code blocks and API reference tables.
- **Chart Tick** (`11px`) / **Chart Month** (700, `12px`, `0.04em`, uppercase): SVG axis text. These are `px` on purpose — they live in a scaled viewBox and must not inherit root sizing.

### Named Rules
**The One-Family Rule.** One sans stack carries the entire interface. Monospace appears only where characters are being compared as data: numeric readouts, timestamps, code blocks, and API reference tables.

**The No Wordmark Rule.** The site has no visible title or logo. The content is the product; the shared header contains actions only.

**The Shared Shell Rule.** Catalog, detail, and documentation pages mount the same site header from `src/site-ui.js`. Page-specific actions belong in content, not in a competing header.

**The Uppercase Budget Rule.** Uppercase is spent on exactly two things: the control-group names and month ticks. Nothing else shouts.

## Layout

One column, top to bottom, no exceptions. `.tl-page` is `min(88rem, 100% - 2rem)`
centred, with `overflow-x: clip` so no chart can push the page sideways on a phone.
Reading text is capped separately at 72ch (prose) or 58ch (example summaries) so line
length stays honest inside a wide page.

Each example is a `<section>` in a single-column grid with a 0.5rem internal gap and
`clamp(1rem, 1.8vw, 1.5rem)` vertical padding. The internal order is fixed and never
rearranged: heading + detail link, one-line summary, the control block, then the live
chart. In a 390×844 viewport the compact action strip, the first example's name,
summary, detail link, both control rows, and a meaningful portion of the live timeline
are all present in the first viewport.

The control block is a borderless `<form>` containing two `<fieldset>` rows separated
by 0.25rem of space. On desktop each row is a horizontal grid with a 5.5rem group-name
column and auto-flowing control columns — data selects at 10rem, appearance sliders
and the reset at 7.25rem, colour controls at 6rem with compact 1.5rem visible chips.
Every control is a two-row subgrid so labels and inputs align across the row regardless
of type.

Responsive behaviour is three steps, all inside a single nested media block:
- **≤52rem (832px):** control rows switch to a 4-column wrapping grid, the group name moves to its own full-width line, headings collapse to one column, and the keyboard panel becomes a bottom sheet.
- **≤38rem (608px):** 3 columns, tighter 0.625rem gaps, ranges and selects drop their min-widths, SVGs release their desktop height floor, and the reset stretches to fill its cell.
- **≤26rem (416px):** 2 columns.

Most charts render into a 960×360 viewBox (plot band 72→888) with
`preserveAspectRatio: xMidYMid meet`, capped at 78rem wide and floored at
`min(20rem, 65vw)` on larger screens — `min(22rem, 75vw)` for lollipops. The
calendar uses a tighter 620×300 surface so its familiar grid does not sit in dead
space. On narrow screens, chart type scales in user units to preserve an approximately
11px rendered tick and label size without imposing a minimum SVG width. Event labels
shift inward at the ends, gain lanes as needed, and refit the viewBox vertically,
including above its original origin, so no label is clipped or forced to overlap.
Lane-based renderers reserve a measured gutter for their longest label.

Spacing runs on a 0.25rem base: 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem. Section rhythm and
page padding use `clamp()` rather than fixed steps so the vertical cadence breathes
with the viewport.

### Named Rules
**The Unboxed Catalog Rule.** An example is never wrapped in a card, panel, or bordered container. Its only boundary is the whitespace around it.

**The Controls-Above Rule.** Controls belong in the same scroll column, directly above the chart they drive, in two labelled rows. They are never docked, floated, collapsed into a drawer, or placed in a sidebar.

**The Two-Row Rule.** All controls fall into exactly two groups: Data (what is rendered) and Appearance (how it looks). A new control joins one of them; it does not create a third row.

## Elevation & Depth

This system is flat. There is no shadow scale, no elevation ladder, and no tonal
container hierarchy — page and section share one background value, and the only
lighter surface (`#ffffff`) exists to make input fields legible, not to lift them.
Hierarchy is communicated by compact, contrasting vertical rhythm and colour weight
(ink > muted > faint > axis).

A `--tl-color-shadow` token is declared in `:root` for both themes but is not consumed
anywhere. Treat it as reserved, not as permission to start shadowing.

### Shadow Vocabulary
- **Spine ring** (`box-shadow: 0 0 0 var(--tl-axis-width) var(--tl-axis-color)`): The only `box-shadow` in the system. It rings the semantic-feed marker so the dot reads as attached to the spine at any axis width. Structural, not ambient — it carries no blur and no offset.

### Named Rules
**The No-Lift Rule.** Nothing in this interface floats. Hover changes border colour and fill, never elevation, never `translateY`.

## Shapes

Rectangles, fine strokes, and circles. Corners are square by default for structural
surfaces. The 6px radius (`0.375rem`) is reserved for things you touch — toolbar
buttons, reset buttons, select and colour inputs. A 16px radius appears exactly once,
on the top corners of the mobile keyboard bottom sheet, because a sheet rising from
the viewport edge is a different object than a panel. A `--tl-radius-md` (10px) token
is declared but unused; do not reach for it to soften new chrome.

Inside the charts, radii are small and functional: 3px on density bars, range bars,
and calendar cells; 4px on event-label plates; 5px on heatmap cells. Markers are true
circles. Rug marks and axes are 1px-family strokes with `vector-effect:
non-scaling-stroke` so they hold their weight while the SVG scales.

Every form control is at least 2.75rem tall (`--tl-hit-target`), including the reset
button, so touch targets are uniform across both control rows. The low-priority shared
site header uses compact 2rem actions.

### Named Rules
**The Square Chrome Rule.** Page-level surfaces are square. If a container has a radius, it is either something the user manipulates or a sheet anchored to the viewport edge.

## Components

### Buttons
- **Shape:** Softly cut corners (6px / `0.375rem`), 1px hairline border, minimum height 2.75rem.
- **Base button** (`.tl-button`): Page-coloured fill, ink text, 650 weight at 0.875rem, `0.5rem 0.75rem` padding, inline-flex with a 0.5rem gap. Used for contextual controls such as Keyboard and Close.
- **Site theme action** (`.tl-site-toolbar .tl-button`): Icon-only, transparent, and 2rem square. Hover and the active dark-theme state change only the icon colour.
- **Hover / Pressed:** Border becomes indigo and the fill becomes indigo wash. `aria-pressed="true"` renders identically to hover — the toggle's on-state is visible without a separate colour.
- **Reset button** (`.tl-reset`): The quiet variant. Raised-paper fill, muted text at label size, `0.45rem 0.7rem` padding but the same 2.75rem minimum height so it lines up with the sliders beside it. Hover raises text to ink and border to indigo. It is a peer inside the Appearance row, not a separate action bar.

### Inputs / Fields
- **Style:** Raised-paper fill, 1px hairline border, 6px radius, 2.75rem block size, inheriting the label typography. Selects reserve 2rem of trailing inline padding for the native arrow and a 7.5rem minimum width.
- **Hover:** Border mixes 55% indigo into the hairline — a warm-up, not a state change. Transitions are 140ms `ease-out` on border and background only.
- **Range:** Borderless and transparent with `accent-color` set to indigo, full-cell width, paired with a right-aligned mono readout that updates live.
- **Colour:** A compact 1.5rem visible chip centered inside a transparent 2.75rem touch target; the native swatch chrome is stripped and rounded to 6px.
- **Focus:** Global `:focus-visible` — 3px focus-blue outline at 3px offset. No custom per-input focus treatment.

### Navigation
- **Style:** Every catalog, detail, and documentation page mounts the same compact, right-aligned `tl-site-header` from `src/site-ui.js`: an icon-only 2rem theme target and two 0.75rem text links. There is no nav bar, no sticky chrome, and no in-page section index.
- **Detail link** (`.tl-detail-link`): "View details →" on catalog sections and "← Back to catalog" on detail pages, using the same component-heading slot. It sits on the heading row on desktop and reflows below the summary under 52rem.

### Cards / Containers
There are none, and that is the design. Catalog sections, control blocks, and charts
are unwrapped regions separated by spacing and typography, never horizontal rules.
Borders belong only to interactive fields and surfaces where they communicate an
actual boundary, such as the keyboard panel and code blocks.

### Control Block
The signature component. A borderless `<form>` holding two spaced `<fieldset>` groups:
**Data** (scenario, orientation, interval, reducer — whichever the renderer supports)
and **Appearance** (axis, rug, marker, aggregate, and label controls, plus Reset). Each
group carries a visually-hidden `<legend>` for assistive tech and a visible uppercase
group name for sighted scanning. Controls are two-row subgrids: label and optional
readout on the first row, input on the second, so a select, a slider, and a swatch all
align on the same baseline. Controls that only apply to one orientation (label angle)
are hidden rather than disabled when the orientation changes.

### Chart Surface
An inline SVG on a transparent background — no frame, no plot fill, no gridlines.
Axis and ticks are axis-grey; data is indigo or green; labels are ink. Appearance
controls write CSS custom properties (`--tl-axis-color-local`, `--tl-marker-color-local`,
`--tl-aggregate-color-local`, and their width/size siblings) onto the `<svg>` element,
so every renderer is themable through the same variable contract rather than through
per-renderer styling. Aggregate charts print compact values when the bucket count can
support them; categorical stacks include a direct legend. Swimlanes may use a 5%
indigo band and dashed lane rule to distinguish parallel tracks without introducing a
container or card. The semantic horizontal feed remains intentionally scrollable and
snaps each item to the reading edge.

### Notice
A left-rule callout: 0.25rem aggregate-green border-inline-start, a 10% green wash,
muted text, `0.75rem 1rem` padding, square corners. Used for empty and edge-case
messaging.

## Do's and Don'ts

### Do:
- **Do** keep all twelve examples in one continuous vertical scroll, in catalog order, each with its live renderer in the page.
- **Do** put controls directly above the chart they drive, grouped into exactly two labelled rows: Data, then Appearance.
- **Do** mount the shared site header and component heading from `src/site-ui.js`.
- **Do** separate examples through compact vertical rhythm and clear heading hierarchy.
- **Do** use indigo (`#4c5dff`) for discrete events and green (`#00a57a`) for aggregate magnitude, in every renderer, without exception.
- **Do** give every form control the full 2.75rem hit target, including the reset button.
- **Do** style chart internals through the `--tl-*-local` custom-property contract so appearance controls keep working.
- **Do** keep chart text in `px` inside the viewBox, and keep chrome text in `rem`.
- **Do** honour both `data-theme` and `prefers-color-scheme`, and keep every colour role present in both themes.

### Don't:
- **Don't** add a hero section, a marketing banner, or a landing intro above the catalog.
- **Don't** author page-local header or theme-toggle markup.
- **Don't** arrange examples as a card grid, and don't wrap an example, its controls, or its chart in a card, panel, or bordered container.
- **Don't** divide catalog sections or control groups with horizontal rules; whitespace carries the hierarchy.
- **Don't** add section numbers, step counters, or decorative ordinals to example headings.
- **Don't** add narrative or explanatory copy between examples; the one-line summary and the detail link are the entire budget.
- **Don't** introduce `box-shadow` for elevation — the spine ring is the only shadow in the system, and it is structural.
- **Don't** use indigo wash (`#e8eaff`) as a section or page background.
- **Don't** move controls into a sidebar, a sticky bar, a modal, or a collapsed drawer.
- **Don't** add a third control group; a new control joins Data or Appearance.
- **Don't** soften page-level containers — squares stay square, and `--tl-radius-md` stays unused.

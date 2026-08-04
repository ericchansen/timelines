# Example Guide

This document explains how to run each timeline example and the patterns they demonstrate.

## Running Examples

All examples are standalone HTML files. Open any example directly in a web browser:

```bash
# macOS/Linux
open examples/basic.html
open examples/overview-detail.html
open examples/semantic-feed.html
open examples/keyboard-navigation.html

# Windows
start examples/basic.html
start examples/overview-detail.html
start examples/semantic-feed.html
start examples/keyboard-navigation.html
```

Or use a local web server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (with http-server)
npx http-server .
```

Then navigate to `http://localhost:8000/examples/` in your browser.

## Example Breakdown

### basic.html

**Patterns demonstrated:**
- Horizontal datetime axis with event markers
- Hover state feedback (color shift, shadow)
- Time label display (HH:MM:SS format)

**Use case:** Simple timeline presentation, entry point for interaction.

**Key features:**
- Linear visual spine with event dots
- ISO 8601 timestamp formatting
- CSS transitions for smooth hover effects
- Accessible color contrast (WCAG AA)

### overview-detail.html

**Patterns demonstrated:**
- Coordinated overview and detail views
- Zoom window (visual indicator in overview)
- Cross-linked event selection (click in either view, both update)
- Zoom range highlighting in detail view

**Use case:** Dense timeline with both summary navigation and detail inspection.

**Key features:**
- Two timeline panels with synchronized state
- Zoom window visualization (hollow rectangle in overview)
- Click events propagate across both views
- Detail view expands time range selected in overview

### semantic-feed.html

**Patterns demonstrated:**
- Event grouping by semantic category (deployment, monitoring)
- Visual group hierarchy (markers, labels, event list)
- Reverse chronological order within groups
- Category-based color coding

**Use case:** Mixed-category event streams where grouping aids understanding.

**Key features:**
- Vertical spine connecting group markers
- Group numbering with color-coded borders
- Events sorted newest-first within each group
- Category badges on each event
- Hover feedback with group color inheritance

### keyboard-navigation.html

**Patterns demonstrated:**
- Full keyboard navigation (arrow keys, Home/End, Enter/Space)
- Focus management with tabindex
- Visible focus indicators (outline + background)
- Status bar showing active selection

**Use case:** Accessible timeline interaction, screen reader support, keyboard-only navigation.

**Key features:**
- Up/Down arrow keys move focus between events
- Home/End jump to first/last event
- Enter/Space select (though selection is implicit with focus)
- Tab navigation into/out of timeline
- ARIA roles and attributes (listbox, option, aria-selected)
- Status display updates as focus changes

## Extending Examples

### Adding New Events

Edit the `events` array in any example:

```javascript
const events = [
  {
    id: 'evt-001',
    timestamp: '2026-01-15T10:00:00Z',
    label: 'Event Name',
    category: 'deployment',  // or 'monitoring', etc.
    description: 'Longer explanation of what happened'
  },
  // ... more events
];
```

Keep all data fictional. Use obviously fake identifiers (evt-001, evt-002, etc.) and future dates (2026+).

### Reusing Fixtures

All examples import the synthetic event dataset from `src/fixtures/synthetic-events.json`. To use it in a new example, copy the array into your file or load it via JavaScript:

```javascript
// Fetch and render the shared fixture
fetch('../src/fixtures/synthetic-events.json')
  .then(r => r.json())
  .then(events => renderTimeline(events));
```

### Creating New Patterns

1. Copy an example file as a template.
2. Modify the HTML structure, CSS, and JavaScript for your new pattern.
3. Keep the synthetic event data structure consistent.
4. Update `README.md` with a link to your new example.
5. Push to your fork or contribution branch.

## Design Choices

### Synthetic Data Only

All examples use obviously fictional event data (evt-001, evt-002, future dates, demo event labels) to ensure:
- No risk of exposing real operational or customer data
- Easy to understand the code without business context
- Safe for open-source publication and sharing
- Clearly labeled as examples, not production fixtures

### Minimal Dependencies

Examples use only vanilla JavaScript, CSS, and HTML. No frameworks or build tools required. This maximizes:
- Portability (works in any browser, any environment)
- Ease of modification (no compilation, transpilation, or toolchain setup)
- Clarity (CSS-in-file, JavaScript inline)
- Reusability (copy-paste into existing projects)

### Accessibility

All examples include:
- Semantic HTML (role, aria-selected, tabindex)
- Keyboard navigation (arrow keys, Tab, Enter)
- Color not the only visual cue (dots, borders, shapes)
- Sufficient color contrast (WCAG AA standard)
- Focus indicators (visible outline + background)

## Contributing

If you extend an example or create a new pattern:

1. Keep data synthetic and obviously fictional.
2. Maintain accessibility (keyboard nav, focus indicators, semantic HTML).
3. Test in modern browsers (Chrome, Firefox, Safari, Edge).
4. Update the example section of `README.md`.
5. Document the new pattern in this guide.

See [reuse-policy.md](reuse-policy.md) for the complete governance rules.

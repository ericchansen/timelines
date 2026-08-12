# Contributing

1. Use a feature branch; never work directly on the default branch.
2. Keep the package build-free and runtime-dependency-free.
3. Add only obviously fictional fixtures and examples.
4. Reuse core scale, interval, geometry, interaction, and lifecycle utilities instead of duplicating them.
5. Mount page chrome through `src/site-ui.js` and derive demo data/options through `src/demo-options.js`; do not add page-local copies.
6. Preserve named renderer exports and `{ update, setSelection, getState, destroy }`.
7. Add dependency-free tests for every changed contract.
8. Run `npm test`, inspect the catalog in Edge at wide and narrow widths, and verify light, dark, keyboard, pointer, touch, empty, dense, and reduced-motion states.
9. Do not push until the full branch diff stat has been reviewed.

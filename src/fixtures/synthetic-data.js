const base = Date.UTC(2026, 4, 4, 9);
const hour = 60 * 60 * 1000;
const day = 24 * hour;

export const syntheticEvents = Object.freeze([
  { id: "fiction-01", time: new Date(base).toISOString(), label: "Paper moon sketched", type: "idea", series: "Orbit Atlas", value: 4 },
  { id: "fiction-02", time: new Date(base + 7 * hour).toISOString(), label: "Cardboard comet named", type: "note", series: "Orbit Atlas", value: 7 },
  { id: "fiction-03", time: new Date(base + 2 * day + 3 * hour).toISOString(), label: "Clockwork cloud rehearsed", type: "change", series: "Weather Theatre", value: 10 },
  { id: "fiction-04", time: new Date(base + 5 * day).toISOString(), label: "Velvet thunder cataloged", type: "idea", series: "Weather Theatre", value: 6 },
  { id: "fiction-05", time: new Date(base + 9 * day + 5 * hour).toISOString(), label: "Tin star polished", type: "note", series: "Orbit Atlas", value: 12 },
  { id: "fiction-06", time: new Date(base + 14 * day).toISOString(), label: "Imaginary lighthouse blinked", type: "change", series: "Harbor Fable", value: 9 },
  { id: "fiction-07", time: new Date(base + 21 * day + 2 * hour).toISOString(), label: "Origami tide chart folded", type: "idea", series: "Harbor Fable", value: 5 },
  { id: "fiction-08", time: new Date(base + 31 * day).toISOString(), label: "Porcelain sunrise archived", type: "note", series: "Weather Theatre", value: 11 },
  { id: "fiction-09", time: new Date(base + 44 * day + 8 * hour).toISOString(), label: "Marble aurora arranged", type: "change", series: "Orbit Atlas", value: 8 },
  { id: "fiction-10", time: new Date(base + 63 * day).toISOString(), label: "Felt constellation completed", type: "idea", series: "Harbor Fable", value: 13 }
]);

export const syntheticRanges = Object.freeze([
  { id: "range-01", start: new Date(base).toISOString(), end: new Date(base + 8 * day).toISOString(), label: "Build a paper planet", series: "Orbit Atlas" },
  { id: "range-02", start: new Date(base + 4 * day).toISOString(), end: new Date(base + 18 * day).toISOString(), label: "Stage the weather theatre", series: "Weather Theatre" },
  { id: "range-03", start: new Date(base + 16 * day).toISOString(), end: new Date(base + 37 * day).toISOString(), label: "Map the imaginary harbor", series: "Harbor Fable" },
  { id: "range-04", start: new Date(base + 42 * day).toISOString(), end: new Date(base + 68 * day).toISOString(), label: "Bind the atlas", series: "Orbit Atlas" }
]);

export const syntheticJourneys = Object.freeze([
  { id: "journey-01", day: 0, label: "Invitation opened", series: "Paper Moon" },
  { id: "journey-02", day: 2, label: "First sketch", series: "Paper Moon" },
  { id: "journey-03", day: 8, label: "Final fold", series: "Paper Moon" },
  { id: "journey-04", day: 0, label: "Curtain raised", series: "Clockwork Cloud" },
  { id: "journey-05", day: 5, label: "Thunder cue", series: "Clockwork Cloud" },
  { id: "journey-06", day: 13, label: "Encore", series: "Clockwork Cloud" },
  { id: "journey-07", day: 0, label: "Lantern lit", series: "Harbor Fable" },
  { id: "journey-08", day: 3, label: "Tide marked", series: "Harbor Fable" },
  { id: "journey-09", day: 10, label: "Map sealed", series: "Harbor Fable" }
]);

export const denseSyntheticEvents = Object.freeze(
  Array.from({ length: 48 }, (_, index) => ({
    id: `dense-fiction-${String(index + 1).padStart(2, "0")}`,
    time: new Date(base + index * 36 * 60 * 60 * 1000).toISOString(),
    label: `Fictional signal ${index + 1}`,
    type: ["idea", "note", "change"][index % 3],
    series: ["Orbit Atlas", "Weather Theatre", "Harbor Fable"][index % 3],
    value: (index % 9) + 1
  }))
);

export const syntheticFixtureMeta = Object.freeze({
  synthetic: true,
  notice: "Every record is obviously fictional and exists only to demonstrate timeline components."
});

(function defineSyntheticTimelineEvents(root) {
  "use strict";

  const events = [
    {
      id: "evt-001",
      timestamp: "2026-01-15T10:00:00Z",
      label: "Demo launch started",
      category: "deployment",
      description: "Synthetic release sequence entered the launch phase."
    },
    {
      id: "evt-002",
      timestamp: "2026-01-15T10:15:30Z",
      label: "Sample health check",
      category: "monitoring",
      description: "All fictional test nodes reported a ready state."
    },
    {
      id: "evt-003",
      timestamp: "2026-01-15T10:45:00Z",
      label: "Demo configuration applied",
      category: "deployment",
      description: "The synthetic configuration bundle was accepted."
    },
    {
      id: "evt-004",
      timestamp: "2026-01-15T11:20:15Z",
      label: "Simulation ready",
      category: "deployment",
      description: "The fictional environment completed its launch sequence."
    }
  ];

  root.SYNTHETIC_TIMELINE_EVENTS = Object.freeze(
    events.map((event) => Object.freeze(event))
  );
})(typeof globalThis !== "undefined" ? globalThis : this);

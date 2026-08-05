# Data model

Discrete-event renderers accept immutable records with `id`, `time`, and `label`. Optional `type`, `series`, `value`, `markerAxisOffset`, and `labelPlacement` fields enable composition, lanes, aggregation, and deliberate label placement.

Range renderers accept `id`, `start`, `end`, and `label`. Relative journeys accept `id`, numeric `day`, `series`, and `label`.

Timestamps may be ISO strings, finite epoch milliseconds, or `Date` values. The core normalizes reversed domains. Invalid timestamps throw instead of producing non-finite geometry.

The bundled fixtures are obviously fictional. They are demonstrations, not templates for operational payloads.

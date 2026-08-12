export type TimeValue = string | number | Date;
export type Orientation = "horizontal" | "vertical";
export type IntervalName = "day" | "week" | "month";
export type ReducerName = "count" | "sum" | "average";
export type LabelPlacement = "above" | "below" | "left" | "right";

export interface TimelineEvent {
  id: string;
  time: TimeValue;
  label: string;
  type?: string;
  series?: string;
  value?: number;
  markerAxisOffset?: number;
  labelPlacement?: LabelPlacement;
}

export interface TimelineRange {
  id: string;
  start: TimeValue;
  end: TimeValue;
  label: string;
  series?: string;
}

export interface TimelineJourney {
  id: string;
  day: number;
  label: string;
  series: string;
}

export type TimelineDatum = TimelineEvent | TimelineRange | TimelineJourney;

export interface CustomInterval {
  floor(value: number): TimeValue;
  offset(value: number, step: number): TimeValue;
  label?(value: number): string;
}

export interface TimeBucket<T> {
  start: number;
  end: number;
  label: string;
  items: T[];
  count: number;
  value: number;
}

export interface TimeBucketContext {
  start: number;
  end: number;
  label: string;
  count: number;
  value: number;
  items?: undefined;
}

export type BucketReducer<T> = (
  values: number[],
  items: readonly T[],
  bin: TimeBucketContext
) => number;

export interface RendererOptions<T = TimelineEvent> {
  data?: readonly T[];
  orientation?: Orientation;
  domain?: readonly [TimeValue, TimeValue];
  interval?: IntervalName | CustomInterval;
  customInterval?: CustomInterval;
  reducer?: ReducerName | BucketReducer<T>;
  value?: (item: T) => number;
  markerAxisOffset?: number;
  markerRadius?: number;
  labelGap?: number;
  /**
   * Horizontal datetime tick-label angle, clamped from -90 through 0 degrees.
   * Every tick on an axis shares one angle and one `text-anchor`. Forced to 0
   * in vertical orientation and honored by the nine renderers that draw a
   * datetime tick axis. `relative-journeys` (elapsed-day axis),
   * `calendar-heatmap` (weekday/month gutter), and `semantic-feed` (no axis)
   * deliberately ignore it.
   */
  labelAngle?: number;
  axisColor?: string;
  axisWidth?: number;
  rugColor?: string;
  rugWidth?: number;
  rugLength?: number;
  markerColor?: string;
  aggregateColor?: string;
  aggregateStemWidth?: number;
  aggregateBarWidth?: number;
  aggregateHeadSize?: number;
  maxLabelLanes?: number;
  selectedId?: string | null;
  ariaLabel?: string;
  showEventRug?: boolean;
  showDensityTrack?: boolean;
  densityInterval?: IntervalName;
  minimumDuration?: number;
  keyboardStep?: number;
  visibleRange?: readonly [TimeValue, TimeValue];
  onRangeChange?: (range: [number, number]) => void;
}

export interface RendererState {
  selectedId: string | null;
  previewId: string | null;
  focusedId: string | null;
  orientation: Orientation;
  visibleRange?: [number, number];
  destroyed: boolean;
}

export interface RendererHandle<T = TimelineEvent> {
  update(options: Partial<RendererOptions<T>>): void;
  setSelection(id: string | null): void;
  getState(): RendererState;
  destroy(): void;
}

export interface TimeScale {
  (value: TimeValue): number;
  invert(position: number): number;
  domain(): [number, number];
  range(): [number, number];
}

export interface UtcInterval {
  kind: string;
  floor(value: TimeValue): number;
  offset(value: TimeValue, step?: number): number;
  label(value: TimeValue): string;
  range(domain: readonly [TimeValue, TimeValue]): number[];
}

export interface MarkerGeometry {
  x: number;
  y: number;
  axisX: number;
  axisY: number;
  connector: null | { x1: number; y1: number; x2: number; y2: number };
}

export interface LabelLayoutItem {
  id?: string;
  position: number;
  markerCross?: number;
  width?: number;
  height?: number;
  placement?: LabelPlacement;
  lane?: number;
  side?: LabelPlacement;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

export interface InteractionSnapshot {
  focusedId: string | null;
  previewId: string | null;
  selectedId: string | null;
}

export const DAY: number;
export const WEEK: number;
export function toTime(value: TimeValue): number;
export function finite(value: unknown, fallback?: number): number;
export function clamp(value: unknown, minimum: number, maximum: number): number;
export function normalizeDomain(domain: readonly [TimeValue, TimeValue]): [number, number];
export function extent<T>(items: readonly T[], accessor?: (item: T) => TimeValue): [number, number];
export function createTimeScale(
  domain: readonly [TimeValue, TimeValue],
  output?: readonly [number, number]
): TimeScale;
export function createUtcInterval(
  kind?: IntervalName | "custom" | CustomInterval,
  custom?: CustomInterval
): UtcInterval;
export function createTicks(
  domain: readonly [TimeValue, TimeValue],
  interval?: IntervalName | CustomInterval
): Array<{ value: number; label: string }>;
export function formatResponsiveTick(
  value: TimeValue,
  interval?: IntervalName | "custom",
  renderedLength?: number,
  fallback?: string
): string;
export function estimatedLabelWidth(label: string): number;
export function selectResponsiveTicks(
  candidates: readonly Array<{ value: TimeValue; label: string }>,
  options?: {
    orientation?: Orientation;
    /** Rendered CSS length of the axis. Selects the label abbreviation tier. */
    renderedLength?: number;
    /**
     * Plot span in SVG user units. Overlap is measured against this so label
     * width estimates and tick positions share one coordinate space. Defaults
     * to `renderedLength`.
     */
    measureLength?: number;
    interval?: IntervalName | "custom";
    labelAngle?: number;
    domain?: readonly [TimeValue, TimeValue];
  }
): Array<{
  value: TimeValue;
  label: string;
  fullLabel: string;
  index: number;
  rotated: boolean;
  labelAngle: number;
}>;
export const APPEARANCE_OPTIONS: Readonly<Record<
  "axisWidth" | "rugWidth" | "rugLength" | "markerRadius" | "markerAxisOffset" |
  "aggregateStemWidth" | "aggregateBarWidth" | "aggregateHeadSize" | "labelGap",
  Readonly<{ minimum: number; maximum: number; fallback: number }>
>>;
export function normalizeAppearanceOptions(options?: Partial<RendererOptions>): {
  axisColor: string | null;
  axisWidth: number;
  rugColor: string | null;
  rugWidth: number;
  rugLength: number;
  markerColor: string | null;
  markerRadius: number;
  markerAxisOffset: number;
  aggregateColor: string | null;
  aggregateStemWidth: number;
  aggregateBarWidth: number;
  aggregateHeadSize: number;
  labelGap: number;
};
export function applyAppearanceStyles(
  element: HTMLElement | SVGElement,
  appearance: ReturnType<typeof normalizeAppearanceOptions>
): void;
export function aggregateTimeBuckets<T>(
  items: readonly T[],
  options?: {
    domain?: readonly [TimeValue, TimeValue];
    interval?: IntervalName | "custom" | CustomInterval;
    customInterval?: CustomInterval;
    time?: (item: T) => TimeValue;
    value?: (item: T) => number;
    reducer?: ReducerName | BucketReducer<T>;
  }
): Array<TimeBucket<T>>;
export function formatUtc(
  value: TimeValue,
  options?: { date?: boolean; year?: boolean; time?: boolean; seconds?: boolean }
): string;
export function formatRangeUtc(domain: readonly [TimeValue, TimeValue]): string;
export function clampRange(
  range: readonly [TimeValue, TimeValue],
  bounds: readonly [TimeValue, TimeValue],
  minimumDuration?: number,
  anchor?: "start" | "end" | "center"
): [number, number];
export function panRange(
  range: readonly [TimeValue, TimeValue],
  bounds: readonly [TimeValue, TimeValue],
  delta: number
): [number, number];
export function resizeRange(
  range: readonly [TimeValue, TimeValue],
  bounds: readonly [TimeValue, TimeValue],
  edge: "start" | "end",
  delta: number,
  minimumDuration?: number
): [number, number];
export function ensureTimeVisible(
  range: readonly [TimeValue, TimeValue],
  bounds: readonly [TimeValue, TimeValue],
  value: TimeValue
): [number, number];

export function markerGeometry(
  position: number,
  options?: { orientation?: Orientation; axis?: number; markerAxisOffset?: number }
): MarkerGeometry;
export function layoutLabels(
  items: readonly LabelLayoutItem[],
  options?: {
    orientation?: Orientation;
    axis?: number;
    labelGap?: number;
    laneSize?: number;
    maxLanes?: number;
  }
): LabelLayoutItem[];
export function finiteBox(box?: Partial<{ x: number; y: number; width: number; height: number }>): {
  x: number;
  y: number;
  width: number;
  height: number;
};
export function labelTextWidth(text: unknown, characterWidth?: number, maximum?: number): number;

export const DEFAULT_EVENT_COMMANDS: readonly string[];
export function createInteractionState(ids?: readonly string[], initial?: Partial<InteractionSnapshot>): {
  updateIds(nextIds: readonly string[]): InteractionSnapshot;
  set(patch: Partial<InteractionSnapshot>): InteractionSnapshot;
  getState(): InteractionSnapshot;
};
export function attachEventInteractions(
  nodes: Iterable<HTMLElement | SVGElement>,
  options?: {
    orientation?: Orientation;
    onPreview?: (id: string | null) => void;
    onFocus?: (id: string) => void;
    onSelect?: (id: string | null) => void;
  }
): () => void;
export function attachPointerDrag(
  element: HTMLElement | SVGElement,
  options?: {
    onStart?: (event: PointerEvent) => void;
    onMove?: (delta: { x: number; y: number }, event: PointerEvent) => void;
    onEnd?: (event: PointerEvent) => void;
  }
): () => void;

export function renderProportionalRun(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderEventRug(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderVolumeLollipop(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderStackedChangePlot(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderSeriesSwimlanes(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderLifecycleRanges(
  container: Element,
  options?: RendererOptions<TimelineRange>
): RendererHandle<TimelineRange>;
export function renderDensityHistogram(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderCalendarHeatmap(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderRelativeJourneys(
  container: Element,
  options?: RendererOptions<TimelineJourney>
): RendererHandle<TimelineJourney>;
export function renderAlignedSmallMultiples(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderOverviewDetail(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;
export function renderSemanticFeed(
  container: Element,
  options?: RendererOptions<TimelineEvent>
): RendererHandle<TimelineEvent>;

export const rendererRegistry: Readonly<Record<string, (
  container: Element,
  options?: RendererOptions<TimelineDatum>
) => RendererHandle<TimelineDatum>>>;

import type { IrrigationEvent } from '../../types/domain';
import { overlapMs, toMs, type Period, type TimeWindow } from '../../utils/time';

/**
 * Water and energy are attributed to a time window pro rata to how much of
 * the irrigation run falls inside it (constant flow assumed within a run).
 * Because chart buckets partition the period, bucket sums equal period totals.
 */
function eventWindow(e: IrrigationEvent, now: number): TimeWindow {
  return { start: toMs(e.startedAt), end: e.endedAt ? toMs(e.endedAt) : now };
}

function share(e: IrrigationEvent, w: TimeWindow, now: number): number {
  const ew = eventWindow(e, now);
  const duration = ew.end - ew.start;
  if (duration <= 0) return ew.start >= w.start && ew.start < w.end ? 1 : 0;
  return overlapMs(ew, w) / duration;
}

/** Irrigation runs plus the instant from which the stored history is complete. */
export interface IrrigationHistory {
  events: IrrigationEvent[];
  coveredFrom: number;
}

export function volumeIn(events: IrrigationEvent[], w: TimeWindow, now: number): number {
  let total = 0;
  for (const e of events) total += e.volumeM3 * share(e, w, now);
  return total;
}

/** Energy in window; events without pump metering are excluded (and counted). */
export function energyIn(events: IrrigationEvent[], w: TimeWindow, now: number): { kWh: number; unmeteredEvents: number } {
  let kWh = 0;
  let unmeteredEvents = 0;
  for (const e of events) {
    const s = share(e, w, now);
    if (s === 0) continue;
    if (e.energyKWh === null) unmeteredEvents++;
    else kWh += e.energyKWh * s;
  }
  return { kWh, unmeteredEvents };
}

/** A window is only comparable if the stored history fully covers it. */
export function hasHistoryFor(history: IrrigationHistory, w: TimeWindow): boolean {
  return history.coveredFrom <= w.start;
}

export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface WaterSeriesPoint {
  start: number;
  end: number;
  /** `null` for buckets in the future. */
  current: number | null;
  /** `null` when the history does not cover the comparison bucket. */
  previous: number | null;
}

export function waterSeries(history: IrrigationHistory, period: Period, now: number): WaterSeriesPoint[] {
  const { events } = history;
  return period.buckets.map((b) => ({
    start: b.start,
    end: b.end,
    current: b.isFuture ? null : volumeIn(events, { start: b.start, end: Math.min(b.end, now) }, now),
    previous: hasHistoryFor(history, b.previous) ? volumeIn(events, b.previous, now) : null,
  }));
}

export interface WaterSummary {
  totalM3: number;
  previousM3: number | null;
  changePct: number | null;
  /** Target for the whole period (daily target × days), or `null` if not configured. */
  targetM3: number | null;
  targetUsedPct: number | null;
}

export function waterSummary(history: IrrigationHistory, period: Period, now: number, dailyTargetM3: number | null): WaterSummary {
  const totalM3 = volumeIn(history.events, period.current, now);
  const previousM3 = hasHistoryFor(history, period.previous) ? volumeIn(history.events, period.previous, now) : null;
  const targetM3 = dailyTargetM3 === null ? null : dailyTargetM3 * period.days;
  return {
    totalM3,
    previousM3,
    changePct: percentChange(totalM3, previousM3),
    targetM3,
    targetUsedPct: targetM3 ? (totalM3 / targetM3) * 100 : null,
  };
}

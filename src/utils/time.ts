import type { DateRangeKey } from '../config/app';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Half-open interval [start, end) in epoch milliseconds. */
export interface TimeWindow {
  start: number;
  end: number;
}

export interface Bucket extends TimeWindow {
  /** Window in the previous period that this bucket is compared with. */
  previous: TimeWindow;
  /** Bucket starts after "now"; it has no data yet. */
  isFuture: boolean;
}

export interface Period {
  range: DateRangeKey;
  /** From the start of the period to "now". */
  current: TimeWindow;
  /** Same length, shifted back by one period. */
  previous: TimeWindow;
  granularity: 'hour' | 'day';
  buckets: Bucket[];
  /** Number of calendar days the period covers (for daily targets). */
  days: number;
}

const RANGE_DAYS: Record<DateRangeKey, number> = { today: 1, '7d': 7, '30d': 30 };

function startOfLocalDay(ms: number, daysOffset = 0): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d.getTime();
}

/**
 * Builds the reporting period for a range key. Periods end at `now`; the
 * previous period is the same window one period earlier, so partial days
 * are compared like-for-like ("today so far" vs "yesterday until this time").
 */
export function getPeriod(range: DateRangeKey, now: Date): Period {
  const nowMs = now.getTime();
  const days = RANGE_DAYS[range];
  const shift = days * DAY_MS;
  const start = startOfLocalDay(nowMs, -(days - 1));
  const buckets: Bucket[] = [];

  if (range === 'today') {
    for (let h = 0; h < 24; h++) {
      const s = start + h * HOUR_MS;
      buckets.push({ start: s, end: s + HOUR_MS, previous: { start: s - DAY_MS, end: s + HOUR_MS - DAY_MS }, isFuture: s >= nowMs });
    }
  } else {
    for (let i = 0; i < days; i++) {
      const s = startOfLocalDay(start, i);
      const e = startOfLocalDay(start, i + 1);
      buckets.push({ start: s, end: e, previous: { start: s - shift, end: e - shift }, isFuture: s >= nowMs });
    }
  }

  return {
    range,
    current: { start, end: nowMs },
    previous: { start: start - shift, end: nowMs - shift },
    granularity: range === 'today' ? 'hour' : 'day',
    buckets,
    days,
  };
}

export function overlapMs(a: TimeWindow, b: TimeWindow): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

export const toMs = (iso: string) => new Date(iso).getTime();

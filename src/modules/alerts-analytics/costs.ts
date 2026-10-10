/**
 * Module 3D — cost estimation. Combines metered water and pump energy (3A)
 * with configured tariffs. Estimates only; savings are never computed here
 * because no validated baseline exists yet.
 */
import type { IrrigationEvent, ResourceTariff } from '../../types/domain';
import type { Period, TimeWindow } from '../../utils/time';
import { energyIn, hasHistoryFor, percentChange, volumeIn, type IrrigationHistory } from '../water-crop/water';

export interface CostBreakdown {
  waterM3: number;
  energyKWh: number;
  waterCost: number;
  energyCost: number;
  total: number;
  /** Runs without pump energy metering — the energy figure excludes them. */
  unmeteredEnergyEvents: number;
}

export function costFor(events: IrrigationEvent[], w: TimeWindow, now: number, tariff: ResourceTariff): CostBreakdown {
  const waterM3 = volumeIn(events, w, now);
  const { kWh, unmeteredEvents } = energyIn(events, w, now);
  const waterCost = waterM3 * tariff.waterPricePerM3;
  const energyCost = kWh * tariff.electricityPricePerKWh;
  return { waterM3, energyKWh: kWh, waterCost, energyCost, total: waterCost + energyCost, unmeteredEnergyEvents: unmeteredEvents };
}

export interface CostSummary {
  current: CostBreakdown;
  previous: CostBreakdown | null;
  changePct: number | null;
  series: { start: number; end: number; water: number | null; energy: number | null }[];
}

export function costSummary(history: IrrigationHistory, period: Period, now: number, tariff: ResourceTariff): CostSummary {
  const { events } = history;
  const current = costFor(events, period.current, now, tariff);
  const previous = hasHistoryFor(history, period.previous) ? costFor(events, period.previous, now, tariff) : null;
  const series = period.buckets.map((b) => {
    if (b.isFuture) return { start: b.start, end: b.end, water: null, energy: null };
    const c = costFor(events, { start: b.start, end: Math.min(b.end, now) }, now, tariff);
    return { start: b.start, end: b.end, water: c.waterCost, energy: c.energyCost };
  });
  return { current, previous, changePct: percentChange(current.total, previous?.total ?? null), series };
}

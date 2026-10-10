import type { Farm, FarmSnapshot } from '../types/domain';
import { DAY_MS, HOUR_MS } from '../utils/time';
import type { FarmSenseApi } from './types';

/** Longest period shown (30 days) plus its comparison period, with a day of margin. */
const HISTORY_DAYS = 61;

/**
 * Assembles the Farm Overview snapshot from the per-module APIs (3A–3D).
 * Module calls run in parallel; irrigation history is requested relative to
 * the telemetry timestamp so every figure refers to the same instant.
 */
export async function loadFarmSnapshot(api: FarmSenseApi, farm: Farm): Promise<FarmSnapshot> {
  const [setup, animals, registry, latest] = await Promise.all([
    api.waterCrop.getSetup(farm.id),
    api.livestock.listAnimals(farm.id),
    api.devices.getRegistry(farm.id),
    api.devices.getLatestReadings(farm.id),
  ]);
  const asOfMs = new Date(latest.asOf).getTime();
  // Hour buckets are keyed by their start, so the current (partial) hour needs an exclusive end after `asOf`.
  const [irrigation, herdActivity] = await Promise.all([
    api.waterCrop.listIrrigationEvents(farm.id, new Date(asOfMs - HISTORY_DAYS * DAY_MS).toISOString(), latest.asOf),
    api.livestock.getHerdActivity(farm.id, new Date(Math.floor(asOfMs / HOUR_MS) * HOUR_MS - 23 * HOUR_MS).toISOString(), new Date(asOfMs + 1).toISOString()),
  ]);

  return {
    farm,
    ...setup,
    irrigationEvents: irrigation.events,
    irrigationCoveredFrom: irrigation.coveredFrom,
    animals,
    herdActivity,
    ...registry,
    latestReadings: latest.readings,
    asOf: latest.asOf,
  };
}

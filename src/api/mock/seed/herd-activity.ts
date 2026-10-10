/**
 * Simulated hourly herd aggregates (analytics layer). Each species follows a
 * grazing day — peaks after dawn and before dusk, quiet at night — with
 * rumination concentrated in the resting hours. The current hour is taken
 * from the latest tag readings, so the chart ends where the KPIs are.
 */
import { SPECIES_CONFIG } from '../../../config/app';
import type { FarmSnapshot, HerdActivityBucket, Species } from '../../../types/domain';
import { indexSnapshot, resolveReading, sensorOf, usableValue } from '../../../modules/devices/telemetry';
import { HOUR_MS, toMs } from '../../../utils/time';
import { createRng, hashSeed, round } from './builder';

const shape = (h: number) =>
  0.45 + 0.9 * Math.exp(-((h - 7) ** 2) / 4.5) + 1.0 * Math.exp(-((h - 18) ** 2) / 4) + 0.35 * Math.exp(-((h - 12.5) ** 2) / 6);
const SHAPE_MEAN = Array.from({ length: 24 }, (_, h) => shape(h)).reduce((a, b) => a + b, 0) / 24;
/** Activity relative to the daily mean (mean = 1). */
const diurnal = (h: number) => shape(h) / SHAPE_MEAN;

export function herdActivityHistory(base: Omit<FarmSnapshot, 'herdActivity'>, hours: number): HerdActivityBucket[] {
  const idx = indexSnapshot({ ...base, herdActivity: [] });
  const currentHour = Math.floor(idx.now / HOUR_MS) * HOUR_MS;
  const buckets: HerdActivityBucket[] = [];

  const bySpecies = new Map<Species, typeof base.animals>();
  for (const a of base.animals) {
    if (SPECIES_CONFIG[a.species].monitoring !== 'individual' || !a.monitoringDeviceId) continue;
    bySpecies.set(a.species, [...(bySpecies.get(a.species) ?? []), a]);
  }

  for (const [species, animals] of bySpecies) {
    const ruminant = SPECIES_CONFIG[species].metrics.includes('rumination');
    const current = animals
      .map((a) => {
        const v = usableValue(resolveReading(idx, sensorOf(idx, a.monitoringDeviceId, 'activity')));
        return v !== null && a.activityBaseline ? (v / a.activityBaseline) * 100 : null;
      })
      .filter((v): v is number => v !== null);

    for (let h = hours - 1; h >= 0; h--) {
      const start = currentHour - h * HOUR_MS;
      const rng = createRng(hashSeed(`${base.farm.id}:${species}:${start}`));
      const hourOfDay = new Date(start).getHours();
      const reportingTags = animals.filter((a) => {
        const seen = idx.devices.get(a.monitoringDeviceId as string)?.lastSeenAt;
        return seen !== null && seen !== undefined && toMs(seen) >= start;
      }).length;
      const generated = 100 * diurnal(hourOfDay) * rng.between(0.93, 1.07);
      const activity = h === 0 ? (current.length ? current.reduce((s, v) => s + v, 0) / current.length : null) : generated;
      buckets.push({
        species,
        hourStart: new Date(start).toISOString(),
        activityPctOfBaseline: reportingTags && activity !== null ? round(activity, 1) : null,
        // ~480 min/day, shifted towards the resting hours.
        ruminationMin: ruminant && reportingTags ? round(Math.min(45, 20 * (1.45 - 0.45 * diurnal(hourOfDay)) * rng.between(0.92, 1.08)), 1) : null,
        reportingTags,
      });
    }
  }
  return buckets.sort((a, b) => a.hourStart.localeCompare(b.hourStart) || a.species.localeCompare(b.species));
}

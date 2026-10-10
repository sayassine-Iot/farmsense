import type { Animal, IrrigationZone, Species } from '../../../types/domain';
import { round, type Rng, type SnapshotBuilder } from './builder';

const MINUTE = 60_000;

export interface IrrigationSlot {
  hour: number;
  minute?: number;
  durationMin: number;
  /** Run every N days… */
  everyNDays: number;
  /** …offset so zones sharing a pump are staggered. */
  dayOffset: number;
}

export interface ZoneSpec {
  zone: IrrigationZone;
  /** Pump specific energy, kWh per m³ pumped. `null` = no pump metering. */
  kWhPerM3: number | null;
  slots: IrrigationSlot[];
  /** A run currently in progress. */
  running?: { startedMinAgo: number; flowRatio: number };
  /** Flow meter stopped reporting this many minutes ago; later runs are unmetered. */
  meterOfflineMinAgo?: number;
}

function localMidnight(now: Date, daysAgo: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/**
 * Generates metered irrigation runs for the last `days` days.
 * These runs are the single source of truth for water and pump-energy use.
 */
export function generateIrrigationEvents(
  b: SnapshotBuilder,
  rng: Rng,
  specs: ZoneSpec[],
  opts: { days: number; rainDays: number[] },
): void {
  const nowMs = b.now.getTime();
  for (let d = opts.days; d >= 0; d--) {
    const midnight = localMidnight(b.now, d);
    // Late summer → autumn: older days needed slightly longer runs.
    const seasonal = 1 + 0.18 * (d / opts.days);
    for (const spec of specs) {
      const runningStart = spec.running ? nowMs - spec.running.startedMinAgo * MINUTE : Infinity;
      const meterCutoff =
        spec.meterOfflineMinAgo !== undefined ? nowMs - spec.meterOfflineMinAgo * MINUTE : Infinity;
      for (const [i, slot] of spec.slots.entries()) {
        // Always draw random numbers so the series does not depend on the time of day.
        const jitterMin = rng.between(-12, 12);
        const durFactor = rng.between(0.9, 1.1);
        const flowFactor = rng.between(0.93, 1.03);
        const energyFactor = rng.between(0.95, 1.05);

        if (opts.rainDays.includes(d)) continue;
        if ((d + slot.dayOffset) % slot.everyNDays !== 0) continue;

        const start = midnight.getTime() + ((slot.hour * 60 + (slot.minute ?? 0) + jitterMin) * MINUTE);
        const durationMin = slot.durationMin * durFactor * seasonal;
        const end = start + durationMin * MINUTE;
        if (end > nowMs || end > runningStart || start > meterCutoff) continue;

        const volumeM3 = round(spec.zone.designFlowM3h * flowFactor * (durationMin / 60), 2);
        b.events.push({
          id: `ev-${spec.zone.id}-${d}-${i}`,
          zoneId: spec.zone.id,
          startedAt: new Date(start).toISOString(),
          endedAt: new Date(end).toISOString(),
          volumeM3,
          energyKWh: spec.kWhPerM3 === null ? null : round(volumeM3 * spec.kWhPerM3 * energyFactor, 2),
        });
      }
    }
  }

  for (const spec of specs) {
    if (!spec.running) continue;
    const { startedMinAgo, flowRatio } = spec.running;
    const volumeM3 = round(spec.zone.designFlowM3h * flowRatio * (startedMinAgo / 60), 2);
    b.events.push({
      id: `ev-${spec.zone.id}-running`,
      zoneId: spec.zone.id,
      startedAt: b.ago(startedMinAgo),
      endedAt: null,
      volumeM3,
      energyKWh: spec.kWhPerM3 === null ? null : round(volumeM3 * spec.kWhPerM3, 2),
    });
  }

  b.events.sort((a, c) => a.startedAt.localeCompare(c.startedAt));
}

export interface AnimalOverride {
  activityRatio?: number;
  bodyTemperatureC?: number;
  lastSeenMinAgo?: number;
  batteryPct?: number;
}

/** Adds a herd of individually tagged animals; the first `tagged` animals carry a tag. */
export function addHerd(
  b: SnapshotBuilder,
  rng: Rng,
  opts: {
    species: Exclude<Species, 'poultry'>;
    prefix: string;
    count: number;
    tagged: number;
    group: string;
    names?: string[];
    metrics: { rumination?: boolean; bodyTemperature?: [number, number] };
    overrides?: Record<number, AnimalOverride>;
  },
): void {
  for (let i = 0; i < opts.count; i++) {
    const id = `${b.farmId}-${opts.prefix}-${String(i + 1).padStart(3, '0')}`;
    const tagNumber = `${opts.prefix.toUpperCase()}-${String(101 + i).padStart(4, '0')}`;
    const o = opts.overrides?.[i] ?? {};
    const baseline = round(rng.between(80, 120), 0);
    const ratio = o.activityRatio ?? rng.between(0.86, 1.14);
    const lastSeen = o.lastSeenMinAgo ?? rng.int(2, 22);
    const battery = o.batteryPct ?? rng.int(34, 96);
    const rumination = rng.int(430, 540);
    const temp = opts.metrics.bodyTemperature
      ? rng.between(opts.metrics.bodyTemperature[0], opts.metrics.bodyTemperature[1])
      : 0;

    const isTagged = i < opts.tagged;
    let deviceId: string | null = null;
    if (isTagged) {
      const dev = b.device({
        id: `tag-${id}`,
        name: `Tag ${tagNumber}`,
        type: 'livestock_tag',
        assignedTo: { kind: 'animal', id },
        lastSeenMinAgo: lastSeen,
        batteryPct: battery,
      });
      deviceId = dev.id;
      b.sensor(dev, 'activity', 15, { value: round(baseline * ratio, 0) });
      if (opts.metrics.rumination) b.sensor(dev, 'rumination', 60, { value: rumination });
      if (opts.metrics.bodyTemperature) {
        b.sensor(dev, 'body_temperature', 30, { value: round(o.bodyTemperatureC ?? temp, 1) });
      }
    }

    const animal: Animal = {
      id,
      farmId: b.farmId,
      species: opts.species,
      tagNumber,
      name: opts.names?.[i] ?? null,
      group: opts.group,
      headcount: 1,
      monitoringDeviceId: deviceId,
      activityBaseline: isTagged ? baseline : null,
    };
    b.animals.push(animal);
  }
}

export function addFlock(
  b: SnapshotBuilder,
  opts: {
    code: string;
    group: string;
    headcount: number;
    sensor: { temperatureC: number; humidityPct: number; lastSeenMinAgo: number } | null;
  },
): void {
  const id = `${b.farmId}-flock-${opts.code.toLowerCase()}`;
  let deviceId: string | null = null;
  if (opts.sensor) {
    const dev = b.device({
      id: `barn-${id}`,
      name: `${opts.group} climate sensor`,
      type: 'barn_sensor',
      assignedTo: { kind: 'animal', id },
      lastSeenMinAgo: opts.sensor.lastSeenMinAgo,
      batteryPct: null,
    });
    deviceId = dev.id;
    b.sensor(dev, 'air_temperature', 10, { value: opts.sensor.temperatureC });
    b.sensor(dev, 'air_humidity', 10, { value: opts.sensor.humidityPct });
  }
  b.animals.push({
    id,
    farmId: b.farmId,
    species: 'poultry',
    tagNumber: opts.code,
    name: null,
    group: opts.group,
    headcount: opts.headcount,
    monitoringDeviceId: deviceId,
    activityBaseline: null,
  });
}

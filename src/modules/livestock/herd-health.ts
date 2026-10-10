import { DATA_QUALITY, SPECIES_CONFIG } from '../../config/app';
import type { Alert, AlertType, SensorKind, Species } from '../../types/domain';
import { HOUR_MS, toMs } from '../../utils/time';
import { resolveReading, sensorOf, type SnapshotIndex } from '../devices/telemetry';
import { animalStates, animalsToCheck, type AnimalCheckRow, type AnimalState } from './calculations';

/** Health signals, in display order, with the alert each one raises. */
export const HEALTH_SIGNALS = [
  { key: 'respiration', alert: 'respiration_high', sensor: 'respiration_rate' },
  { key: 'activity', alert: 'activity_deviation', sensor: 'activity' },
  { key: 'temperature', alert: 'body_temperature_high', sensor: 'body_temperature' },
  { key: 'rumination', alert: 'rumination_low', sensor: 'rumination' },
  { key: 'heartRate', alert: 'heart_rate_high', sensor: 'heart_rate' },
] as const satisfies readonly { key: string; alert: AlertType; sensor: SensorKind }[];
export type HealthSignal = (typeof HEALTH_SIGNALS)[number]['key'];

/** Tag sensors shown in the coverage card, in display order. */
export const COVERAGE_SENSORS = ['activity', 'body_temperature', 'respiration_rate', 'heart_rate', 'position'] as const satisfies readonly SensorKind[];
export type CoverageSensor = (typeof COVERAGE_SENSORS)[number];

/** Mutually exclusive health state of each animal; head counts sum to the herd. */
export type HerdStatus = 'healthy' | 'warning' | 'critical' | 'offline' | 'untagged';
export const HERD_STATUSES: HerdStatus[] = ['healthy', 'warning', 'critical', 'offline', 'untagged'];

export interface HerdActivityPoint {
  hourStart: number;
  activityPctOfBaseline: number | null;
  ruminationMin: number | null;
}

export interface HerdHealth {
  /** Individually tagged species present on the farm (poultry flocks are excluded). */
  speciesAvailable: Species[];
  totalHead: number;
  status: Record<HerdStatus, number>;
  /** Animals with alerts or a silent tag, most urgent first. */
  toCheck: AnimalCheckRow[];
  tags: { total: number; online: number; offline: number; lowBattery: number; avgBatteryPct: number | null };
  /** Animals with an unresolved alert on each signal; `null` = no animal in scope measures it. */
  signals: { key: HealthSignal; animals: number | null }[];
  /**
   * Per sensor: tags delivering a usable reading out of the tags whose species
   * supports it, as a share (0–100). `null` = no tag in scope supports it.
   */
  coverage: { sensor: CoverageSensor; pct: number | null; reporting: number; eligible: number }[];
  /** Last 24 hourly points, oldest first; the last one is the current hour. */
  activity: HerdActivityPoint[];
  /** The scope includes a species that measures rumination. */
  hasRumination: boolean;
}

const isHerdSpecies = (s: Species) => SPECIES_CONFIG[s].monitoring === 'individual';

function statusOf(s: AnimalState): HerdStatus {
  if (s.alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (s.alerts.length) return 'warning';
  if (!s.equipped) return 'untagged';
  return s.monitored ? 'healthy' : 'offline';
}

/**
 * Herd Health view of the snapshot for individually tagged animals,
 * optionally narrowed to one species. Every figure is derived here from the
 * same records, so the KPIs, donut, attention list and table reconcile.
 */
export function herdHealth(idx: SnapshotIndex, alerts: Alert[], species: Species | 'all'): HerdHealth {
  const all = animalStates(idx, alerts).filter((s) => isHerdSpecies(s.animal.species));
  const speciesAvailable = [...new Set(all.map((s) => s.animal.species))];
  const states = species === 'all' ? all : all.filter((s) => s.animal.species === species);
  const inScope = new Set(states.map((s) => s.animal.id));

  const status: Record<HerdStatus, number> = { healthy: 0, warning: 0, critical: 0, offline: 0, untagged: 0 };
  for (const s of states) status[statusOf(s)] += s.animal.headcount;

  const tagged = states.filter((s) => s.equipped);
  const batteries = tagged
    .map((s) => idx.devices.get(s.animal.monitoringDeviceId as string)?.batteryPct ?? null)
    .filter((b): b is number => b !== null);
  const online = tagged.filter((s) => s.monitored).length;

  const signals = HEALTH_SIGNALS.map(({ key, alert, sensor }) => {
    const measured = states.some((s) => SPECIES_CONFIG[s.animal.species].metrics.includes(sensor));
    const animals = new Set(
      alerts
        .filter((a) => a.type === alert && a.status !== 'resolved' && a.target.kind === 'animal' && inScope.has(a.target.id))
        .map((a) => a.target.id),
    ).size;
    return { key, animals: measured || animals ? animals : null };
  });

  // Measured against the tags of species whose hardware supports the sensor.
  const coverage = COVERAGE_SENSORS.map((sensor) => {
    const eligible = tagged.filter((s) => SPECIES_CONFIG[s.animal.species].metrics.includes(sensor));
    const reporting = eligible.filter((s) => resolveReading(idx, sensorOf(idx, s.animal.monitoringDeviceId, sensor)).quality === 'ok').length;
    return { sensor, reporting, eligible: eligible.length, pct: eligible.length ? (reporting / eligible.length) * 100 : null };
  });

  // Hourly series: species buckets combined, weighted by reporting tags.
  const byHour = new Map<number, { act: number; actW: number; rum: number; rumW: number }>();
  for (const b of idx.snapshot.herdActivity) {
    if (!isHerdSpecies(b.species) || (species !== 'all' && b.species !== species)) continue;
    const key = toMs(b.hourStart);
    const acc = byHour.get(key) ?? { act: 0, actW: 0, rum: 0, rumW: 0 };
    if (b.activityPctOfBaseline !== null) {
      acc.act += b.activityPctOfBaseline * b.reportingTags;
      acc.actW += b.reportingTags;
    }
    if (b.ruminationMin !== null) {
      acc.rum += b.ruminationMin * b.reportingTags;
      acc.rumW += b.reportingTags;
    }
    byHour.set(key, acc);
  }
  const lastHour = Math.floor(idx.now / HOUR_MS) * HOUR_MS;
  const activity: HerdActivityPoint[] = [];
  for (let h = lastHour - 23 * HOUR_MS; h <= lastHour; h += HOUR_MS) {
    const acc = byHour.get(h);
    activity.push({
      hourStart: h,
      activityPctOfBaseline: acc?.actW ? acc.act / acc.actW : null,
      ruminationMin: acc?.rumW ? acc.rum / acc.rumW : null,
    });
  }

  return {
    speciesAvailable,
    totalHead: states.reduce((n, s) => n + s.animal.headcount, 0),
    status,
    toCheck: animalsToCheck(idx, states),
    tags: {
      total: tagged.length,
      online,
      offline: tagged.length - online,
      lowBattery: batteries.filter((b) => b <= DATA_QUALITY.lowBatteryPct).length,
      avgBatteryPct: batteries.length ? batteries.reduce((a, b) => a + b, 0) / batteries.length : null,
    },
    signals,
    coverage,
    activity,
    hasRumination: states.some((s) => SPECIES_CONFIG[s.animal.species].metrics.includes('rumination')),
  };
}

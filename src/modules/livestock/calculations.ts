import { ALERT_RULES, SPECIES_CONFIG, SUPPORTED_SPECIES } from '../../config/app';
import type { Alert, Animal, Species } from '../../types/domain';
import { isDeviceOnline, resolveReading, sensorOf, usableValue, type SnapshotIndex } from '../devices/telemetry';
import { isUnresolved } from '../alerts-analytics/alerts';

export interface AnimalState {
  animal: Animal;
  /** Has a monitoring device that is currently online. */
  monitored: boolean;
  /** Has a device assigned, whether online or not. */
  equipped: boolean;
  /** Unresolved warning/critical alerts concerning this animal. */
  alerts: Alert[];
}

export function animalStates(idx: SnapshotIndex, alerts: Alert[]): AnimalState[] {
  const byAnimal = new Map<string, Alert[]>();
  for (const a of alerts) {
    if (a.target.kind !== 'animal' || !isUnresolved(a) || a.severity === 'info') continue;
    byAnimal.set(a.target.id, [...(byAnimal.get(a.target.id) ?? []), a]);
  }
  return idx.snapshot.animals.map((animal) => {
    const device = animal.monitoringDeviceId ? idx.devices.get(animal.monitoringDeviceId) : undefined;
    return {
      animal,
      equipped: Boolean(device),
      monitored: device ? isDeviceOnline(device, idx.now) : false,
      alerts: byAnimal.get(animal.id) ?? [],
    };
  });
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export interface SpeciesSummary {
  species: Species;
  head: number;
  monitoredHead: number;
  /** Animals (or flocks) with unresolved alerts. */
  attention: number;
  /** Only metrics this species' hardware supports are computed; others stay `null`. */
  metrics: {
    activityPctOfBaseline: number | null;
    ruminationMinPerDay: number | null;
    bodyTemperatureC: number | null;
    housingTemperatureC: number | null;
    housingHumidityPct: number | null;
  };
}

export interface LivestockSummary {
  totalHead: number;
  monitoredHead: number;
  /** Monitored head without unresolved alerts. */
  normalHead: number;
  /** Animals (or flocks) with unresolved warning/critical alerts. */
  withAlerts: number;
  /** Monitored head without alerts, as a share of monitored head (0–100). */
  normalPct: number | null;
  species: SpeciesSummary[];
}

function speciesMetrics(idx: SnapshotIndex, states: AnimalState[], species: Species): SpeciesSummary['metrics'] {
  const supported = SPECIES_CONFIG[species].metrics;
  const values = (kind: Parameters<typeof sensorOf>[2]) =>
    supported.includes(kind)
      ? states
          .filter((s) => s.monitored)
          .map((s) => usableValue(resolveReading(idx, sensorOf(idx, s.animal.monitoringDeviceId, kind))))
          .filter((v): v is number => v !== null)
      : [];
  const activityRatios = supported.includes('activity')
    ? states
        .filter((s) => s.monitored && s.animal.activityBaseline)
        .map((s) => {
          const v = usableValue(resolveReading(idx, sensorOf(idx, s.animal.monitoringDeviceId, 'activity')));
          return v === null ? null : (v / (s.animal.activityBaseline as number)) * 100;
        })
        .filter((v): v is number => v !== null)
    : [];
  return {
    activityPctOfBaseline: mean(activityRatios),
    ruminationMinPerDay: mean(values('rumination')),
    bodyTemperatureC: mean(values('body_temperature')),
    housingTemperatureC: mean(values('air_temperature')),
    housingHumidityPct: mean(values('air_humidity')),
  };
}

export function livestockSummary(idx: SnapshotIndex, states: AnimalState[]): LivestockSummary {
  const sum = (list: AnimalState[], pick: (s: AnimalState) => boolean) =>
    list.filter(pick).reduce((n, s) => n + s.animal.headcount, 0);

  const species = SUPPORTED_SPECIES.map((sp): SpeciesSummary | null => {
    const list = states.filter((s) => s.animal.species === sp);
    if (!list.length) return null;
    return {
      species: sp,
      head: sum(list, () => true),
      monitoredHead: sum(list, (s) => s.monitored),
      attention: list.filter((s) => s.alerts.length > 0).length,
      metrics: speciesMetrics(idx, list, sp),
    };
  }).filter((s): s is SpeciesSummary => s !== null);

  const monitoredHead = sum(states, (s) => s.monitored);
  const normalHead = sum(states, (s) => s.monitored && s.alerts.length === 0);
  return {
    totalHead: sum(states, () => true),
    monitoredHead,
    normalHead,
    withAlerts: states.filter((s) => s.alerts.length > 0).length,
    normalPct: monitoredHead ? (normalHead / monitoredHead) * 100 : null,
    species,
  };
}

export type ActivityLevel = 'low' | 'normal' | 'high';

export interface AnimalCheckRow {
  state: AnimalState;
  /** `alert` = critical alert, `monitor` = warning, `offline` = tag not reporting. */
  status: 'alert' | 'monitor' | 'offline';
  activityPct: number | null;
  activityLevel: ActivityLevel | null;
  bodyTemperatureC: number | null;
  batteryPct: number | null;
  lastUpdate: string | null;
}

/**
 * Animals a farmer should look at: unresolved warning/critical alerts, or an
 * assigned monitoring device that has stopped reporting. Values that are not
 * fresh are returned as `null` (shown as unavailable, never as zero).
 */
export function animalsToCheck(idx: SnapshotIndex, states: AnimalState[]): AnimalCheckRow[] {
  const rows: AnimalCheckRow[] = [];
  for (const state of states) {
    const { animal } = state;
    const offline = state.equipped && !state.monitored;
    if (!state.alerts.length && !offline) continue;
    const device = animal.monitoringDeviceId ? idx.devices.get(animal.monitoringDeviceId) : undefined;
    const activity = usableValue(resolveReading(idx, sensorOf(idx, animal.monitoringDeviceId, 'activity')));
    const activityPct = activity !== null && animal.activityBaseline ? (activity / animal.activityBaseline) * 100 : null;
    const activityLevel: ActivityLevel | null =
      activityPct === null ? null : activityPct < ALERT_RULES.activityLowRatio * 100 ? 'low' : activityPct > ALERT_RULES.activityHighRatio * 100 ? 'high' : 'normal';
    rows.push({
      state,
      status: state.alerts.some((a) => a.severity === 'critical') ? 'alert' : state.alerts.length ? 'monitor' : 'offline',
      activityPct,
      activityLevel,
      bodyTemperatureC: usableValue(resolveReading(idx, sensorOf(idx, animal.monitoringDeviceId, 'body_temperature'))),
      batteryPct: device?.batteryPct ?? null,
      lastUpdate: device?.lastSeenAt ?? null,
    });
  }
  const rank = { alert: 0, monitor: 1, offline: 2 };
  return rows.sort((a, b) => rank[a.status] - rank[b.status]);
}

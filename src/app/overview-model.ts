import type { DateRangeKey } from '../config/app';
import type { Alert, FarmSnapshot, ResourceTariff } from '../types/domain';
import { getPeriod, type Period } from '../utils/time';
import { countAlerts, prioritizeAlerts, type AlertCounts } from '../modules/alerts-analytics/alerts';
import { fieldConditions, type FieldCondition } from '../modules/water-crop/fields';
import { deviceHealth, type DeviceHealthSummary } from '../modules/devices/calculations';
import { indexSnapshot, lastDataUpdate, resolveReading, type SnapshotIndex } from '../modules/devices/telemetry';
import { animalStates, livestockSummary, type AnimalState, type LivestockSummary } from '../modules/livestock/calculations';
import { costSummary, type CostSummary } from '../modules/alerts-analytics/costs';
import { waterSeries, waterSummary, type IrrigationHistory, type WaterSeriesPoint, type WaterSummary } from '../modules/water-crop/water';
import { irrigationSummary, zoneRows, type IrrigationSummary, type ZoneRow } from '../modules/water-crop/zones';

/**
 * Layer 1 view model. Composes the 3A–3D module calculations into
 * every figure on the Farm Overview, derived in one place from one snapshot.
 * Components only render slices of this model, which keeps KPI cards,
 * charts and tables reconciled with each other.
 */
export interface OverviewModel {
  idx: SnapshotIndex;
  now: number;
  period: Period;
  lastUpdate: string | null;
  water: WaterSummary;
  waterSeries: WaterSeriesPoint[];
  /** Zones whose flow meter is not delivering usable data. */
  unmeteredZones: number;
  irrigation: IrrigationSummary;
  zones: ZoneRow[];
  fields: FieldCondition[];
  animals: AnimalState[];
  livestock: LivestockSummary;
  devices: DeviceHealthSummary;
  alerts: Alert[];
  alertCounts: AlertCounts;
  costs: CostSummary;
  tariff: ResourceTariff;
}

export function buildOverview(
  snapshot: FarmSnapshot,
  alerts: Alert[],
  range: DateRangeKey,
  tariff: ResourceTariff,
): OverviewModel {
  const idx = indexSnapshot(snapshot);
  const now = idx.now;
  const period = getPeriod(range, new Date(now));
  const history: IrrigationHistory = { events: snapshot.irrigationEvents, coveredFrom: new Date(snapshot.irrigationCoveredFrom).getTime() };
  const zones = zoneRows(idx, alerts, period.current);
  const animals = animalStates(idx, alerts);

  return {
    idx,
    now,
    period,
    lastUpdate: lastDataUpdate(idx),
    water: waterSummary(history, period, now, snapshot.farm.dailyWaterTargetM3),
    waterSeries: waterSeries(history, period, now),
    unmeteredZones: snapshot.zones.filter((z) => resolveReading(idx, z.flowSensorId).quality !== 'ok').length,
    irrigation: irrigationSummary(idx, zones),
    zones,
    fields: fieldConditions(idx),
    animals,
    livestock: livestockSummary(idx, animals),
    devices: deviceHealth(idx),
    alerts: prioritizeAlerts(alerts),
    alertCounts: countAlerts(alerts),
    costs: costSummary(history, period, now, tariff),
    tariff,
  };
}

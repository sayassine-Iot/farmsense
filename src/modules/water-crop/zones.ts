import type { Alert, AlertSeverity, Field, IrrigationZone } from '../../types/domain';
import { resolveReading, sensorOf, usableValue, type ReadingQuality, type SnapshotIndex } from '../devices/telemetry';
import { isUnresolved, severityRank } from '../alerts-analytics/alerts';
import { volumeIn } from './water';
import type { TimeWindow } from '../../utils/time';

export type ZoneStatus = 'irrigating' | 'idle' | 'no_data';
export type EquipmentState = 'on' | 'off' | 'unknown' | 'none';

export interface ZoneRow {
  zone: IrrigationZone;
  field: Field | null;
  status: ZoneStatus;
  flowM3h: number | null;
  flowQuality: ReadingQuality;
  volumeM3: number;
  valve: EquipmentState;
  pump: EquipmentState;
  pumpName: string | null;
  lastUpdate: string | null;
  alertCount: number;
  topSeverity: AlertSeverity | null;
}

function equipmentState(idx: SnapshotIndex, deviceId: string | null, kind: 'valve_state' | 'pump_state'): EquipmentState {
  if (!deviceId) return 'none';
  const v = usableValue(resolveReading(idx, sensorOf(idx, deviceId, kind)));
  if (v === null) return 'unknown';
  return v > 0 ? 'on' : 'off';
}

/** Alerts that concern a zone: the zone itself or one of its devices. */
export function zoneAlerts(zone: IrrigationZone, alerts: Alert[], idx: SnapshotIndex): Alert[] {
  const flowDevice = zone.flowSensorId ? idx.sensors.get(zone.flowSensorId)?.deviceId : undefined;
  const deviceIds = new Set([flowDevice, zone.valveDeviceId].filter(Boolean));
  return alerts.filter(
    (a) =>
      isUnresolved(a) &&
      ((a.target.kind === 'zone' && a.target.id === zone.id) || (a.target.kind === 'device' && deviceIds.has(a.target.id))),
  );
}

export function zoneRows(idx: SnapshotIndex, alerts: Alert[], window: TimeWindow): ZoneRow[] {
  const fields = new Map(idx.snapshot.fields.map((f) => [f.id, f]));
  return idx.snapshot.zones.map((zone) => {
    const events = idx.snapshot.irrigationEvents.filter((e) => e.zoneId === zone.id);
    const flow = resolveReading(idx, zone.flowSensorId);
    const running = events.some((e) => e.endedAt === null);
    const flowM3h = usableValue(flow);
    const status: ZoneStatus = flowM3h === null ? 'no_data' : running ? 'irrigating' : 'idle';
    const related = zoneAlerts(zone, alerts, idx).filter((a) => a.severity !== 'info');
    const topSeverity = related.reduce<AlertSeverity | null>(
      (top, a) => (top === null || severityRank(a.severity) > severityRank(top) ? a.severity : top),
      null,
    );
    return {
      zone,
      field: fields.get(zone.fieldId) ?? null,
      status,
      flowM3h,
      flowQuality: flow.quality,
      volumeM3: volumeIn(events, window, idx.now),
      valve: equipmentState(idx, zone.valveDeviceId, 'valve_state'),
      pump: equipmentState(idx, zone.pumpDeviceId, 'pump_state'),
      pumpName: zone.pumpDeviceId ? idx.devices.get(zone.pumpDeviceId)?.name ?? null : null,
      lastUpdate: flow.timestamp,
      alertCount: related.length,
      topSeverity,
    };
  });
}

export interface IrrigationSummary {
  activeZones: number;
  totalZones: number;
  zonesWithWarnings: number;
  zonesWithoutData: number;
  pumps: { running: number; total: number; unknown: number };
}

export function irrigationSummary(idx: SnapshotIndex, rows: ZoneRow[]): IrrigationSummary {
  const pumpIds = idx.snapshot.devices.filter((d) => d.type === 'pump_monitor').map((d) => d.id);
  const pumpStates = pumpIds.map((id) => equipmentState(idx, id, 'pump_state'));
  return {
    activeZones: rows.filter((r) => r.status === 'irrigating').length,
    totalZones: rows.length,
    zonesWithWarnings: rows.filter((r) => r.alertCount > 0).length,
    zonesWithoutData: rows.filter((r) => r.status === 'no_data').length,
    pumps: {
      running: pumpStates.filter((s) => s === 'on').length,
      total: pumpIds.length,
      unknown: pumpStates.filter((s) => s === 'unknown').length,
    },
  };
}

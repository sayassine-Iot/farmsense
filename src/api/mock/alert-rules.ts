/**
 * Demo rules engine: derives alerts from a farm snapshot.
 *
 * In production these rules run server-side on ingested telemetry (with
 * history, hysteresis and de-duplication). Here they guarantee that every
 * alert shown in the demo is consistent with the underlying records.
 * Alerts carry a type and parameters only — wording is localized in the UI.
 */
import { ALERT_RULES, DATA_QUALITY } from '../../config/app';
import type { Alert, AlertSeverity, AlertTarget, AlertType } from '../../types/domain';
import { MINUTE_MS, toMs } from '../../utils/time';
import { fieldConditions } from '../../modules/water-crop/fields';
import { isDeviceOnline, resolveReading, sensorOf, usableValue, type SnapshotIndex } from '../../modules/devices/telemetry';

const iso = (ms: number) => new Date(ms).toISOString();
const r1 = (v: number) => Math.round(v * 10) / 10;

export function evaluateAlertRules(idx: SnapshotIndex): Alert[] {
  const { snapshot, now } = idx;
  const alerts: Alert[] = [];
  const add = (
    type: AlertType,
    severity: AlertSeverity,
    target: AlertTarget,
    createdAtMs: number,
    params: Alert['params'],
    idSuffix = target.id,
  ) =>
    alerts.push({
      id: `${type}:${idSuffix}`,
      farmId: snapshot.farm.id,
      type,
      severity,
      status: 'active',
      target,
      createdAt: iso(Math.min(createdAtMs, now)),
      acknowledgedAt: null,
      resolvedAt: null,
      params,
    });

  // Devices: connectivity and battery
  for (const d of snapshot.devices) {
    if (!isDeviceOnline(d, now)) {
      const lastSeen = d.lastSeenAt ? toMs(d.lastSeenAt) : null;
      add('device_offline', d.type === 'gateway' ? 'critical' : 'warning', { kind: 'device', id: d.id },
        lastSeen === null ? now : lastSeen + DATA_QUALITY.offlineAfterMinutes * MINUTE_MS,
        { device: d.name, minutes: lastSeen === null ? -1 : Math.round((now - lastSeen) / MINUTE_MS) });
    }
    if (d.batteryPct !== null && d.batteryPct <= DATA_QUALITY.lowBatteryPct) {
      add('low_battery', d.batteryPct <= DATA_QUALITY.criticalBatteryPct ? 'warning' : 'info', { kind: 'device', id: d.id },
        d.lastSeenAt ? toMs(d.lastSeenAt) : now, { device: d.name, battery: d.batteryPct });
    }
  }

  // Fields: soil moisture against crop/soil-specific thresholds
  for (const c of fieldConditions(idx)) {
    if (c.status !== 'attention' || c.moisturePct === null || !c.lastUpdate) continue;
    const low = c.deviation === 'low';
    add(low ? 'low_soil_moisture' : 'high_soil_moisture', 'warning', { kind: 'field', id: c.field.id }, toMs(c.lastUpdate), {
      field: c.field.name,
      value: r1(c.moisturePct),
      threshold: low ? c.thresholds.lowPct : c.thresholds.highPct,
    });
  }

  // Tanks
  for (const t of snapshot.tanks) {
    const r = resolveReading(idx, t.levelSensorId);
    const level = usableValue(r);
    if (level === null || level >= t.lowLevelPct || !r.timestamp) continue;
    add('tank_low', level < ALERT_RULES.tankCriticalPct ? 'critical' : 'warning', { kind: 'tank', id: t.id }, toMs(r.timestamp), {
      tank: t.name,
      level,
      threshold: t.lowLevelPct,
      volume: Math.round((t.capacityM3 * level) / 100),
    });
  }

  // Zones: abnormal flow and over-long runs
  for (const z of snapshot.zones) {
    const run = snapshot.irrigationEvents.find((e) => e.zoneId === z.id && e.endedAt === null);
    if (!run) continue;
    const started = toMs(run.startedAt);
    const flow = usableValue(resolveReading(idx, z.flowSensorId));
    if (flow !== null && flow > z.designFlowM3h * ALERT_RULES.highFlowRatio) {
      const pct = Math.round((flow / z.designFlowM3h) * 100);
      add('high_water_use', pct >= 150 ? 'critical' : 'warning', { kind: 'zone', id: z.id }, started + 10 * MINUTE_MS, {
        zone: z.name, flow: r1(flow), design: z.designFlowM3h, pct,
      });
    }
    const runMinutes = Math.round((now - started) / MINUTE_MS);
    if (runMinutes > z.maxRunMinutes) {
      const pump = z.pumpDeviceId ? idx.devices.get(z.pumpDeviceId)?.name ?? '' : '';
      add('pump_long_run', 'warning', { kind: 'zone', id: z.id }, started + z.maxRunMinutes * MINUTE_MS, {
        zone: z.name, pump, minutes: runMinutes, max: z.maxRunMinutes,
      });
    }
  }

  // Livestock: activity vs. individual baseline, body temperature
  for (const a of snapshot.animals) {
    if (!a.monitoringDeviceId) continue;
    const label = a.name ? `${a.name} (${a.tagNumber})` : a.tagNumber;
    const activity = resolveReading(idx, sensorOf(idx, a.monitoringDeviceId, 'activity'));
    const act = usableValue(activity);
    if (act !== null && a.activityBaseline && activity.timestamp) {
      const ratio = act / a.activityBaseline;
      if (ratio < ALERT_RULES.activityLowRatio || ratio > ALERT_RULES.activityHighRatio) {
        add('activity_deviation', 'warning', { kind: 'animal', id: a.id }, toMs(activity.timestamp), {
          animal: label, species: a.species, pct: Math.round(ratio * 100), direction: ratio < 1 ? 'below' : 'above',
        });
      }
    }
    const limit = ALERT_RULES.bodyTemperatureHighC[a.species];
    const temp = resolveReading(idx, sensorOf(idx, a.monitoringDeviceId, 'body_temperature'));
    const t = usableValue(temp);
    if (limit !== undefined && t !== null && t > limit && temp.timestamp) {
      add('body_temperature_high', 'critical', { kind: 'animal', id: a.id }, toMs(temp.timestamp), {
        animal: label, species: a.species, value: t, threshold: limit,
      });
    }
  }

  // Informational: most recent completed irrigation runs (last 24 h)
  const zoneNames = new Map(snapshot.zones.map((z) => [z.id, z.name]));
  snapshot.irrigationEvents
    .filter((e) => e.endedAt && now - toMs(e.endedAt) < 24 * 60 * MINUTE_MS)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
    .slice(0, ALERT_RULES.recentIrrigationEvents)
    .forEach((e) =>
      add('irrigation_completed', 'info', { kind: 'zone', id: e.zoneId }, toMs(e.endedAt as string), {
        zone: zoneNames.get(e.zoneId) ?? e.zoneId,
        volume: r1(e.volumeM3),
        minutes: Math.round((toMs(e.endedAt as string) - toMs(e.startedAt)) / MINUTE_MS),
      }, e.id),
    );

  return alerts;
}

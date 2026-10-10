import type { Crop, Field, MoistureThresholds } from '../../types/domain';
import { resolveReading, usableValue, type SnapshotIndex } from '../devices/telemetry';

export type FieldStatus = 'normal' | 'attention' | 'no_data';

export interface FieldCondition {
  field: Field;
  crop: Crop | null;
  /** Mean of usable soil-moisture readings (% VWC), `null` if none are usable. */
  moisturePct: number | null;
  /** Direction of the deviation when status is `attention`. */
  deviation: 'low' | 'high' | null;
  thresholds: MoistureThresholds;
  /** Most recent reading received from any of the field's probes, even if stale. */
  lastUpdate: string | null;
  probesTotal: number;
  probesReporting: number;
  status: FieldStatus;
}

export function classifyMoisture(value: number | null, t: MoistureThresholds): { status: FieldStatus; deviation: 'low' | 'high' | null } {
  if (value === null) return { status: 'no_data', deviation: null };
  if (value < t.lowPct) return { status: 'attention', deviation: 'low' };
  if (value > t.highPct) return { status: 'attention', deviation: 'high' };
  return { status: 'normal', deviation: null };
}

export function fieldConditions(idx: SnapshotIndex): FieldCondition[] {
  const crops = new Map(idx.snapshot.crops.map((c) => [c.id, c]));
  return idx.snapshot.fields.map((field) => {
    const readings = field.soilSensorIds.map((id) => resolveReading(idx, id));
    const usable = readings.map(usableValue).filter((v): v is number => v !== null);
    const moisturePct = usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : null;
    const lastUpdate = readings.reduce<string | null>((latest, r) => (r.timestamp && (!latest || r.timestamp > latest) ? r.timestamp : latest), null);
    return {
      field,
      crop: crops.get(field.cropId) ?? null,
      moisturePct,
      thresholds: field.moistureThresholds,
      lastUpdate,
      probesTotal: field.soilSensorIds.length,
      probesReporting: usable.length,
      ...classifyMoisture(moisturePct, field.moistureThresholds),
    };
  });
}

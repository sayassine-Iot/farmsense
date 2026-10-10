import { DATA_QUALITY, DEVICE_TYPE_ORDER } from '../../config/app';
import type { Device, DeviceType } from '../../types/domain';
import { isDeviceOnline, isReadingStale, type SnapshotIndex } from './telemetry';

export interface DeviceStatusRow {
  device: Device;
  online: boolean;
  lowBattery: boolean;
  /** Online, but at least one of its sensors has not reported recently. */
  stale: boolean;
}

export interface DeviceHealthSummary {
  total: number;
  online: number;
  offline: number;
  /** Online devices as a share of all registered devices, 0–100. `null` if none registered. */
  connectivityPct: number | null;
  lowBattery: number;
  stale: number;
  categories: { type: DeviceType; total: number; online: number }[];
  rows: DeviceStatusRow[];
}

export function deviceStatusRows(idx: SnapshotIndex): DeviceStatusRow[] {
  return idx.snapshot.devices.map((device) => {
    const online = isDeviceOnline(device, idx.now);
    const sensors = idx.sensorsByDevice.get(device.id) ?? [];
    const stale =
      online &&
      sensors.some((s) => {
        const r = idx.readings.get(s.id);
        return r ? isReadingStale(r, s, idx.now) : true;
      });
    const lowBattery = device.batteryPct !== null && device.batteryPct <= DATA_QUALITY.lowBatteryPct;
    return { device, online, stale, lowBattery };
  });
}

export function deviceHealth(idx: SnapshotIndex): DeviceHealthSummary {
  const rows = deviceStatusRows(idx);
  const online = rows.filter((r) => r.online).length;
  const categories = DEVICE_TYPE_ORDER.map((type) => {
    const ofType = rows.filter((r) => r.device.type === type);
    return { type, total: ofType.length, online: ofType.filter((r) => r.online).length };
  }).filter((c) => c.total > 0);

  return {
    total: rows.length,
    online,
    offline: rows.length - online,
    connectivityPct: rows.length ? (online / rows.length) * 100 : null,
    lowBattery: rows.filter((r) => r.lowBattery).length,
    stale: rows.filter((r) => r.stale).length,
    categories,
    rows,
  };
}

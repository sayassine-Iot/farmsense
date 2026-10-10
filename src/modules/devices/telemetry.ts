import { DATA_QUALITY } from '../../config/app';
import type { Device, FarmSnapshot, Sensor, TelemetryReading } from '../../types/domain';
import { MINUTE_MS, toMs } from '../../utils/time';

/**
 * Why a value can or cannot be trusted.
 * - ok: fresh, valid reading from an online device
 * - stale: device online but this sensor has not reported recently
 * - offline: device has not been in contact recently
 * - invalid: the device reported, but the measurement was unavailable
 * - missing: no reading has ever been received
 */
export type ReadingQuality = 'ok' | 'stale' | 'offline' | 'invalid' | 'missing';

export interface ResolvedReading {
  sensor: Sensor | null;
  /** Last known value. Only meaningful for display when quality is `ok`. */
  value: number | null;
  timestamp: string | null;
  quality: ReadingQuality;
}

/** Lookup tables built once per snapshot. */
export interface SnapshotIndex {
  snapshot: FarmSnapshot;
  now: number;
  devices: Map<string, Device>;
  sensors: Map<string, Sensor>;
  sensorsByDevice: Map<string, Sensor[]>;
  readings: Map<string, TelemetryReading>;
}

export function indexSnapshot(snapshot: FarmSnapshot): SnapshotIndex {
  const sensorsByDevice = new Map<string, Sensor[]>();
  for (const s of snapshot.sensors) {
    const list = sensorsByDevice.get(s.deviceId) ?? [];
    list.push(s);
    sensorsByDevice.set(s.deviceId, list);
  }
  return {
    snapshot,
    now: toMs(snapshot.asOf),
    devices: new Map(snapshot.devices.map((d) => [d.id, d])),
    sensors: new Map(snapshot.sensors.map((s) => [s.id, s])),
    sensorsByDevice,
    readings: new Map(snapshot.latestReadings.map((r) => [r.sensorId, r])),
  };
}

export function isDeviceOnline(device: Device, now: number): boolean {
  if (!device.lastSeenAt) return false;
  return now - toMs(device.lastSeenAt) <= DATA_QUALITY.offlineAfterMinutes * MINUTE_MS;
}

export function isReadingStale(reading: TelemetryReading, sensor: Sensor, now: number): boolean {
  return now - toMs(reading.timestamp) > sensor.reportingIntervalMin * DATA_QUALITY.staleAfterIntervals * MINUTE_MS;
}

export function resolveReading(idx: SnapshotIndex, sensorId: string | null): ResolvedReading {
  const sensor = sensorId ? idx.sensors.get(sensorId) ?? null : null;
  if (!sensor) return { sensor: null, value: null, timestamp: null, quality: 'missing' };
  const reading = idx.readings.get(sensor.id);
  const device = idx.devices.get(sensor.deviceId);
  if (!reading) return { sensor, value: null, timestamp: null, quality: device && !isDeviceOnline(device, idx.now) ? 'offline' : 'missing' };
  const base = { sensor, value: reading.value, timestamp: reading.timestamp };
  if (!device || !isDeviceOnline(device, idx.now)) return { ...base, quality: 'offline' };
  if (isReadingStale(reading, sensor, idx.now)) return { ...base, quality: 'stale' };
  if (reading.value === null) return { ...base, quality: 'invalid' };
  return { ...base, quality: 'ok' };
}

/** Value usable for calculations, or `null` if it must be treated as unavailable. */
export function usableValue(r: ResolvedReading): number | null {
  return r.quality === 'ok' ? r.value : null;
}

/** Finds the sensor of a given kind on a device. */
export function sensorOf(idx: SnapshotIndex, deviceId: string | null, kind: Sensor['kind']): string | null {
  if (!deviceId) return null;
  return idx.sensorsByDevice.get(deviceId)?.find((s) => s.kind === kind)?.id ?? null;
}

/** Most recent contact from any device on the farm. */
export function lastDataUpdate(idx: SnapshotIndex): string | null {
  let latest: string | null = null;
  for (const d of idx.snapshot.devices) {
    if (d.lastSeenAt && (!latest || d.lastSeenAt > latest)) latest = d.lastSeenAt;
  }
  return latest;
}

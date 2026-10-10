/**
 * Small helpers for assembling internally consistent demo snapshots.
 * Everything is derived from a seeded PRNG and a single reference time, so the
 * same farm always produces the same data relative to "now".
 */
import type {
  Animal,
  Device,
  DeviceAssignment,
  DeviceType,
  IrrigationEvent,
  Sensor,
  SensorKind,
  TelemetryReading,
} from '../../../types/domain';

const MINUTE = 60_000;

/** mulberry32 — tiny deterministic PRNG. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
  };
}
export type Rng = ReturnType<typeof createRng>;

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const round = (value: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export const SENSOR_UNITS: Record<SensorKind, string> = {
  soil_moisture: '%VWC',
  water_flow: 'm3/h',
  tank_level: '%',
  pump_state: 'bool',
  valve_state: 'bool',
  air_temperature: 'C',
  air_humidity: '%RH',
  activity: 'index',
  rumination: 'min/day',
  body_temperature: 'C',
  respiration_rate: 'breaths/min',
  heart_rate: 'bpm',
  position: 'm',
};

/** Accumulates devices, sensors and readings for one farm. */
export class SnapshotBuilder {
  readonly devices: Device[] = [];
  readonly sensors: Sensor[] = [];
  readonly readings: TelemetryReading[] = [];
  readonly events: IrrigationEvent[] = [];
  readonly animals: Animal[] = [];

  constructor(
    readonly farmId: string,
    readonly now: Date,
  ) {}

  ago(minutes: number): string {
    return new Date(this.now.getTime() - minutes * MINUTE).toISOString();
  }

  device(opts: {
    id: string;
    name: string;
    type: DeviceType;
    assignedTo: DeviceAssignment;
    /** Minutes since last contact; `null` = never seen. */
    lastSeenMinAgo: number | null;
    batteryPct?: number | null;
  }): Device {
    const d: Device = {
      id: opts.id,
      farmId: this.farmId,
      name: opts.name,
      type: opts.type,
      serial: `FS-${opts.type.slice(0, 3).toUpperCase()}-${hashSeed(opts.id).toString(16).slice(0, 6).toUpperCase()}`,
      lastSeenAt: opts.lastSeenMinAgo === null ? null : this.ago(opts.lastSeenMinAgo),
      batteryPct: opts.batteryPct ?? null,
      assignedTo: opts.assignedTo,
    };
    this.devices.push(d);
    return d;
  }

  /**
   * Adds a sensor and (optionally) its latest reading.
   * `readingMinAgo` defaults to the device's last contact.
   */
  sensor(
    device: Device,
    kind: SensorKind,
    reportingIntervalMin: number,
    reading?: { value: number | null; minAgo?: number; receivedMinAgo?: number },
  ): Sensor {
    const s: Sensor = {
      id: `${device.id}:${kind}`,
      deviceId: device.id,
      kind,
      unit: SENSOR_UNITS[kind],
      reportingIntervalMin,
    };
    this.sensors.push(s);
    if (reading && device.lastSeenAt) {
      const timestamp =
        reading.minAgo !== undefined ? this.ago(reading.minAgo) : device.lastSeenAt;
      const receivedAt = reading.receivedMinAgo !== undefined ? this.ago(reading.receivedMinAgo) : timestamp;
      this.readings.push({ sensorId: s.id, timestamp, receivedAt, value: reading.value });
    }
    return s;
  }
}

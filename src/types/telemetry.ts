/**
 * Layer 5B — Telemetry storage records (time-series).
 *
 * Produced by the IoT ingestion layer (4) from edge devices (6). Devices may
 * buffer readings while offline and upload them later, so every record keeps
 * both the time it was measured and the time the platform received it.
 */
import type { ISODateString } from './operational';

export interface TelemetryReading {
  sensorId: string;
  /** When the device took the measurement (device clock, validated at ingestion). */
  timestamp: ISODateString;
  /** When ingestion accepted it. Later than `timestamp` for buffered/delayed uploads. */
  receivedAt: ISODateString;
  /** `null` when the device reported but the measurement was invalid / unavailable. */
  value: number | null;
}

/** An irrigation run, aggregated from flow-meter and pump telemetry. */
export interface IrrigationEvent {
  id: string;
  zoneId: string;
  startedAt: ISODateString;
  /** `null` while the run is in progress. */
  endedAt: ISODateString | null;
  /** Metered volume in m³ (so far, for a running event). */
  volumeM3: number;
  /** Pump electrical energy attributed to this run, kWh. `null` if no pump metering. */
  energyKWh: number | null;
}

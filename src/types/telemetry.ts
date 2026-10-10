/**
 * Layer 5B — Telemetry storage records (time-series).
 *
 * Produced by the IoT ingestion layer (4) from edge devices (6). Devices may
 * buffer readings while offline and upload them later, so every record keeps
 * both the time it was measured and the time the platform received it.
 */
import type { ISODateString, Species } from './operational';

export interface TelemetryReading {
  sensorId: string;
  /** When the device took the measurement (device clock, validated at ingestion). */
  timestamp: ISODateString;
  /** When ingestion accepted it. Later than `timestamp` for buffered/delayed uploads. */
  receivedAt: ISODateString;
  /** `null` when the device reported but the measurement was invalid / unavailable. */
  value: number | null;
}

/**
 * Hourly herd aggregate of neck-tag telemetry for one species, computed by
 * the analytics layer from individual readings.
 */
export interface HerdActivityBucket {
  species: Species;
  /** Start of the hour. */
  hourStart: ISODateString;
  /** Mean activity as % of each animal's own baseline. `null` = no tag reported. */
  activityPctOfBaseline: number | null;
  /** Mean rumination minutes in that hour. `null` = not measured for this species. */
  ruminationMin: number | null;
  /** Tags that contributed to the bucket (weights cross-species averages). */
  reportingTags: number;
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

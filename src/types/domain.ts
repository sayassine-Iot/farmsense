/**
 * Domain model barrel. Types are organised by architecture layer:
 * - access.ts            Layer 2  — sessions, roles, permissions
 * - operational.ts       Layer 5A — farms, fields, animals, device registry
 * - telemetry.ts         Layer 5B — time-series readings, irrigation runs
 * - alerts-analytics.ts  Module 3D — alerts, tariffs
 *
 * Timestamps are ISO-8601 strings (UTC). Missing measurements are `null`, never `0`.
 */
export type * from './access';
export type * from './alerts-analytics';
export type * from './operational';
export type * from './telemetry';

import type { Animal, Crop, Device, Farm, Field, IrrigationZone, ISODateString, Sensor, WaterTank } from './operational';
import type { HerdActivityBucket, IrrigationEvent, TelemetryReading } from './telemetry';

/**
 * Everything the Farm Overview needs for one farm. Assembled by the user
 * application from the per-module API responses (see `src/api`).
 */
export interface FarmSnapshot {
  farm: Farm;
  // 3A Water & Crop
  crops: Crop[];
  fields: Field[];
  zones: IrrigationZone[];
  tanks: WaterTank[];
  irrigationEvents: IrrigationEvent[];
  /** Irrigation history is complete from this instant; earlier periods cannot be compared. */
  irrigationCoveredFrom: ISODateString;
  // 3B Livestock
  animals: Animal[];
  /** Hourly herd activity for the 24 h before `asOf`. */
  herdActivity: HerdActivityBucket[];
  // 3C Devices
  devices: Device[];
  sensors: Sensor[];
  /** Latest reading per sensor. Sensors that never reported have no entry. */
  latestReadings: TelemetryReading[];
  /** Point in time the snapshot represents. */
  asOf: ISODateString;
}

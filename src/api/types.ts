/**
 * Layer 2 — API contract between the user application (layer 1) and the
 * platform. One interface per domain module (3A–3D), mirroring the future
 * REST resources. Components never talk to storage or devices directly.
 *
 * Suggested REST mapping (Phase 2):
 *   GET  /me                                  → access.getSession
 *   GET  /farms                               → farms.listFarms
 *   GET  /farms/:id/water-crop                → waterCrop.getSetup
 *   GET  /farms/:id/irrigation-events?from&to → waterCrop.listIrrigationEvents
 *   GET  /farms/:id/animals                   → livestock.listAnimals
 *   GET  /farms/:id/devices                   → devices.getRegistry
 *   GET  /farms/:id/telemetry/latest          → devices.getLatestReadings
 *   GET  /farms/:id/alerts                    → alerts.listAlerts
 *   PATCH /farms/:id/alerts/:alertId          → alerts.updateAlertStatus
 */
import type {
  Alert,
  Animal,
  Crop,
  Device,
  Farm,
  Field,
  IrrigationEvent,
  IrrigationZone,
  ISODateString,
  Sensor,
  Session,
  TelemetryReading,
  WaterTank,
} from '../types/domain';

export interface AccessApi {
  getSession(): Promise<Session>;
}

export interface FarmsApi {
  /** Farms the current user may access. */
  listFarms(): Promise<Farm[]>;
}

/** Module 3A — Water & Crop. */
export interface WaterCropApi {
  getSetup(farmId: string): Promise<{ crops: Crop[]; fields: Field[]; zones: IrrigationZone[]; tanks: WaterTank[] }>;
  /**
   * Irrigation runs overlapping [from, to). `coveredFrom` states how far back
   * the stored history is complete, so comparisons are never made against
   * missing data.
   */
  listIrrigationEvents(farmId: string, from: ISODateString, to: ISODateString): Promise<{ events: IrrigationEvent[]; coveredFrom: ISODateString }>;
}

/** Module 3B — Livestock. */
export interface LivestockApi {
  listAnimals(farmId: string): Promise<Animal[]>;
}

/** Module 3C — Devices. */
export interface DevicesApi {
  getRegistry(farmId: string): Promise<{ devices: Device[]; sensors: Sensor[] }>;
  /** Latest reading per sensor from telemetry storage (5B). */
  getLatestReadings(farmId: string): Promise<{ asOf: ISODateString; readings: TelemetryReading[] }>;
}

/** Module 3D — Alerts & Analytics. */
export interface AlertsAnalyticsApi {
  listAlerts(farmId: string): Promise<Alert[]>;
  updateAlertStatus(farmId: string, alertId: string, status: 'acknowledged' | 'resolved'): Promise<Alert>;
}

export interface FarmSenseApi {
  /** `demo` = simulated data; the UI must label it as such. */
  readonly mode: 'demo' | 'live';
  access: AccessApi;
  farms: FarmsApi;
  waterCrop: WaterCropApi;
  livestock: LivestockApi;
  devices: DevicesApi;
  alerts: AlertsAnalyticsApi;
  /** Demo only: clear locally stored alert acknowledgements. */
  resetDemoState?(): void;
}

export type ApiErrorCode = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid_request';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

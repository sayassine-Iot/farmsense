/**
 * Module 3D — Alerts & Analytics.
 *
 * Alerts are produced server-side by the rules engine (and later anomaly
 * detection). They carry a type and parameters only; wording is localized
 * by the user application.
 */
import type { ISODateString } from './operational';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export type AlertType =
  | 'high_water_use'
  | 'low_soil_moisture'
  | 'high_soil_moisture'
  | 'tank_low'
  | 'pump_long_run'
  | 'device_offline'
  | 'low_battery'
  | 'activity_deviation'
  | 'body_temperature_high'
  | 'respiration_high'
  | 'heart_rate_high'
  | 'rumination_low'
  | 'irrigation_completed';

export type AlertTarget =
  | { kind: 'field'; id: string }
  | { kind: 'zone'; id: string }
  | { kind: 'animal'; id: string }
  | { kind: 'device'; id: string }
  | { kind: 'tank'; id: string };

export interface Alert {
  id: string;
  farmId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  target: AlertTarget;
  createdAt: ISODateString;
  acknowledgedAt: ISODateString | null;
  resolvedAt: ISODateString | null;
  /** Values interpolated into the localized title / explanation. */
  params: Record<string, string | number>;
}

export type CurrencyCode = 'EUR' | 'MAD' | 'DZD' | 'TND' | 'EGP' | 'USD';

export interface ResourceTariff {
  currency: CurrencyCode;
  waterPricePerM3: number;
  electricityPricePerKWh: number;
  /** Where the figures came from, shown next to every estimate. */
  source: 'demo' | 'user';
}

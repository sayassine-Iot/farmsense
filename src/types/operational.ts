/**
 * Layer 5A — Operational database entities.
 *
 * Farms, fields, animals and the device registry: slowly changing records
 * owned by the operational (PostgreSQL) database. They are deliberately
 * independent of any sensor manufacturer or transport (MQTT, LTE-M, LoRa).
 */

export type ISODateString = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Farm {
  id: string;
  name: string;
  region: string;
  country: string;
  location: GeoPoint;
  timezone: string;
  totalAreaHa: number;
  /** Daily water target for all metered irrigation, in m³. `null` if not configured. */
  dailyWaterTargetM3: number | null;
}

// ---- 3A Water & Crop ------------------------------------------------------

export type SoilType = 'sandy' | 'sandy_loam' | 'loam' | 'clay_loam' | 'clay';

/** Volumetric water content thresholds (%), configured per crop and soil type. */
export interface MoistureThresholds {
  /** Below this, the crop is under water stress. */
  lowPct: number;
  /** Above this, the soil is waterlogged / water is being wasted. */
  highPct: number;
}

export interface Crop {
  id: string;
  /** i18n key suffix, e.g. `olive` → `crop.olive`. */
  key: string;
  category: 'tree' | 'cereal' | 'vegetable' | 'forage' | 'palm';
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  cropId: string;
  areaHa: number;
  soilType: SoilType;
  moistureThresholds: MoistureThresholds;
  /** Soil-moisture sensors installed in this field. */
  soilSensorIds: string[];
}

export type IrrigationMethod = 'drip' | 'sprinkler' | 'pivot' | 'furrow';

export interface IrrigationZone {
  id: string;
  farmId: string;
  fieldId: string;
  name: string;
  method: IrrigationMethod;
  /** Nominal flow at design pressure, m³/h. */
  designFlowM3h: number;
  /** A single run longer than this is flagged. */
  maxRunMinutes: number;
  flowSensorId: string | null;
  valveDeviceId: string | null;
  pumpDeviceId: string | null;
}

export interface WaterTank {
  id: string;
  farmId: string;
  name: string;
  capacityM3: number;
  levelSensorId: string | null;
  lowLevelPct: number;
}

// ---- 3B Livestock ---------------------------------------------------------

export type Species = 'cattle' | 'buffalo' | 'sheep' | 'goat' | 'horse' | 'camel' | 'poultry';

export interface Animal {
  id: string;
  farmId: string;
  species: Species;
  /** Ear tag / registration number, or flock code for poultry. */
  tagNumber: string;
  name: string | null;
  group: string;
  /** 1 for individually managed animals; flock size for poultry. */
  headcount: number;
  /** Tag or barn device monitoring this animal / flock. `null` = not monitored. */
  monitoringDeviceId: string | null;
  /** Individual activity baseline (activity index units) learned over 14 days. */
  activityBaseline: number | null;
}

// ---- 3C Devices (registry) -----------------------------------------------

export type DeviceType =
  | 'soil_probe'
  | 'flow_meter'
  | 'tank_level'
  | 'pump_monitor'
  | 'valve_controller'
  | 'weather_station'
  | 'livestock_tag'
  | 'barn_sensor'
  | 'gateway';

export type DeviceAssignment =
  | { kind: 'field'; id: string }
  | { kind: 'zone'; id: string }
  | { kind: 'animal'; id: string }
  | { kind: 'tank'; id: string }
  | { kind: 'farm'; id: string };

export interface Device {
  id: string;
  farmId: string;
  name: string;
  type: DeviceType;
  serial: string;
  /** Last time the ingestion layer heard from the device. `null` = never seen. */
  lastSeenAt: ISODateString | null;
  /** Battery state of charge in %. `null` = mains powered or not reported. */
  batteryPct: number | null;
  assignedTo: DeviceAssignment;
}

export type SensorKind =
  | 'soil_moisture'
  | 'water_flow'
  | 'tank_level'
  | 'pump_state'
  | 'valve_state'
  | 'air_temperature'
  | 'air_humidity'
  | 'activity'
  | 'rumination'
  | 'body_temperature'
  | 'respiration_rate'
  | 'heart_rate'
  /** GNSS fix; the reading value is the horizontal accuracy in metres (`null` = no fix). */
  | 'position';

export interface Sensor {
  id: string;
  deviceId: string;
  kind: SensorKind;
  unit: string;
  /** Expected reporting interval; readings older than a multiple of this are stale. */
  reportingIntervalMin: number;
}

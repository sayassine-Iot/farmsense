import type { CurrencyCode, DeviceType, ResourceTariff, SensorKind, Species } from '../types/domain';

/** Data-quality rules. Kept in config so they can be tuned per deployment. */
export const DATA_QUALITY = {
  /** A device with no contact for longer than this is offline. */
  offlineAfterMinutes: 60,
  /** The header shows "Live" while the newest reading is younger than this. */
  liveWithinMinutes: 15,
  /** A reading older than `reportingInterval × staleAfterIntervals` is stale. */
  staleAfterIntervals: 3,
  /** Battery level (%) at or below which a device is reported as low battery. */
  lowBatteryPct: 20,
  criticalBatteryPct: 10,
} as const;

/** Operational rule thresholds used by the demo rules engine. */
export const ALERT_RULES = {
  /** Measured flow above design flow by this ratio suggests a leak or burst. */
  highFlowRatio: 1.3,
  /** Tank level (%) below which the alert becomes critical. */
  tankCriticalPct: 10,
  /** Activity deviation (ratio vs. individual baseline) treated as abnormal. */
  activityLowRatio: 0.6,
  activityHighRatio: 1.5,
  /** Body temperature (°C) above which an alert is raised, per species. */
  bodyTemperatureHighC: { cattle: 39.8, buffalo: 39.8, camel: 39.5 } as Partial<Record<Species, number>>,
  /** Resting respiration (breaths/min) above which heat stress or respiratory disease is suspected. */
  respirationHighPerMin: { cattle: 40, buffalo: 40, camel: 20 } as Partial<Record<Species, number>>,
  /** Heart rate (bpm) above which a check is advised. */
  heartRateHighBpm: { cattle: 84, buffalo: 84 } as Partial<Record<Species, number>>,
  /** Daily rumination (min) below which a ruminant is flagged (feed or digestive problem). */
  ruminationLowMinPerDay: 300,
  /** Number of most recent completed irrigation runs listed as info events. */
  recentIrrigationEvents: 3,
} as const;

export const DEFAULT_TARIFF: ResourceTariff = {
  currency: 'EUR',
  waterPricePerM3: 0.08,
  electricityPricePerKWh: 0.11,
  source: 'demo',
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['EUR', 'MAD', 'DZD', 'TND', 'EGP', 'USD'];

/** Display units. Values are always stored in SI / metric base units. */
export const UNITS = {
  volume: 'm3' as 'm3' | 'L',
  area: 'ha' as const,
  temperature: 'C' as const,
};

/**
 * Livestock species supported by the platform and the measurements their
 * monitoring hardware can provide. Not every species supports every metric.
 * Pigs are intentionally not supported.
 */
export const SPECIES_CONFIG: Record<
  Species,
  { metrics: SensorKind[]; monitoring: 'individual' | 'flock' }
> = {
  cattle: { metrics: ['activity', 'rumination', 'body_temperature', 'respiration_rate', 'heart_rate', 'position'], monitoring: 'individual' },
  buffalo: { metrics: ['activity', 'rumination', 'body_temperature', 'respiration_rate', 'heart_rate', 'position'], monitoring: 'individual' },
  sheep: { metrics: ['activity', 'position'], monitoring: 'individual' },
  goat: { metrics: ['activity', 'position'], monitoring: 'individual' },
  horse: { metrics: ['activity', 'position'], monitoring: 'individual' },
  camel: { metrics: ['activity', 'body_temperature', 'respiration_rate', 'position'], monitoring: 'individual' },
  poultry: { metrics: ['air_temperature', 'air_humidity'], monitoring: 'flock' },
};

export const SUPPORTED_SPECIES = Object.keys(SPECIES_CONFIG) as Species[];

/** Device categories in display order. */
export const DEVICE_TYPE_ORDER: DeviceType[] = [
  'soil_probe',
  'flow_meter',
  'tank_level',
  'pump_monitor',
  'valve_controller',
  'weather_station',
  'barn_sensor',
  'livestock_tag',
  'gateway',
];

export type DateRangeKey = 'today' | '7d' | '30d';
export const DATE_RANGES: DateRangeKey[] = ['today', '7d', '30d'];

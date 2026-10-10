/**
 * Demo farms. SIMULATED DATA — these are not real sensor readings.
 *
 * Every value the dashboard shows is derived from these records by the
 * calculation utilities; nothing is hardcoded in UI components.
 */
import type { Crop, Farm, FarmSnapshot, Field, IrrigationZone, WaterTank } from '../../../types/domain';
import { createRng, hashSeed, SnapshotBuilder } from './builder';
import { herdActivityHistory } from './herd-activity';
import { addFlock, addHerd, generateIrrigationEvents, type ZoneSpec } from './generators';

type BaseSnapshot = Omit<FarmSnapshot, 'herdActivity'>;
/** Herd activity history kept by the demo analytics store. */
const HERD_ACTIVITY_HOURS = 48;

export const CROPS: Crop[] = [
  { id: 'crop-olive', key: 'olive', category: 'tree' },
  { id: 'crop-durum-wheat', key: 'durum_wheat', category: 'cereal' },
  { id: 'crop-orange', key: 'orange', category: 'tree' },
  { id: 'crop-tomato', key: 'tomato', category: 'vegetable' },
  { id: 'crop-alfalfa', key: 'alfalfa', category: 'forage' },
  { id: 'crop-date-palm', key: 'date_palm', category: 'palm' },
  { id: 'crop-pepper', key: 'pepper', category: 'vegetable' },
  { id: 'crop-barley', key: 'barley', category: 'cereal' },
];

const HISTORY_DAYS = 62;

/** Start of the stored irrigation history (local midnight, HISTORY_DAYS ago). */
function historyStart(now: Date): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - HISTORY_DAYS);
  return d.toISOString();
}

export const FARMS: Farm[] = [
  {
    id: 'farm-zitouna',
    name: 'Domaine Zitouna',
    region: 'Meknès, Fès-Meknès',
    country: 'MA',
    location: { lat: 33.89, lng: -5.55 },
    timezone: 'Africa/Casablanca',
    totalAreaHa: 52,
    dailyWaterTargetM3: 230,
  },
  {
    id: 'farm-nefzaoua',
    name: 'Ferme Oasis Nefzaoua',
    region: 'Kébili, Nefzaoua',
    country: 'TN',
    location: { lat: 33.7, lng: 8.97 },
    timezone: 'Africa/Tunis',
    totalAreaHa: 28,
    dailyWaterTargetM3: 120,
  },
];

function zone(
  farmId: string,
  id: string,
  fieldId: string,
  name: string,
  method: IrrigationZone['method'],
  designFlowM3h: number,
  maxRunMinutes: number,
  pumpDeviceId: string | null,
): IrrigationZone {
  return {
    id,
    farmId,
    fieldId,
    name,
    method,
    designFlowM3h,
    maxRunMinutes,
    flowSensorId: `fm-${id}:water_flow`,
    valveDeviceId: `vc-${id}`,
    pumpDeviceId,
  };
}

/** Adds flow meter + valve controller devices for each zone. */
function addZoneDevices(
  b: SnapshotBuilder,
  specs: ZoneSpec[],
  devices: Record<string, { flow: number; flowSeenMinAgo: number; valveOpen: boolean; valveSeenMinAgo: number; meterBattery: number; valveBattery: number }>,
) {
  for (const { zone: z } of specs) {
    const d = devices[z.id];
    const fm = b.device({
      id: `fm-${z.id}`,
      name: `${z.name} flow meter`,
      type: 'flow_meter',
      assignedTo: { kind: 'zone', id: z.id },
      lastSeenMinAgo: d.flowSeenMinAgo,
      batteryPct: d.meterBattery,
    });
    b.sensor(fm, 'water_flow', 5, { value: d.flow });
    const vc = b.device({
      id: `vc-${z.id}`,
      name: `${z.name} valve controller`,
      type: 'valve_controller',
      assignedTo: { kind: 'zone', id: z.id },
      lastSeenMinAgo: d.valveSeenMinAgo,
      batteryPct: d.valveBattery,
    });
    b.sensor(vc, 'valve_state', 15, { value: d.valveOpen ? 1 : 0 });
  }
}

function buildZitouna(now: Date): BaseSnapshot {
  const farm = FARMS[0];
  const b = new SnapshotBuilder(farm.id, now);
  const rng = createRng(hashSeed(farm.id));

  const fields: Field[] = [
    { id: 'zit-f1', farmId: farm.id, name: 'North Olive Grove', cropId: 'crop-olive', areaHa: 18, soilType: 'clay_loam', moistureThresholds: { lowPct: 18, highPct: 34 }, soilSensorIds: ['sp-zit-f1a:soil_moisture', 'sp-zit-f1b:soil_moisture'] },
    { id: 'zit-f2', farmId: farm.id, name: 'East Wheat Plot', cropId: 'crop-durum-wheat', areaHa: 20, soilType: 'loam', moistureThresholds: { lowPct: 20, highPct: 35 }, soilSensorIds: ['sp-zit-f2:soil_moisture'] },
    { id: 'zit-f3', farmId: farm.id, name: 'Citrus Orchard', cropId: 'crop-orange', areaHa: 8, soilType: 'sandy_loam', moistureThresholds: { lowPct: 16, highPct: 28 }, soilSensorIds: ['sp-zit-f3:soil_moisture'] },
    { id: 'zit-f4', farmId: farm.id, name: 'Market Garden', cropId: 'crop-tomato', areaHa: 2.5, soilType: 'sandy_loam', moistureThresholds: { lowPct: 18, highPct: 30 }, soilSensorIds: ['sp-zit-f4:soil_moisture'] },
    { id: 'zit-f5', farmId: farm.id, name: 'Alfalfa Paddock', cropId: 'crop-alfalfa', areaHa: 3.5, soilType: 'loam', moistureThresholds: { lowPct: 22, highPct: 36 }, soilSensorIds: ['sp-zit-f5:soil_moisture'] },
  ];

  const P1 = 'pump-zit-p1';
  const P2 = 'pump-zit-p2';
  const P3 = 'pump-zit-p3';
  const specs: ZoneSpec[] = [
    { zone: zone(farm.id, 'zit-z1', 'zit-f1', 'Olive block A', 'drip', 14, 210, P1), kWhPerM3: 0.55, slots: [{ hour: 5, durationMin: 170, everyNDays: 1, dayOffset: 0 }], running: { startedMinAgo: 35, flowRatio: 1.0 } },
    { zone: zone(farm.id, 'zit-z2', 'zit-f1', 'Olive block B', 'drip', 14, 210, P1), kWhPerM3: 0.55, slots: [{ hour: 18, durationMin: 170, everyNDays: 1, dayOffset: 0 }], running: { startedMinAgo: 50, flowRatio: 1.55 } },
    { zone: zone(farm.id, 'zit-z3', 'zit-f2', 'Wheat pivot', 'pivot', 45, 300, P2), kWhPerM3: 0.25, slots: [{ hour: 6, durationMin: 240, everyNDays: 3, dayOffset: 0 }] },
    { zone: zone(farm.id, 'zit-z4', 'zit-f3', 'Citrus rows', 'drip', 10, 240, P3), kWhPerM3: 0.3, slots: [{ hour: 4, durationMin: 200, everyNDays: 2, dayOffset: 1 }] },
    { zone: zone(farm.id, 'zit-z5', 'zit-f4', 'Garden beds', 'drip', 4, 120, P3), kWhPerM3: 0.3, slots: [{ hour: 7, durationMin: 90, everyNDays: 1, dayOffset: 0 }, { hour: 17, durationMin: 60, everyNDays: 1, dayOffset: 0 }], meterOfflineMinAgo: 190 },
    { zone: zone(farm.id, 'zit-z6', 'zit-f5', 'Alfalfa sprinklers', 'sprinkler', 18, 150, P2), kWhPerM3: 0.25, slots: [{ hour: 19, durationMin: 140, everyNDays: 2, dayOffset: 0 }], running: { startedMinAgo: 205, flowRatio: 1.0 } },
  ];

  const tanks: WaterTank[] = [
    { id: 'zit-tank1', farmId: farm.id, name: 'Main storage basin', capacityM3: 600, levelSensorId: 'tl-zit-tank1:tank_level', lowLevelPct: 25 },
  ];

  // Infrastructure
  b.device({ id: 'gw-zit-1', name: 'LTE gateway', type: 'gateway', assignedTo: { kind: 'farm', id: farm.id }, lastSeenMinAgo: 1, batteryPct: null });
  const ws = b.device({ id: 'ws-zit-1', name: 'Weather station', type: 'weather_station', assignedTo: { kind: 'farm', id: farm.id }, lastSeenMinAgo: 4, batteryPct: 78 });
  b.sensor(ws, 'air_temperature', 10, { value: 24.6 });
  b.sensor(ws, 'air_humidity', 10, { value: 41 });
  const tl = b.device({ id: 'tl-zit-tank1', name: 'Basin level sensor', type: 'tank_level', assignedTo: { kind: 'tank', id: 'zit-tank1' }, lastSeenMinAgo: 6, batteryPct: 64 });
  b.sensor(tl, 'tank_level', 15, { value: 21 });

  const pumps: [string, string, boolean][] = [
    [P1, 'Borehole pump P1', true],
    [P2, 'Surface pump P2', true],
    [P3, 'Booster pump P3', false],
  ];
  for (const [id, name, running] of pumps) {
    const p = b.device({ id, name, type: 'pump_monitor', assignedTo: { kind: 'farm', id: farm.id }, lastSeenMinAgo: 2, batteryPct: null });
    b.sensor(p, 'pump_state', 5, { value: running ? 1 : 0 });
  }

  // Soil probes
  const probes: [string, string, string, number, number, number | null, number?][] = [
    // id, name, field, lastSeen, battery, value, readingMinAgo
    ['sp-zit-f1a', 'Olive grove probe A', 'zit-f1', 8, 71, 24.8],
    ['sp-zit-f1b', 'Olive grove probe B', 'zit-f1', 11, 18, 21.3],
    ['sp-zit-f2', 'Wheat plot probe', 'zit-f2', 9, 55, 16.4],
    ['sp-zit-f3', 'Citrus probe', 'zit-f3', 6, 82, 22.1],
    ['sp-zit-f4', 'Garden probe', 'zit-f4', 7, 61, 19.0, 320],
    ['sp-zit-f5', 'Alfalfa probe', 'zit-f5', 5, 67, 38.9],
  ];
  for (const [id, name, fieldId, seen, battery, value, readingAgo] of probes) {
    const d = b.device({ id, name, type: 'soil_probe', assignedTo: { kind: 'field', id: fieldId }, lastSeenMinAgo: seen, batteryPct: battery });
    b.sensor(d, 'soil_moisture', 15, { value, minAgo: readingAgo });
  }

  addZoneDevices(b, specs, {
    'zit-z1': { flow: 14.1, flowSeenMinAgo: 3, valveOpen: true, valveSeenMinAgo: 4, meterBattery: 77, valveBattery: 69 },
    'zit-z2': { flow: 21.7, flowSeenMinAgo: 2, valveOpen: true, valveSeenMinAgo: 5, meterBattery: 73, valveBattery: 66 },
    'zit-z3': { flow: 0, flowSeenMinAgo: 4, valveOpen: false, valveSeenMinAgo: 9, meterBattery: 88, valveBattery: 81 },
    'zit-z4': { flow: 0, flowSeenMinAgo: 3, valveOpen: false, valveSeenMinAgo: 7, meterBattery: 59, valveBattery: 74 },
    'zit-z5': { flow: 0, flowSeenMinAgo: 190, valveOpen: false, valveSeenMinAgo: 8, meterBattery: 9, valveBattery: 70 },
    'zit-z6': { flow: 18.0, flowSeenMinAgo: 2, valveOpen: true, valveSeenMinAgo: 3, meterBattery: 84, valveBattery: 79 },
  });

  generateIrrigationEvents(b, rng, specs, { days: HISTORY_DAYS, rainDays: [9, 10, 23] });

  // Livestock
  addHerd(b, rng, {
    species: 'cattle', prefix: 'c', count: 18, tagged: 18, group: 'Dairy herd',
    metrics: { rumination: true, bodyTemperature: [38.3, 39.1], respiration: [24, 36], heartRate: { range: [54, 78], tags: 8 }, gps: true },
    overrides: {
      2: { ruminationMin: 255 },
      3: { activityRatio: 1.72 },
      5: { heartRateBpm: 96 },
      7: { bodyTemperatureC: 40.1, respirationPerMin: 46 },
      9: { respirationPerMin: 43 },
      11: { lastSeenMinAgo: 145 },
      14: { batteryPct: 12 },
    },
  });
  addHerd(b, rng, {
    species: 'sheep', prefix: 's', count: 46, tagged: 16, group: 'Ewe flock',
    metrics: { gps: true }, overrides: { 5: { activityRatio: 0.42 } },
  });
  addHerd(b, rng, {
    species: 'goat', prefix: 'g', count: 14, tagged: 6, group: 'Goat herd',
    metrics: { gps: true }, overrides: { 2: { batteryPct: 16 } },
  });
  addHerd(b, rng, {
    species: 'horse', prefix: 'h', count: 2, tagged: 2, group: 'Stable', names: ['Barq', 'Nour'],
    metrics: { gps: true },
  });
  addFlock(b, { code: 'PL-A', group: 'Laying hens – house A', headcount: 140, sensor: { temperatureC: 26.8, humidityPct: 61, lastSeenMinAgo: 3 } });

  return {
    farm, crops: CROPS, fields, zones: specs.map((s) => s.zone), tanks,
    devices: b.devices, sensors: b.sensors, latestReadings: b.readings,
    animals: b.animals, irrigationEvents: b.events, irrigationCoveredFrom: historyStart(now), asOf: now.toISOString(),
  };
}

function buildNefzaoua(now: Date): BaseSnapshot {
  const farm = FARMS[1];
  const b = new SnapshotBuilder(farm.id, now);
  const rng = createRng(hashSeed(farm.id));

  const fields: Field[] = [
    { id: 'nef-f1', farmId: farm.id, name: 'Date Palm Grove', cropId: 'crop-date-palm', areaHa: 14, soilType: 'sandy', moistureThresholds: { lowPct: 9, highPct: 20 }, soilSensorIds: ['sp-nef-f1:soil_moisture'] },
    { id: 'nef-f2', farmId: farm.id, name: 'Alfalfa Plot', cropId: 'crop-alfalfa', areaHa: 4.5, soilType: 'sandy', moistureThresholds: { lowPct: 12, highPct: 24 }, soilSensorIds: ['sp-nef-f2:soil_moisture'] },
    { id: 'nef-f3', farmId: farm.id, name: 'Pepper Plot', cropId: 'crop-pepper', areaHa: 2, soilType: 'sandy_loam', moistureThresholds: { lowPct: 15, highPct: 27 }, soilSensorIds: ['sp-nef-f3:soil_moisture'] },
    { id: 'nef-f4', farmId: farm.id, name: 'Barley Strip', cropId: 'crop-barley', areaHa: 5, soilType: 'sandy', moistureThresholds: { lowPct: 10, highPct: 22 }, soilSensorIds: [] },
  ];

  const P1 = 'pump-nef-p1';
  const specs: ZoneSpec[] = [
    { zone: zone(farm.id, 'nef-z1', 'nef-f1', 'Palm block A', 'drip', 20, 200, P1), kWhPerM3: 0.9, slots: [{ hour: 5, durationMin: 150, everyNDays: 1, dayOffset: 0 }], running: { startedMinAgo: 70, flowRatio: 1.02 } },
    { zone: zone(farm.id, 'nef-z2', 'nef-f1', 'Palm block B', 'furrow', 35, 180, P1), kWhPerM3: 0.9, slots: [{ hour: 6, durationMin: 120, everyNDays: 4, dayOffset: 1 }] },
    { zone: zone(farm.id, 'nef-z3', 'nef-f2', 'Alfalfa sprinklers', 'sprinkler', 15, 150, P1), kWhPerM3: 0.9, slots: [{ hour: 18, durationMin: 120, everyNDays: 2, dayOffset: 1 }] },
    { zone: zone(farm.id, 'nef-z4', 'nef-f3', 'Pepper drip lines', 'drip', 5, 150, P1), kWhPerM3: 0.9, slots: [{ hour: 7, durationMin: 100, everyNDays: 1, dayOffset: 0 }] },
  ];

  const tanks: WaterTank[] = [
    { id: 'nef-tank1', farmId: farm.id, name: 'Header tank', capacityM3: 250, levelSensorId: 'tl-nef-tank1:tank_level', lowLevelPct: 25 },
  ];

  b.device({ id: 'gw-nef-1', name: 'LTE gateway', type: 'gateway', assignedTo: { kind: 'farm', id: farm.id }, lastSeenMinAgo: 2, batteryPct: null });
  const ws = b.device({ id: 'ws-nef-1', name: 'Weather station', type: 'weather_station', assignedTo: { kind: 'farm', id: farm.id }, lastSeenMinAgo: 5, batteryPct: 91 });
  b.sensor(ws, 'air_temperature', 10, { value: 31.4 });
  b.sensor(ws, 'air_humidity', 10, { value: 22 });
  const tl = b.device({ id: 'tl-nef-tank1', name: 'Header tank level', type: 'tank_level', assignedTo: { kind: 'tank', id: 'nef-tank1' }, lastSeenMinAgo: 4, batteryPct: 70 });
  b.sensor(tl, 'tank_level', 15, { value: 58 });
  const p = b.device({ id: P1, name: 'Borehole pump', type: 'pump_monitor', assignedTo: { kind: 'farm', id: farm.id }, lastSeenMinAgo: 1, batteryPct: null });
  b.sensor(p, 'pump_state', 5, { value: 1 });

  const probes: [string, string, string, number, number, number | null][] = [
    ['sp-nef-f1', 'Palm grove probe', 'nef-f1', 6, 74, 15.2],
    ['sp-nef-f2', 'Alfalfa probe', 'nef-f2', 9, 62, 11.3],
    ['sp-nef-f3', 'Pepper probe', 'nef-f3', 4, 58, 21.8],
  ];
  for (const [id, name, fieldId, seen, battery, value] of probes) {
    const d = b.device({ id, name, type: 'soil_probe', assignedTo: { kind: 'field', id: fieldId }, lastSeenMinAgo: seen, batteryPct: battery });
    b.sensor(d, 'soil_moisture', 15, { value });
  }

  addZoneDevices(b, specs, {
    'nef-z1': { flow: 20.4, flowSeenMinAgo: 2, valveOpen: true, valveSeenMinAgo: 6, meterBattery: 81, valveBattery: 77 },
    'nef-z2': { flow: 0, flowSeenMinAgo: 3, valveOpen: false, valveSeenMinAgo: 8, meterBattery: 69, valveBattery: 64 },
    'nef-z3': { flow: 0, flowSeenMinAgo: 4, valveOpen: false, valveSeenMinAgo: 300, meterBattery: 75, valveBattery: 23 },
    'nef-z4': { flow: 0, flowSeenMinAgo: 3, valveOpen: false, valveSeenMinAgo: 5, meterBattery: 87, valveBattery: 80 },
  });

  generateIrrigationEvents(b, rng, specs, { days: HISTORY_DAYS, rainDays: [17] });

  addHerd(b, rng, {
    species: 'camel', prefix: 'k', count: 7, tagged: 7, group: 'Camel herd',
    names: ['Sahbi', 'Ghazala', 'Rim', 'Zayed', 'Najma', 'Baraka', 'Wafa'],
    metrics: { bodyTemperature: [36.4, 37.6], respiration: [8, 16], gps: true },
    overrides: { 2: { respirationPerMin: 24 }, 4: { activityRatio: 0.48 } },
  });
  addHerd(b, rng, { species: 'goat', prefix: 'g', count: 22, tagged: 8, group: 'Goat herd', metrics: { gps: true } });
  addHerd(b, rng, {
    species: 'sheep', prefix: 's', count: 30, tagged: 10, group: 'Barbarine flock',
    metrics: { gps: true }, overrides: { 9: { batteryPct: 8 } },
  });
  addFlock(b, { code: 'PL-1', group: 'Backyard layers', headcount: 60, sensor: null });

  return {
    farm, crops: CROPS, fields, zones: specs.map((s) => s.zone), tanks,
    devices: b.devices, sensors: b.sensors, latestReadings: b.readings,
    animals: b.animals, irrigationEvents: b.events, irrigationCoveredFrom: historyStart(now), asOf: now.toISOString(),
  };
}

const BUILDERS: Record<string, (now: Date) => BaseSnapshot> = {
  'farm-zitouna': buildZitouna,
  'farm-nefzaoua': buildNefzaoua,
};

export function buildDemoSnapshot(farmId: string, now: Date): FarmSnapshot | null {
  const build = BUILDERS[farmId];
  if (!build) return null;
  const base = build(now);
  return { ...base, herdActivity: herdActivityHistory(base, HERD_ACTIVITY_HOURS) };
}

/** Statuses set before the demo starts, so every alert state is visible. */
export const INITIAL_ALERT_STATUS: Record<string, 'acknowledged' | 'resolved'> = {
  'low_battery:sp-zit-f1b': 'acknowledged',
};

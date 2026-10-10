import { describe, expect, it } from 'vitest';
import { DEFAULT_TARIFF, SUPPORTED_SPECIES, type DateRangeKey } from '../config/app';
import { buildDemoSnapshot, FARMS } from '../api/mock/seed/farms';
import { countAlerts, filterAlerts, transitionAlert } from '../modules/alerts-analytics/alerts';
import { evaluateAlertRules } from '../api/mock/alert-rules';
import { classifyMoisture } from '../modules/water-crop/fields';
import { indexSnapshot, resolveReading } from '../modules/devices/telemetry';
import { buildOverview } from '../app/overview-model';
import { volumeIn } from '../modules/water-crop/water';
import { createMockBackend } from '../api/mock/mock-backend';
import { loadFarmSnapshot } from '../api/load-snapshot';
import { ApiError } from '../api/types';
import { toCsv } from '../utils/csv';
import { getPeriod } from '../utils/time';

const NOWS = ['2026-10-10T02:10:00', '2026-10-10T09:35:00', '2026-10-10T21:50:00'].map((s) => new Date(s));
const RANGES: DateRangeKey[] = ['today', '7d', '30d'];

function model(farmId: string, now: Date, range: DateRangeKey) {
  const snap = buildDemoSnapshot(farmId, now)!;
  const alerts = evaluateAlertRules(indexSnapshot(snap));
  return { snap, alerts, m: buildOverview(snap, alerts, range, DEFAULT_TARIFF) };
}

describe.each(FARMS.map((f) => f.id))('demo farm %s', (farmId) => {
  describe.each(NOWS)('at %s', (now) => {
    it.each(RANGES)('water chart, KPI and zone table reconcile (%s)', (range) => {
      const { snap, m } = model(farmId, now, range);
      const chartTotal = m.waterSeries.reduce((s, p) => s + (p.current ?? 0), 0);
      const zoneTotal = m.zones.reduce((s, z) => s + z.volumeM3, 0);
      const eventTotal = volumeIn(snap.irrigationEvents, m.period.current, m.now);
      expect(chartTotal).toBeCloseTo(m.water.totalM3, 6);
      expect(zoneTotal).toBeCloseTo(m.water.totalM3, 6);
      expect(eventTotal).toBeCloseTo(m.water.totalM3, 6);
      expect(m.water.totalM3).toBeGreaterThan(0);
    });

    it.each(RANGES)('costs are derived from consumption × tariff (%s)', (range) => {
      const { m } = model(farmId, now, range);
      expect(m.costs.current.waterM3).toBeCloseTo(m.water.totalM3, 6);
      expect(m.costs.current.waterCost).toBeCloseTo(m.water.totalM3 * DEFAULT_TARIFF.waterPricePerM3, 6);
      expect(m.costs.current.energyCost).toBeCloseTo(m.costs.current.energyKWh * DEFAULT_TARIFF.electricityPricePerKWh, 6);
      const seriesTotal = m.costs.series.reduce((s, p) => s + (p.water ?? 0) + (p.energy ?? 0), 0);
      expect(seriesTotal).toBeCloseTo(m.costs.current.total, 6);
      expect(m.costs.previous).not.toBeNull();
    });

    it('device counts match device records', () => {
      const { snap, m } = model(farmId, now, 'today');
      expect(m.devices.total).toBe(snap.devices.length);
      expect(m.devices.online + m.devices.offline).toBe(m.devices.total);
      expect(m.devices.categories.reduce((s, c) => s + c.total, 0)).toBe(m.devices.total);
      expect(m.devices.categories.reduce((s, c) => s + c.online, 0)).toBe(m.devices.online);
      expect(m.devices.offline).toBeGreaterThan(0);
    });

    it('animal totals match animal records and exclude pigs', () => {
      const { snap, m } = model(farmId, now, 'today');
      const head = snap.animals.reduce((s, a) => s + a.headcount, 0);
      expect(m.livestock.totalHead).toBe(head);
      expect(m.livestock.species.reduce((s, sp) => s + sp.head, 0)).toBe(head);
      expect(m.livestock.species.reduce((s, sp) => s + sp.attention, 0)).toBe(m.livestock.withAlerts);
      expect(SUPPORTED_SPECIES as string[]).not.toContain('pig');
      expect(snap.animals.every((a) => SUPPORTED_SPECIES.includes(a.species))).toBe(true);
    });

    it('alert counts match the alert list', () => {
      const { alerts, m } = model(farmId, now, 'today');
      const c = m.alertCounts;
      expect(c.activeTotal + c.acknowledged + c.resolved).toBe(alerts.length);
      expect(filterAlerts(alerts, 'all', 'open')).toHaveLength(c.activeTotal + c.acknowledged);
    });

    it('irrigation KPI matches zone rows', () => {
      const { m } = model(farmId, now, 'today');
      expect(m.irrigation.totalZones).toBe(m.zones.length);
      expect(m.irrigation.activeZones).toBe(m.zones.filter((z) => z.status === 'irrigating').length);
    });
  });
});

describe('data quality', () => {
  const now = NOWS[1];

  it('treats stale and offline readings as unavailable, not zero', () => {
    const { m } = model('farm-zitouna', now, 'today');
    const garden = m.fields.find((f) => f.field.id === 'zit-f4')!;
    expect(garden.status).toBe('no_data');
    expect(garden.moisturePct).toBeNull();
    expect(garden.lastUpdate).not.toBeNull();

    const gardenZone = m.zones.find((z) => z.zone.id === 'zit-z5')!;
    expect(gardenZone.status).toBe('no_data');
    expect(gardenZone.flowM3h).toBeNull();
    expect(gardenZone.flowQuality).toBe('offline');
  });

  it('fields without probes report no data', () => {
    const { m } = model('farm-nefzaoua', now, 'today');
    const barley = m.fields.find((f) => f.field.id === 'nef-f4')!;
    expect(barley.status).toBe('no_data');
    expect(barley.probesTotal).toBe(0);
  });

  it('missing sensors resolve to missing quality', () => {
    const snap = buildDemoSnapshot('farm-zitouna', now)!;
    expect(resolveReading(indexSnapshot(snap), 'does-not-exist').quality).toBe('missing');
  });

  it('uses per-field thresholds', () => {
    expect(classifyMoisture(17, { lowPct: 16, highPct: 28 }).status).toBe('normal');
    expect(classifyMoisture(17, { lowPct: 20, highPct: 35 })).toEqual({ status: 'attention', deviation: 'low' });
    expect(classifyMoisture(null, { lowPct: 20, highPct: 35 }).status).toBe('no_data');
  });

  it('raises the expected rule-based alerts', () => {
    const { alerts } = model('farm-zitouna', now, 'today');
    const types = new Set(alerts.map((a) => a.type));
    for (const t of ['high_water_use', 'low_soil_moisture', 'tank_low', 'pump_long_run', 'device_offline', 'activity_deviation'] as const) {
      expect(types.has(t)).toBe(true);
    }
    expect(alerts.find((a) => a.type === 'high_water_use')?.severity).toBe('critical');
  });
});

describe('periods', () => {
  it('today has 24 hourly buckets and a like-for-like previous window', () => {
    const now = new Date('2026-10-10T09:35:00');
    const p = getPeriod('today', now);
    expect(p.buckets).toHaveLength(24);
    expect(p.current.end).toBe(now.getTime());
    expect(p.current.end - p.current.start).toBe(p.previous.end - p.previous.start);
    expect(p.buckets.filter((b) => !b.isFuture)).toHaveLength(10);
  });

  it('30 days has 30 daily buckets', () => {
    expect(getPeriod('30d', new Date('2026-10-10T09:35:00')).buckets).toHaveLength(30);
  });
});

describe('alert workflow', () => {
  it('acknowledging and resolving updates status and counts', async () => {
    const api = createMockBackend({ now: new Date('2026-10-10T09:35:00'), role: 'manager' });
    const before = await api.alerts.listAlerts('farm-zitouna');
    const target = before.find((a) => a.status === 'active' && a.severity === 'critical')!;
    const acked = await api.alerts.updateAlertStatus('farm-zitouna', target.id, 'acknowledged');
    expect(acked.status).toBe('acknowledged');
    expect(acked.acknowledgedAt).not.toBeNull();
    const after = await api.alerts.listAlerts('farm-zitouna');
    expect(countAlerts(after).active.critical).toBe(countAlerts(before).active.critical - 1);
    const resolved = await api.alerts.updateAlertStatus('farm-zitouna', target.id, 'resolved');
    expect(resolved.status).toBe('resolved');
  });

  it('transitionAlert keeps the first acknowledgement time', () => {
    const [a] = evaluateAlertRules(indexSnapshot(buildDemoSnapshot('farm-zitouna', NOWS[0])!));
    const acked = transitionAlert(a, 'acknowledged', '2026-10-10T10:00:00Z');
    const resolved = transitionAlert(acked, 'resolved', '2026-10-10T11:00:00Z');
    expect(resolved.acknowledgedAt).toBe('2026-10-10T10:00:00Z');
    expect(resolved.resolvedAt).toBe('2026-10-10T11:00:00Z');
  });
});

describe('csv', () => {
  it('escapes separators and quotes', () => {
    expect(toCsv([['a,b', 'say "hi"', null, 3]])).toBe('"a,b","say ""hi""",,3');
  });
});

describe('layer 2 — API & access control (demo backend)', () => {
  const now = new Date('2026-10-10T09:35:00');

  it('assembles the same snapshot from the per-module APIs as the stored records', async () => {
    const api = createMockBackend({ now, role: 'manager' });
    const [farm] = await api.farms.listFarms();
    const viaApi = await loadFarmSnapshot(api, farm);
    const stored = buildDemoSnapshot(farm.id, now)!;
    expect(viaApi.devices).toHaveLength(stored.devices.length);
    expect(viaApi.animals).toHaveLength(stored.animals.length);
    expect(viaApi.latestReadings).toHaveLength(stored.latestReadings.length);
    // 61-day history window covers the 30-day period and its comparison period
    const m = buildOverview(viaApi, [], '30d', DEFAULT_TARIFF);
    expect(m.water.previousM3).not.toBeNull();
    expect(m.water.totalM3).toBeCloseTo(buildOverview(stored, [], '30d', DEFAULT_TARIFF).water.totalM3, 6);
  });

  it('reports no comparison when history does not cover the previous period', async () => {
    const snap = buildDemoSnapshot('farm-zitouna', now)!;
    const truncated = { ...snap, irrigationCoveredFrom: new Date(now.getTime() - 20 * 86_400_000).toISOString() };
    const m = buildOverview(truncated, [], '30d', DEFAULT_TARIFF);
    expect(m.water.previousM3).toBeNull();
    expect(m.water.changePct).toBeNull();
    expect(m.costs.previous).toBeNull();
  });

  it('every reading records when it was received by ingestion', () => {
    const snap = buildDemoSnapshot('farm-zitouna', now)!;
    expect(snap.latestReadings.every((r) => r.receivedAt >= r.timestamp)).toBe(true);
  });

  it('viewers can read but not change alerts', async () => {
    const api = createMockBackend({ now, role: 'viewer' });
    const alerts = await api.alerts.listAlerts('farm-zitouna');
    expect(alerts.length).toBeGreaterThan(0);
    await expect(api.alerts.updateAlertStatus('farm-zitouna', alerts[0].id, 'acknowledged')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('workers can acknowledge but not resolve', async () => {
    const api = createMockBackend({ now, role: 'worker' });
    const target = (await api.alerts.listAlerts('farm-zitouna')).find((a) => a.status === 'active')!;
    await expect(api.alerts.updateAlertStatus('farm-zitouna', target.id, 'acknowledged')).resolves.toMatchObject({ status: 'acknowledged' });
    await expect(api.alerts.updateAlertStatus('farm-zitouna', target.id, 'resolved')).rejects.toBeInstanceOf(ApiError);
  });

  it('validates requests', async () => {
    const api = createMockBackend({ now, role: 'manager' });
    await expect(api.waterCrop.getSetup('unknown-farm')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.waterCrop.listIrrigationEvents('farm-zitouna', now.toISOString(), now.toISOString())).rejects.toMatchObject({ code: 'invalid_request' });
    const target = (await api.alerts.listAlerts('farm-zitouna')).find((a) => a.status === 'active')!;
    await api.alerts.updateAlertStatus('farm-zitouna', target.id, 'resolved');
    await expect(api.alerts.updateAlertStatus('farm-zitouna', target.id, 'acknowledged')).rejects.toMatchObject({ code: 'invalid_request' });
  });
});

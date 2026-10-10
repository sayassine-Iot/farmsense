import type { I18nValue } from '../i18n/context';
import type { CsvCell } from '../utils/csv';
import type { OverviewModel } from './overview-model';

const n = (v: number | null, digits = 2) => (v === null ? '' : v.toFixed(digits));

/**
 * Dashboard summary as CSV rows. Raw numbers with a separate unit column so
 * the file can be re-used in spreadsheets regardless of display locale.
 */
export function buildSummaryCsv(model: OverviewModel, { t }: Pick<I18nValue, 't'>): CsvCell[][] {
  const { farm } = model.idx.snapshot;
  const range = t(`range.long.${model.period.range}`);
  const cur = model.tariff.currency;
  const c = model.costs.current;

  const rows: CsvCell[][] = [
    ['FarmSense', farm.name, farm.region, farm.country],
    [t('export.dataNote')],
    [t('export.generated'), new Date(model.now).toISOString(), t('header.range'), range],
    [],
    [t('export.section.summary')],
    [t('export.metric'), t('export.value'), t('export.unit')],
    [t('kpi.water.title'), n(model.water.totalM3), 'm3'],
    [`${t('kpi.water.title')} – ${t('chart.previous')}`, n(model.water.previousM3), 'm3'],
    [`${t('kpi.water.title')} – %`, n(model.water.changePct, 1), '%'],
    [t('chart.target'), n(model.water.targetM3), 'm3'],
    [t('kpi.irrigation.title'), `${model.irrigation.activeZones}/${model.irrigation.totalZones}`, 'zones'],
    [t('kpi.irrigation.warnings'), model.irrigation.zonesWithWarnings, 'zones'],
    [t('kpi.livestock.title'), model.livestock.totalHead, 'head'],
    [t('kpi.livestock.monitored'), model.livestock.monitoredHead, 'head'],
    [t('kpi.livestock.alerts'), model.livestock.withAlerts, 'animals'],
    [t('devices.registered'), model.devices.total, 'devices'],
    [t('devices.online'), model.devices.online, 'devices'],
    [t('devices.offline'), model.devices.offline, 'devices'],
    [t('devices.stale'), model.devices.stale, 'devices'],
    [t('devices.lowBattery'), model.devices.lowBattery, 'devices'],
    [`${t('costs.water')} (${t('common.estimate')})`, n(c.waterCost), cur],
    [`${t('costs.energy')} (${t('common.estimate')})`, n(c.energyCost), cur],
    [`${t('costs.energy')}`, n(c.energyKWh), 'kWh'],
    [t('costs.waterPrice'), model.tariff.waterPricePerM3, `${cur}/m3`],
    [t('costs.elecPrice'), model.tariff.electricityPricePerKWh, `${cur}/kWh`],
    [],
    [t('export.section.zones')],
    [t('zones.col.zone'), t('zones.col.field'), t('zones.col.status'), 'Flow (m3/h)', `Volume (m3)`, t('zones.col.valve'), t('zones.col.pump'), t('zones.col.updated')],
    ...model.zones.map((z) => [z.zone.name, z.field?.name ?? '', t(`zones.status.${z.status}`), n(z.flowM3h, 1), n(z.volumeM3), t(`valve.${z.valve}`), t(`pump.${z.pump}`), z.lastUpdate ?? '']),
    [],
    [t('export.section.fields')],
    [t('zones.col.field'), 'Crop', 'Area (ha)', 'Soil moisture (% VWC)', 'Low (%)', 'High (%)', t('zones.col.status'), t('zones.col.updated')],
    ...model.fields.map((f) => [f.field.name, f.crop ? t(`crop.${f.crop.key}` as Parameters<typeof t>[0]) : '', f.field.areaHa, n(f.moisturePct, 1), f.thresholds.lowPct, f.thresholds.highPct, t(`fields.status.${f.status}`), f.lastUpdate ?? '']),
    [],
    [t('export.section.alerts')],
    ['Severity', 'Status', 'Type', 'Target', 'Created'],
    ...model.alerts.map((a) => [t(`alerts.severity.${a.severity}`), t(`alerts.status.${a.status}`), t(`alert.${a.type}.title` as Parameters<typeof t>[0]), String(a.params.zone ?? a.params.field ?? a.params.animal ?? a.params.device ?? a.params.tank ?? a.target.id), a.createdAt]),
  ];
  return rows;
}

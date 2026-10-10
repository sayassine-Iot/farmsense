import { ArrowDown, ArrowUp, ArrowUpDown, Download, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/context';
import type { OverviewModel } from '../../app/overview-model';
import type { EquipmentState, ZoneRow, ZoneStatus } from '../../modules/water-crop/zones';
import { downloadCsv, fileStamp, toCsv } from '../../utils/csv';
import { Card } from '../common/Card';
import { EmptyState, SearchInput, SelectField } from '../common/controls';
import { Freshness } from '../common/Freshness';
import { StatusBadge } from '../common/StatusBadge';
import { SEVERITY_TONE, type Tone } from '../common/tone';
import { useToast } from '../common/toast-context';

const STATUS_TONE: Record<ZoneStatus, Tone> = { irrigating: 'info', idle: 'neutral', no_data: 'warn' };
type SortKey = 'zone' | 'field' | 'flow' | 'volume' | 'updated';

function equipmentClass(s: EquipmentState) {
  return s === 'on' ? 'text-info font-medium' : s === 'unknown' ? 'text-warn' : 'text-ink-2';
}

export function IrrigationZonesTable({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const notify = useToast();
  const [status, setStatus] = useState<ZoneStatus | 'all'>('all');
  const [field, setField] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'zone', dir: 1 });

  const fields = model.idx.snapshot.fields.filter((f) => model.zones.some((z) => z.zone.fieldId === f.id));
  const rangeLabel = t(`range.long.${model.period.range}`);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = model.zones.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (field === 'all' || r.zone.fieldId === field) &&
        (!q || r.zone.name.toLowerCase().includes(q) || (r.field?.name.toLowerCase().includes(q) ?? false)),
    );
    const value = (r: ZoneRow): string | number => {
      switch (sort.key) {
        case 'zone': return r.zone.name;
        case 'field': return r.field?.name ?? '';
        case 'flow': return r.flowM3h ?? -1;
        case 'volume': return r.volumeM3;
        case 'updated': return r.lastUpdate ?? '';
      }
    };
    return [...filtered].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
    });
  }, [model.zones, status, field, query, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'zone' || key === 'field' ? 1 : -1 }));

  const exportCsv = () => {
    const header = [t('zones.col.zone'), t('zones.col.field'), t('zones.col.status'), `${t('zones.col.flow')} (m3/h)`, `${t('chart.volume')} (m3) – ${rangeLabel}`, t('zones.col.valve'), t('zones.col.pump'), t('zones.col.updated'), t('zones.col.alerts')];
    const body = rows.map((r) => [
      r.zone.name,
      r.field?.name ?? '',
      t(`zones.status.${r.status}`),
      r.flowM3h === null ? '' : r.flowM3h.toFixed(1),
      r.volumeM3.toFixed(2),
      t(`valve.${r.valve}`),
      t(`pump.${r.pump}`),
      r.lastUpdate ?? '',
      r.alertCount,
    ]);
    downloadCsv(`farmsense-zones-${model.idx.snapshot.farm.id}-${fileStamp(model.now)}.csv`, toCsv([[t('export.dataNote')], header, ...body]));
    notify(t('export.done'), 'success');
  };

  const sortHeader = (k: SortKey, label: string, align: 'start' | 'end' = 'start') => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th key={k} scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-medium ${align === 'end' ? 'text-end' : 'text-start'}`}>
        <button type="button" onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`} aria-label={t('common.sortBy', { column: label })}>
          {label}
          <Icon aria-hidden className="size-3" />
        </button>
      </th>
    );
  };

  const flowCell = (r: ZoneRow) =>
    r.flowM3h === null ? (
      <span className="text-warn">{r.flowQuality === 'offline' ? t('zones.meterOffline') : t('common.unavailable')}</span>
    ) : (
      <span className="tabular">{fmt.flow(r.flowM3h)}</span>
    );

  const alertCell = (r: ZoneRow) =>
    r.alertCount > 0 && r.topSeverity ? (
      <StatusBadge tone={SEVERITY_TONE[r.topSeverity]} size="xs">
        {r.alertCount}
      </StatusBadge>
    ) : (
      <span className="text-ink-3">{t('zones.noAlerts')}</span>
    );

  return (
    <Card
      title={t('zones.title')}
      subtitle={t('zones.subtitle')}
      icon={<Waves className="size-[18px]" />}
      actions={
        <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-subtle disabled:opacity-50">
          <Download aria-hidden className="size-3.5" /> {t('common.exportCsv')}
        </button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <SelectField
          label={t('zones.col.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: t('zones.allStatuses') },
            { value: 'irrigating', label: t('zones.status.irrigating') },
            { value: 'idle', label: t('zones.status.idle') },
            { value: 'no_data', label: t('zones.status.no_data') },
          ]}
        />
        <SelectField label={t('zones.col.field')} value={field} onChange={setField} options={[{ value: 'all', label: t('zones.allFields') }, ...fields.map((f) => ({ value: f.id, label: f.name }))]} />
        <div className="col-span-2 sm:col-span-1">
          <SearchInput value={query} onChange={setQuery} placeholder={t('zones.search')} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState>{t('zones.empty')}</EmptyState>
      ) : (
        <>
          {/* Table: tablet and up */}
          <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-subtle text-ink-3">
                <tr>
                  {sortHeader('zone', t('zones.col.zone'))}
                  {sortHeader('field', t('zones.col.field'))}
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t('zones.col.status')}</th>
                  {sortHeader('flow', t('zones.col.flow'), 'end')}
                  {sortHeader('volume', t('zones.col.volume', { range: t(`range.${model.period.range}`) }), 'end')}
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t('zones.col.valve')}</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t('zones.col.pump')}</th>
                  {sortHeader('updated', t('zones.col.updated'))}
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t('zones.col.alerts')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.zone.id} className="hover:bg-subtle/60">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink">{r.zone.name}</div>
                      <div className="text-[11px] text-ink-3">{t(`method.${r.zone.method}`)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{r.field?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={STATUS_TONE[r.status]} size="xs" icon={r.status === 'irrigating' ? Waves : undefined}>
                        {t(`zones.status.${r.status}`)}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-end">{flowCell(r)}</td>
                    <td className="tabular px-3 py-2.5 text-end font-medium text-ink">{fmt.volume(r.volumeM3, 1)}</td>
                    <td className={`px-3 py-2.5 ${equipmentClass(r.valve)}`}>{t(`valve.${r.valve}`)}</td>
                    <td className={`px-3 py-2.5 ${equipmentClass(r.pump)}`} title={r.pumpName ?? undefined}>{t(`pump.${r.pump}`)}</td>
                    <td className="px-3 py-2.5"><Freshness timestamp={r.lastUpdate} quality={r.flowQuality} now={model.now} prefix={false} /></td>
                    <td className="px-3 py-2.5">{alertCell(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards: phones */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.zone.id} className="rounded-lg border border-line p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{r.zone.name}</p>
                    <p className="truncate text-ink-3">{r.field?.name} · {t(`method.${r.zone.method}`)}</p>
                  </div>
                  <StatusBadge tone={STATUS_TONE[r.status]} size="xs">{t(`zones.status.${r.status}`)}</StatusBadge>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <dt className="text-ink-3">{t('zones.col.flow')}</dt><dd className="text-end">{flowCell(r)}</dd>
                  <dt className="text-ink-3">{t('zones.col.volume', { range: t(`range.${model.period.range}`) })}</dt><dd className="tabular text-end font-medium">{fmt.volume(r.volumeM3, 1)}</dd>
                  <dt className="text-ink-3">{t('zones.col.valve')} / {t('zones.col.pump')}</dt>
                  <dd className="text-end"><span className={equipmentClass(r.valve)}>{t(`valve.${r.valve}`)}</span> / <span className={equipmentClass(r.pump)}>{t(`pump.${r.pump}`)}</span></dd>
                  <dt className="text-ink-3">{t('zones.col.updated')}</dt><dd className="text-end"><Freshness timestamp={r.lastUpdate} quality={r.flowQuality} now={model.now} prefix={false} /></dd>
                  <dt className="text-ink-3">{t('zones.col.alerts')}</dt><dd className="text-end">{alertCell(r)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

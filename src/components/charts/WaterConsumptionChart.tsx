import { BarChart3, Droplets } from 'lucide-react';
import { useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };
import { DATE_RANGES, type DateRangeKey } from '../../config/app';
import { useI18n } from '../../i18n/context';
import type { OverviewModel } from '../../app/overview-model';
import { Card } from '../common/Card';
import { EmptyState, SegmentedControl } from '../common/controls';

const C = {
  current: '#2563eb',
  previous: '#94a3b8',
  target: '#f08c1a',
  grid: '#edf0f5',
  tick: '#74829a',
};

interface Point {
  label: string;
  long: string;
  current: number | null;
  previous: number | null;
}

function ChartTooltip({ active, payload, unit }: TipProps & { unit: string }) {
  const { t, fmt } = useI18n();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold text-ink">{p.long}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-ink-2">
          <span className="size-2.5 rounded-full" style={{ background: C.current }} />
          {t('chart.current')}
        </span>
        <span className="tabular font-semibold text-ink">{p.current === null ? '—' : `${fmt.number(p.current, 1)} ${unit}`}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-ink-2">
          <span className="h-0.5 w-2.5 rounded" style={{ background: C.previous }} />
          {t('chart.previous')}
        </span>
        <span className="tabular font-medium text-ink-2">{p.previous === null ? t('common.unavailable') : `${fmt.number(p.previous, 1)} ${unit}`}</span>
      </div>
    </div>
  );
}

export function WaterConsumptionChart({ model, onRangeChange }: { model: OverviewModel; onRangeChange: (r: DateRangeKey) => void }) {
  const { t, fmt } = useI18n();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { period, waterSeries, water } = model;
  const unit = fmt.volumeUnit();
  const granularity = period.granularity;
  const dailyTarget = granularity === 'day' ? model.idx.snapshot.farm.dailyWaterTargetM3 : null;

  const data: Point[] = waterSeries.map((p) => ({
    label: fmt.bucket(p.start, granularity),
    long: fmt.bucketLong(p.start, granularity),
    current: p.current,
    previous: p.previous,
  }));
  const hasData = waterSeries.some((p) => (p.current ?? 0) > 0);
  const hasPrevious = waterSeries.some((p) => p.previous !== null);

  return (
    <Card
      title={t('chart.water.title')}
      subtitle={t('chart.water.subtitle', { bucket: t(granularity === 'hour' ? 'chart.hour' : 'chart.day'), unit })}
      icon={<Droplets className="size-[18px]" />}
      actions={
        <>
          <SegmentedControl label={t('header.range')} value={period.range} onChange={onRangeChange} options={DATE_RANGES.map((r) => ({ value: r, label: t(`range.${r}`) }))} />
          <SegmentedControl
            label={`${t('common.chart')} / ${t('common.table')}`}
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: t('common.chart') },
              { value: 'table', label: t('common.table') },
            ]}
          />
        </>
      }
      footer={model.unmeteredZones > 0 ? t('chart.unmetered') : undefined}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: C.current }} aria-hidden />
          {t('chart.current')} · <strong className="tabular font-semibold text-ink">{fmt.volume(water.totalM3)}</strong>
        </span>
        {hasPrevious && (
          <span className="flex items-center gap-1.5">
            <svg width="14" height="4" aria-hidden><line x1="0" y1="2" x2="14" y2="2" stroke={C.previous} strokeWidth="2" strokeDasharray="4 2" /></svg>
            {t('chart.previous')}
            {water.previousM3 !== null && <> · <span className="tabular">{fmt.volume(water.previousM3)}</span></>}
          </span>
        )}
        {dailyTarget !== null && (
          <span className="flex items-center gap-1.5">
            <svg width="14" height="4" aria-hidden><line x1="0" y1="2" x2="14" y2="2" stroke={C.target} strokeWidth="2" strokeDasharray="2 2" /></svg>
            {t('chart.target')} · <span className="tabular">{fmt.volume(dailyTarget)}</span>
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState icon={<BarChart3 className="size-6 text-ink-3" />}>{t('chart.empty')}</EmptyState>
      ) : view === 'chart' ? (
        <div dir="ltr" className="h-64 w-full sm:h-[19rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.current} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={C.current} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: C.grid }} tick={{ fontSize: 11, fill: C.tick }} minTickGap={14} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.tick }} width={48} tickFormatter={(v: number) => fmt.number(v)} />
              <Tooltip content={(props) => <ChartTooltip {...props} unit={unit} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
              <Area dataKey="current" name={t('chart.current')} type="monotoneX" stroke={C.current} strokeWidth={2.5} fill="url(#waterFill)" dot={granularity === 'day' ? { r: 2.5, fill: C.current, strokeWidth: 0 } : false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} connectNulls={false} isAnimationActive={false} />
              {hasPrevious && (
                <Line dataKey="previous" name={t('chart.previous')} type="monotoneX" stroke={C.previous} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} connectNulls={false} isAnimationActive={false} />
              )}
              {dailyTarget !== null && <ReferenceLine y={dailyTarget} stroke={C.target} strokeDasharray="3 3" strokeWidth={1.5} ifOverflow="extendDomain" />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-subtle text-ink-3">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t('chart.period')}</th>
                <th className="px-3 py-2 text-end font-medium">{t('chart.current')}</th>
                <th className="px-3 py-2 text-end font-medium">{t('chart.previous')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((p) => (
                <tr key={p.long}>
                  <td className="px-3 py-1.5 text-ink-2">{p.long}</td>
                  <td className="tabular px-3 py-1.5 text-end font-medium">{p.current === null ? '—' : fmt.volume(p.current, 1)}</td>
                  <td className="tabular px-3 py-1.5 text-end text-ink-2">{p.previous === null ? t('common.unavailable') : fmt.volume(p.previous, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

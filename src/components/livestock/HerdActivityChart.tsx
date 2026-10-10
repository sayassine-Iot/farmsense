import { BarChart3, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n/context';
import type { HerdHealth } from '../../modules/livestock/herd-health';
import { Card } from '../common/Card';
import { EmptyState, SegmentedControl } from '../common/controls';

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

const C = {
  activity: '#2a78d6',
  rumination: '#1baf7a',
  baseline: '#94a3b8',
  grid: '#edf0f5',
  tick: '#74829a',
};

interface Point {
  label: string;
  long: string;
  activity: number | null;
  rumination: number | null;
}

function ChartTooltip({ active, payload, showRumination }: TipProps & { showRumination: boolean }) {
  const { t, fmt } = useI18n();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  const row = (color: string, label: string, value: string) => (
    <div className="mt-1 flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-ink-2">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular font-semibold text-ink">{value}</span>
    </div>
  );
  return (
    <div className="min-w-48 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink">{p.long}</p>
      {row(C.activity, t('herd.activity.activityShort'), p.activity === null ? t('common.unavailable') : fmt.percent(p.activity))}
      {showRumination && row(C.rumination, t('herd.activity.ruminationShort'), p.rumination === null ? t('common.unavailable') : t('herd.unit.minPerHour', { value: fmt.number(p.rumination, 0) }))}
    </div>
  );
}

/**
 * Herd activity and rumination over the last 24 hours. The two measures have
 * different units, so they are drawn as two synced charts on a shared time
 * axis instead of one chart with two scales.
 */
export function HerdActivityChart({ herd }: { herd: HerdHealth }) {
  const { t, fmt } = useI18n();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const data: Point[] = herd.activity.map((p) => ({
    label: fmt.time(p.hourStart),
    long: fmt.bucketLong(p.hourStart, 'hour'),
    activity: p.activityPctOfBaseline,
    rumination: p.ruminationMin,
  }));
  const hasData = data.some((p) => p.activity !== null);
  const showRumination = herd.hasRumination && data.some((p) => p.rumination !== null);
  const tooltip = <Tooltip content={(props) => <ChartTooltip {...props} showRumination={showRumination} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />;
  const xAxis = (hide: boolean) => (
    <XAxis dataKey="label" hide={hide} tickLine={false} axisLine={{ stroke: C.grid }} tick={{ fontSize: 11, fill: C.tick }} interval={5} />
  );

  return (
    <Card
      title={t('herd.activity.title')}
      subtitle={t('herd.activity.subtitle')}
      icon={<TrendingUp />}
      actions={
        <SegmentedControl
          label={`${t('common.chart')} / ${t('common.table')}`}
          value={view}
          onChange={setView}
          options={[
            { value: 'chart', label: t('common.chart') },
            { value: 'table', label: t('common.table') },
          ]}
        />
      }
    >
      {!hasData ? (
        <EmptyState icon={<BarChart3 className="size-6 text-ink-3" />}>{t('herd.activity.empty')}</EmptyState>
      ) : view === 'chart' ? (
        <div dir="ltr" className="space-y-3">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-2" dir="auto">
              <span className="size-2.5 rounded-full" style={{ background: C.activity }} aria-hidden />
              {t('herd.activity.activity')}
              <svg width="14" height="4" className="ms-3" aria-hidden><line x1="0" y1="2" x2="14" y2="2" stroke={C.baseline} strokeWidth="2" strokeDasharray="3 2" /></svg>
              <span className="text-ink-3">{t('herd.activity.baseline')}</span>
            </p>
            <div className={showRumination ? 'h-44' : 'h-64'}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} syncId="herd-activity" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="herdActivityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.activity} stopOpacity={0.24} />
                      <stop offset="100%" stopColor={C.activity} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  {xAxis(showRumination)}
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.tick }} width={44} domain={[0, (max: number) => Math.max(150, Math.ceil(max / 50) * 50)]} tickFormatter={(v: number) => `${v}%`} />
                  <ReferenceLine y={100} stroke={C.baseline} strokeDasharray="3 3" strokeWidth={1.5} />
                  {tooltip}
                  <Area dataKey="activity" type="monotoneX" stroke={C.activity} strokeWidth={2} fill="url(#herdActivityFill)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} connectNulls={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {showRumination && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-2" dir="auto">
                <span className="size-2.5 rounded-full" style={{ background: C.rumination }} aria-hidden />
                {t('herd.activity.rumination')}
              </p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} syncId="herd-activity" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="herdRuminationFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.rumination} stopOpacity={0.24} />
                        <stop offset="100%" stopColor={C.rumination} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    {xAxis(false)}
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.tick }} width={44} domain={[0, 60]} ticks={[0, 30, 60]} />
                    {tooltip}
                    <Area dataKey="rumination" type="monotoneX" stroke={C.rumination} strokeWidth={2} fill="url(#herdRuminationFill)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} connectNulls={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-80 overflow-auto rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-subtle text-ink-3">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t('herd.activity.hour')}</th>
                <th className="px-3 py-2 text-end font-medium">{t('herd.activity.activityShort')}</th>
                {showRumination && <th className="px-3 py-2 text-end font-medium">{t('herd.activity.ruminationShort')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((p) => (
                <tr key={p.long}>
                  <td className="px-3 py-1.5 text-ink-2">{p.long}</td>
                  <td className="tabular px-3 py-1.5 text-end font-medium">{p.activity === null ? t('common.unavailable') : fmt.percent(p.activity)}</td>
                  {showRumination && (
                    <td className="tabular px-3 py-1.5 text-end text-ink-2">{p.rumination === null ? t('common.unavailable') : t('herd.unit.minPerHour', { value: fmt.number(p.rumination, 0) })}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

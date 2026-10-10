import { Activity, HeartPulse, MapPin, PieChart as PieIcon, Radio, ShieldAlert, Thermometer, Wheat, Wind, type LucideIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useI18n } from '../../i18n/context';
import { HERD_STATUSES, type CoverageSensor, type HealthSignal, type HerdHealth, type HerdStatus } from '../../modules/livestock/herd-health';
import { Card } from '../common/Card';
import { Dot } from '../common/StatusBadge';

/** Status colors are reserved for state; the two "no reading" states are neutral grays. */
const STATUS_COLOR: Record<HerdStatus, { fill: string; dot: string }> = {
  healthy: { fill: '#22a55a', dot: 'bg-ok-mark' },
  warning: { fill: '#f97316', dot: 'bg-warn-mark' },
  critical: { fill: '#ef4444', dot: 'bg-crit-mark' },
  offline: { fill: '#94a3b8', dot: 'bg-slate-400' },
  untagged: { fill: '#dde3ec', dot: 'bg-line-strong' },
};

const SIGNAL_ICON: Record<HealthSignal, LucideIcon> = {
  respiration: Wind,
  activity: Activity,
  temperature: Thermometer,
  rumination: Wheat,
  heartRate: HeartPulse,
};

const SENSOR_ICON: Record<CoverageSensor, LucideIcon> = {
  activity: Activity,
  body_temperature: Thermometer,
  respiration_rate: Wind,
  heart_rate: HeartPulse,
  position: MapPin,
};

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="h-2.5 overflow-hidden rounded-full bg-chip" aria-hidden>
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }} />
    </span>
  );
}

export function HerdStatusDonut({ herd }: { herd: HerdHealth }) {
  const { t, fmt } = useI18n();
  const total = herd.totalHead;
  const data = HERD_STATUSES.map((key) => ({ key, value: herd.status[key] }));

  return (
    <Card title={t('herd.status.title')} subtitle={t('herd.status.subtitle')} icon={<PieIcon />}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-5 lg:flex-col xl:flex-row">
        <div className="relative size-36 shrink-0" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="key" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 1.5 : 0} stroke="none" isAnimationActive={false}>
                {data.filter((d) => d.value > 0).map((d) => (
                  <Cell key={d.key} fill={STATUS_COLOR[d.key].fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="tabular text-3xl font-extrabold leading-none text-ink">{fmt.number(total)}</p>
              <p className="mt-1 text-xs text-ink-3">{t('herd.status.center')}</p>
            </div>
          </div>
        </div>
        <dl className="w-full min-w-0 flex-1 space-y-2.5">
          {data.map((d) => (
            <div key={d.key} className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-center gap-2.5 text-sm">
              <dt className="flex min-w-0 items-center gap-2.5 text-ink-2">
                <Dot className={STATUS_COLOR[d.key].dot} />
                <span className="truncate">{t(`herd.status.${d.key}`)}</span>
              </dt>
              <dd className="tabular font-bold text-ink">{fmt.number(d.value)}</dd>
              <dd className="tabular text-end text-xs text-ink-3">{total ? fmt.percent((d.value / total) * 100, 1) : '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

export function AlertsBySignal({ herd }: { herd: HerdHealth }) {
  const { t } = useI18n();
  const max = Math.max(1, ...herd.signals.map((s) => s.animals ?? 0));

  return (
    <Card title={t('herd.signals.title')} subtitle={t('herd.signals.subtitle')} icon={<ShieldAlert />}>
      <ul className="space-y-3.5">
        {herd.signals.map(({ key, animals }) => {
          const Icon = SIGNAL_ICON[key];
          return (
            <li key={key} className="grid grid-cols-[minmax(0,8.5rem)_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2.5 text-ink-2">
                <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
                <span className="truncate">{t(`herd.signal.${key}`)}</span>
              </span>
              {animals === null ? (
                <span className="text-xs text-ink-3">{t('herd.notMeasured')}</span>
              ) : (
                <Meter pct={(animals / max) * 100} color={animals ? 'bg-navy-600' : 'bg-chip'} />
              )}
              <span className={`tabular text-end font-bold ${animals ? 'text-ink' : 'text-ink-3'}`}>{animals ?? '—'}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function SensorCoverage({ herd }: { herd: HerdHealth }) {
  const { t, fmt } = useI18n();

  return (
    <Card title={t('herd.coverage.title')} subtitle={t('herd.coverage.subtitle')} icon={<Radio />}>
      <ul className="space-y-3.5">
        {herd.coverage.map(({ sensor, pct, reporting, eligible }) => {
          const Icon = SENSOR_ICON[sensor];
          const detail = t('herd.coverage.detail', { reporting, eligible });
          return (
            <li key={sensor} className="grid grid-cols-[minmax(0,8.5rem)_1fr_3rem] items-center gap-3 text-sm" title={pct === null ? undefined : detail}>
              <span className="flex min-w-0 items-center gap-2.5 text-ink-2">
                <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
                <span className="truncate">{t(`herd.sensor.${sensor}`)}</span>
              </span>
              {pct === null ? <span className="text-xs text-ink-3">{t('herd.notMeasured')}</span> : <Meter pct={pct} color="bg-water" />}
              <span className="tabular text-end text-[13px] font-bold text-ink">
                {pct === null ? '—' : fmt.percent(pct)}
                {pct !== null && <span className="sr-only"> ({detail})</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

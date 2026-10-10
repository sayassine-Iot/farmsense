import {
  AlertTriangle,
  BatteryCharging,
  CloudSun,
  Cpu,
  Droplet,
  Gauge,
  Home,
  PieChart as PieIcon,
  Radio,
  RadioTower,
  Tag,
  ToggleRight,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useI18n } from '../../i18n/context';
import type { OverviewModel } from '../../app/overview-model';
import type { FieldStatus } from '../../modules/water-crop/fields';
import type { DeviceType } from '../../types/domain';
import { Card } from '../common/Card';
import { EmptyState } from '../common/controls';
import { Dot } from '../common/StatusBadge';

const FIELD_STATUS: { key: FieldStatus; color: string; dot: string }[] = [
  { key: 'normal', color: '#22a55a', dot: 'bg-ok-mark' },
  { key: 'attention', color: '#f97316', dot: 'bg-warn-mark' },
  { key: 'no_data', color: '#cbd3e1', dot: 'bg-line-strong' },
];

export function FieldStatusDonut({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const total = model.fields.length;
  const data = FIELD_STATUS.map((s) => ({ ...s, value: model.fields.filter((f) => f.status === s.key).length }));

  return (
    <Card title={t('fields.donutTitle')} subtitle={t('fields.donutSubtitle')} icon={<PieIcon />}>
      {total === 0 ? (
        <EmptyState>{t('common.noData')}</EmptyState>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <div className="relative size-40 shrink-0" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.filter((d) => d.value > 0)} dataKey="value" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} paddingAngle={2} stroke="none" cornerRadius={3} isAnimationActive={false}>
                  {data.filter((d) => d.value > 0).map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="tabular text-3xl font-extrabold leading-none text-ink">{total}</p>
                <p className="mt-1 text-xs text-ink-3">{t('fields.donutCenter')}</p>
              </div>
            </div>
          </div>
          <dl className="w-full min-w-0 flex-1 space-y-3.5">
            {data.map((d) => (
              <div key={d.key} className="grid grid-cols-[1fr_auto_3.5rem] items-center gap-3 text-sm">
                <dt className="flex min-w-0 items-center gap-2.5 text-ink-2">
                  <Dot className={d.dot} />
                  <span className="truncate">{t(`fields.status.${d.key}`)}</span>
                </dt>
                <dd className="tabular font-bold text-ink">{d.value}</dd>
                <dd className="tabular text-end text-xs text-ink-3">{fmt.percent((d.value / total) * 100, 1)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}

export function WaterByZone({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const rows = [...model.zones].sort((a, b) => b.volumeM3 - a.volumeM3);
  const max = Math.max(...rows.map((r) => r.volumeM3), 0);

  return (
    <Card title={t('zones.byZoneTitle')} subtitle={t('zones.byZoneSubtitle', { range: t(`range.long.${model.period.range}`) })} icon={<Droplet />}>
      {rows.length === 0 ? (
        <EmptyState>{t('common.noData')}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = max > 0 ? (r.volumeM3 / max) * 100 : 0;
            const noData = r.status === 'no_data';
            return (
              <li key={r.zone.id} className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-ink-2">
                  <Waves aria-hidden className="size-4 shrink-0 text-ink-3" />
                  <span className="truncate" title={r.zone.name}>{r.zone.name}</span>
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-chip" aria-hidden>
                  <span className={`block h-full rounded-full ${noData ? 'bg-line-strong' : 'bg-water'}`} style={{ width: `${Math.max(pct, r.volumeM3 > 0 ? 2 : 0)}%` }} />
                </span>
                <span className="tabular flex min-w-16 items-center justify-end gap-1 text-end font-bold text-ink">
                  {r.alertCount > 0 && <AlertTriangle aria-label={t('zones.col.alerts')} className="size-3.5 text-warn" />}
                  {fmt.volume(r.volumeM3)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {model.unmeteredZones > 0 && <p className="mt-4 text-xs text-warn">{t('chart.unmetered')}</p>}
    </Card>
  );
}

const DEVICE_ICON: Record<DeviceType, LucideIcon> = {
  soil_probe: Gauge,
  flow_meter: Waves,
  tank_level: Droplet,
  pump_monitor: Zap,
  valve_controller: ToggleRight,
  weather_station: CloudSun,
  barn_sensor: Home,
  livestock_tag: Tag,
  gateway: RadioTower,
};

export function DeviceCoverage({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const { devices } = model;
  return (
    <Card title={t('devices.coverageTitle')} subtitle={t('devices.coverageSubtitle')} icon={<Radio />}>
      <ul className="space-y-3">
        {devices.categories.map((c) => {
          const Icon = DEVICE_ICON[c.type] ?? Cpu;
          const pct = (c.online / c.total) * 100;
          const full = c.online === c.total;
          return (
            <li key={c.type} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink-2">
                <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
                <span className="truncate">{t(`deviceType.${c.type}`)}</span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-chip" aria-hidden>
                <span className={`block h-full rounded-full ${full ? 'bg-navy-600' : 'bg-warn-mark'}`} style={{ width: `${pct}%` }} />
              </span>
              <span className={`tabular text-end text-[13px] font-bold ${full ? 'text-ink' : 'text-warn'}`} title={`${c.online}/${c.total}`}>
                {fmt.percent(pct)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-3">
        <span className="flex items-center gap-1.5"><BatteryCharging aria-hidden className="size-3.5" />{t('devices.lowBattery')}: <strong className="text-ink">{devices.lowBattery}</strong></span>
        <span>{t('devices.stale')}: <strong className="text-ink">{devices.stale}</strong></span>
        <span>{t('devices.registered')}: <strong className="text-ink">{devices.total}</strong></span>
      </div>
    </Card>
  );
}

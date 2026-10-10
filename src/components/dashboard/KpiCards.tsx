import { Coins, Droplets, HeartPulse, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/context';
import type { OverviewModel } from '../../app/overview-model';
import { IconChip } from '../common/Card';
import { Delta } from '../common/Delta';
import { Dot } from '../common/StatusBadge';

export function KpiCard({ icon, iconTone, title, children }: { icon: ReactNode; iconTone?: Parameters<typeof IconChip>[0]['tone']; title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line/60 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-pop hover:ring-line-strong motion-reduce:transform-none">
      <header className="mb-4 flex items-center gap-3">
        <IconChip tone={iconTone}>{icon}</IconChip>
        <h2 className="truncate text-[15px] font-bold text-ink">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function BigNumber({ value, suffix, color = 'text-ink' }: { value: string; suffix?: string; color?: string }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className={`tabular text-[40px] font-extrabold leading-none tracking-tight ${color}`}>{value}</span>
      {suffix && <span className="text-sm font-semibold text-ink-3">{suffix}</span>}
    </p>
  );
}

export function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-2 w-full overflow-hidden rounded-full bg-chip">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(value > 0 ? 2 : 0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Primary business metric, styled as the hero card. */
function WaterHero({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const { water, period, irrigation } = model;
  const overTarget = water.targetUsedPct !== null && water.targetUsedPct > 100;
  const change = water.changePct;

  return (
    <section className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 p-5 text-white shadow-[0_12px_32px_-12px_rgb(29_52_135/0.6)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgb(29_52_135/0.7)] motion-reduce:transform-none">
      <Droplets aria-hidden className="pointer-events-none absolute -end-6 -top-4 -z-10 size-44 text-white/[0.07]" strokeWidth={1.2} />
      <header className="flex items-center gap-2.5">
        <Droplets aria-hidden className="size-[18px] text-sky-300" />
        <h2 className="truncate text-[13px] font-bold uppercase tracking-[0.08em] text-white/90">
          {t('kpi.water.hero')} · {t(`range.long.${period.range}`)}
        </h2>
      </header>

      <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-1.5">
          <span className="tabular text-[52px] font-extrabold leading-none tracking-tight">{fmt.number(water.totalM3, water.totalM3 < 10 ? 1 : 0)}</span>
          <span className="text-lg font-semibold text-white/80">{fmt.volumeUnit()}</span>
        </p>
        <p className="pb-1 text-sm text-white/75">
          {water.targetM3 !== null && water.targetUsedPct !== null
            ? t('kpi.water.ofTarget', { target: fmt.volume(water.targetM3), pct: fmt.percent(water.targetUsedPct) })
            : t('kpi.water.noTargetShort')}
        </p>
      </div>
      {water.targetUsedPct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(water.targetUsedPct)} aria-label={t('chart.target')}>
          <div className={`h-full rounded-full ${overTarget ? 'bg-warn-mark' : 'bg-sky-300'}`} style={{ width: `${Math.min(100, water.targetUsedPct)}%` }} />
        </div>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-white/15 pt-4 text-[13px]">
        {[
          { dot: 'bg-sky-300', label: t(`range.vs.${period.range}`), value: change === null ? '—' : `${change > 0 ? '+' : ''}${fmt.percent(change, Math.abs(change) < 10 ? 1 : 0)}` },
          { dot: 'bg-ok-mark', label: t('kpi.water.zonesActive'), value: `${irrigation.activeZones}/${irrigation.totalZones}` },
          { dot: model.unmeteredZones > 0 ? 'bg-warn-mark' : 'bg-white/40', label: t('kpi.water.metersOffline'), value: model.unmeteredZones },
          { dot: 'bg-white/40', label: t('kpi.water.previous'), value: water.previousM3 === null ? '—' : fmt.volume(water.previousM3) },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <dt className="flex min-w-0 items-center gap-2 text-white/80">
              <Dot className={r.dot} />
              <span className="truncate">{r.label}</span>
            </dt>
            <dd className="tabular shrink-0 font-bold">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function KpiRow({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const { livestock, devices, costs, tariff, period } = model;
  const offlinePct = devices.total ? (devices.offline / devices.total) * 100 : 0;
  const costTotal = costs.current.total;
  const waterShare = costTotal > 0 ? (costs.current.waterCost / costTotal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
      <WaterHero model={model} />

      <KpiCard icon={<HeartPulse />} iconTone="ok" title={t('kpi.livestock.normalTitle')}>
        <BigNumber value={fmt.number(livestock.normalHead)} suffix={t('kpi.livestock.head')} color="text-ok" />
        <p className="mt-1.5 text-[13px] text-ink-3">
          {livestock.normalPct === null ? t('common.noData') : t('kpi.livestock.normalSub', { pct: fmt.percent(livestock.normalPct, 1) })}
        </p>
        <div className="mt-auto space-y-2.5 pt-4">
          <Bar value={livestock.normalPct ?? 0} color="bg-ok-mark" label={t('kpi.livestock.normal')} />
          <p className={`text-xs ${livestock.withAlerts ? 'font-semibold text-warn' : 'text-ink-3'}`}>
            {t('kpi.livestock.alertsSub', { count: livestock.withAlerts })} · {t('livestock.monitoredOf', { monitored: fmt.number(livestock.monitoredHead), head: fmt.number(livestock.totalHead) })}
          </p>
        </div>
      </KpiCard>

      <KpiCard icon={<WifiOff />} iconTone={devices.offline ? 'crit' : 'neutral'} title={t('kpi.devices.offlineTitle')}>
        <BigNumber value={String(devices.offline)} color={devices.offline ? 'text-crit-mark' : 'text-ok'} />
        <p className="mt-1.5 text-[13px] text-ink-3">{t('kpi.devices.offlineSub', { pct: fmt.percent(offlinePct, 1), total: devices.total })}</p>
        <div className="mt-auto space-y-2.5 pt-4">
          <Bar value={offlinePct} color="bg-crit-mark" label={t('kpi.devices.offlineTitle')} />
          <p className={`text-xs ${devices.stale || devices.lowBattery ? 'font-semibold text-warn' : 'text-ink-3'}`}>
            {t('kpi.devices.stale')}: {devices.stale} · {t('devices.lowBattery')}: {devices.lowBattery}
          </p>
        </div>
      </KpiCard>

      <KpiCard icon={<Coins />} iconTone="warn" title={t('kpi.costs.title')}>
        <BigNumber value={fmt.currency(costTotal, tariff.currency)} />
        <div className="mt-2">
          <Delta pct={costs.changePct} caption={t(`range.vs.${period.range}`)} />
        </div>
        <div className="mt-auto space-y-2.5 pt-4">
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-chip" aria-hidden>
            <div className="h-full rounded-s-full bg-water" style={{ width: `${waterShare}%` }} />
            <div className="h-full flex-1 rounded-e-full bg-energy" />
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-ink-3">
            <span className="flex items-center gap-1.5"><Dot className="bg-water" />{t('kpi.costs.water')} <strong className="tabular font-semibold text-ink">{fmt.currency(costs.current.waterCost, tariff.currency)}</strong></span>
            <span className="flex items-center gap-1.5"><Dot className="bg-energy" />{t('kpi.costs.energy')} <strong className="tabular font-semibold text-ink">{fmt.currency(costs.current.energyCost, tariff.currency)}</strong></span>
          </div>
        </div>
      </KpiCard>
    </div>
  );
}

import { BatteryMedium, Bell, ChevronRight, HeartPulse, PawPrint, WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type { HerdHealth } from '../../modules/livestock/herd-health';
import { Dot } from '../common/StatusBadge';
import { Bar, BigNumber, KpiCard } from '../dashboard/KpiCards';

const pctOf = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

/** Hero card: how many animals need a look, broken down by urgency. */
function AttentionHero({ herd, onOpen }: { herd: HerdHealth; onOpen: () => void }) {
  const { t, fmt } = useI18n();
  const count = herd.toCheck.length;
  const by = (s: 'alert' | 'monitor' | 'offline') => herd.toCheck.filter((r) => r.status === s).length;
  const rows = [
    { dot: 'bg-crit-mark', label: t('herd.attention.critical'), value: by('alert') },
    { dot: 'bg-warn-mark', label: t('herd.attention.warning'), value: by('monitor') },
    { dot: 'bg-white/45', label: t('herd.attention.offline'), value: by('offline') },
    { dot: 'bg-caution-mark', label: t('herd.attention.lowBattery'), value: herd.tags.lowBattery },
  ];

  return (
    <section className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 p-5 text-white shadow-[0_12px_32px_-12px_rgb(29_52_135/0.6)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgb(29_52_135/0.7)] motion-reduce:transform-none sm:col-span-2 lg:col-span-4 xl:col-span-1">
      <PawPrint aria-hidden className="pointer-events-none absolute -end-5 -top-3 -z-10 size-40 text-white/[0.06]" strokeWidth={1.2} />
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[13px] font-bold uppercase leading-snug tracking-[0.06em] text-white/90">
          <Bell aria-hidden className="size-[18px] shrink-0 text-sky-300" />
          <span>{t('herd.attention.title')}</span>
        </h2>
        <button type="button" onClick={onOpen} aria-label={t('herd.attention.view')} title={t('herd.attention.view')} className="-me-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white">
          <ChevronRight aria-hidden className="size-5 rtl:rotate-180" />
        </button>
      </header>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular text-[52px] font-extrabold leading-none tracking-tight">{count}</span>
        <span className="text-sm text-white/80">{t('herd.attention.of', { total: fmt.number(herd.totalHead), pct: fmt.percent(pctOf(count, herd.totalHead), 1) })}</span>
      </p>

      <dl className="mt-auto grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-white/15 pt-4 text-[13px]">
        {rows.map((r) => (
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

export function HerdKpis({ herd, onOpenAttention }: { herd: HerdHealth; onOpenAttention: () => void }) {
  const { t, fmt } = useI18n();
  const { tags, status, totalHead } = herd;
  const healthyPct = pctOf(status.healthy, totalHead);
  const offlinePct = pctOf(tags.offline, tags.total);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
      <AttentionHero herd={herd} onOpen={onOpenAttention} />

      <KpiCard icon={<PawPrint />} title={t('herd.kpi.total')}>
        <BigNumber value={fmt.number(totalHead)} />
        <dl className="mt-auto space-y-2 border-t border-line pt-3.5 text-[13px]">
          {[
            { dot: 'bg-ok-mark', label: t('herd.kpi.activeTags'), value: tags.online },
            { dot: tags.offline ? 'bg-crit-mark' : 'bg-line-strong', label: t('herd.kpi.offlineTags'), value: tags.offline },
            { dot: 'bg-line-strong', label: t('herd.kpi.untagged'), value: status.untagged },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <dt className="flex min-w-0 items-center gap-2 text-ink-2">
                <Dot className={r.dot} />
                <span className="truncate">{r.label}</span>
              </dt>
              <dd className="tabular shrink-0 font-bold text-ink">{fmt.number(r.value)}</dd>
            </div>
          ))}
        </dl>
      </KpiCard>

      <KpiCard icon={<HeartPulse />} iconTone="ok" title={t('herd.kpi.healthy')}>
        <BigNumber value={fmt.number(status.healthy)} color="text-ok" />
        <p className="mt-1.5 text-[13px] text-ink-3">{t('herd.kpi.ofHerd', { pct: fmt.percent(healthyPct, 1) })}</p>
        <div className="mt-auto pt-4">
          <Bar value={healthyPct} color="bg-ok-mark" label={t('herd.kpi.healthy')} />
        </div>
      </KpiCard>

      <KpiCard icon={<WifiOff />} iconTone={tags.offline ? 'crit' : 'neutral'} title={t('herd.kpi.tagsOffline')}>
        <BigNumber value={fmt.number(tags.offline)} color={tags.offline ? 'text-crit-mark' : 'text-ok'} />
        <p className="mt-1.5 text-[13px] text-ink-3">{t('herd.kpi.ofTags', { pct: fmt.percent(offlinePct, 1), total: tags.total })}</p>
        <div className="mt-auto pt-4">
          <Bar value={offlinePct} color="bg-crit-mark" label={t('herd.kpi.tagsOffline')} />
        </div>
      </KpiCard>

      <KpiCard icon={<BatteryMedium />} iconTone="water" title={t('herd.kpi.battery')}>
        <BigNumber value={tags.avgBatteryPct === null ? '—' : fmt.percent(tags.avgBatteryPct)} />
        <p className={`mt-1.5 text-[13px] ${tags.lowBattery ? 'font-medium text-warn' : 'text-ink-3'}`}>{t('herd.kpi.batterySub', { count: tags.total, low: tags.lowBattery })}</p>
        <div className="mt-auto pt-4">
          <Bar value={tags.avgBatteryPct ?? 0} color="bg-water" label={t('herd.kpi.battery')} />
        </div>
      </KpiCard>
    </div>
  );
}

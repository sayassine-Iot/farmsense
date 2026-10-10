import { AlertTriangle, Battery, BatteryLow, BatteryMedium, PawPrint, Users } from 'lucide-react';
import { useState } from 'react';
import { SPECIES_CONFIG } from '../../config/app';
import { useI18n, type I18nValue } from '../../i18n/context';
import type { OverviewModel } from '../../app/overview-model';
import { animalsToCheck, type AnimalCheckRow, type SpeciesSummary } from '../../modules/livestock/calculations';
import type { Species } from '../../types/domain';
import { Card } from '../common/Card';
import { EmptyState, SelectField } from '../common/controls';
import { StatusBadge } from '../common/StatusBadge';
import type { Tone } from '../common/tone';
import { alertText } from './alert-text';

const STATUS_TONE: Record<AnimalCheckRow['status'], Tone> = { alert: 'crit', monitor: 'warn', offline: 'neutral' };
const ACTIVITY_TONE = { low: 'warn', high: 'warn', normal: 'ok' } as const;

function BatteryCell({ pct }: { pct: number | null }) {
  const { fmt, t } = useI18n();
  if (pct === null) return <span className="text-ink-3">{t('common.unavailable')}</span>;
  const Icon = pct <= 20 ? BatteryLow : pct <= 60 ? BatteryMedium : Battery;
  const color = pct <= 20 ? 'text-crit-mark' : pct <= 60 ? 'text-warn-mark' : 'text-ok-mark';
  return (
    <span className="tabular inline-flex items-center gap-1.5 text-ink-2">
      <Icon aria-hidden className={`size-4 ${color}`} />
      {fmt.percent(pct)}
    </span>
  );
}

export function AnimalsToCheck({ model }: { model: OverviewModel }) {
  const { t, fmt } = useI18n();
  const [species, setSpecies] = useState<Species | 'all'>('all');
  const present = model.livestock.species.map((s) => s.species);
  const selected = species !== 'all' && !present.includes(species) ? 'all' : species;
  const rows = animalsToCheck(model.idx, model.animals).filter((r) => selected === 'all' || r.state.animal.species === selected);

  return (
    <Card
      title={t('livestock.checkTitle')}
      subtitle={t('livestock.checkSubtitle')}
      icon={<AlertTriangle />}
      actions={
        <SelectField
          label={t('livestock.col.species')}
          value={selected}
          onChange={setSpecies}
          options={[{ value: 'all', label: t('livestock.allSpecies') }, ...model.livestock.species.map((s) => ({ value: s.species, label: `${t(`species.${s.species}`)} (${fmt.number(s.head)})` }))]}
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState>{t('livestock.noneToCheck')}</EmptyState>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="text-xs text-ink-3 [&>th]:bg-subtle [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-semibold [&>th:first-child]:rounded-s-lg [&>th:last-child]:rounded-e-lg">
                <th scope="col">{t('livestock.col.animal')}</th>
                <th scope="col">{t('livestock.col.status')}</th>
                <th scope="col">{t('livestock.col.temp')}</th>
                <th scope="col">{t('livestock.col.activity')}</th>
                <th scope="col">{t('livestock.col.battery')}</th>
                <th scope="col">{t('livestock.col.updated')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const a = r.state.animal;
                const reason = r.state.alerts[0] ? alertText(r.state.alerts[0], { t, fmt }).title : t('livestock.status.offline');
                const hasTemp = SPECIES_CONFIG[a.species].metrics.includes('body_temperature');
                return (
                  <tr key={a.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-navy-800">
                          <PawPrint aria-hidden className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">
                            {a.tagNumber}
                            {a.name && <span className="font-medium text-ink-2"> · {a.name}</span>}
                          </p>
                          <p className="truncate text-xs text-ink-3">
                            {t(`species.${a.species}`)} · {reason}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={STATUS_TONE[r.status]} size="xs">{t(`livestock.status.${r.status}`)}</StatusBadge>
                    </td>
                    <td className="tabular px-3 py-3 text-ink-2">
                      {!hasTemp ? <span className="text-ink-3">—</span> : r.bodyTemperatureC === null ? <span className="text-ink-3">{t('common.unavailable')}</span> : fmt.temperature(r.bodyTemperatureC)}
                    </td>
                    <td className="px-3 py-3">
                      {r.activityLevel === null || r.activityPct === null ? (
                        <span className="text-ink-3">{t('common.unavailable')}</span>
                      ) : (
                        <StatusBadge tone={ACTIVITY_TONE[r.activityLevel]} size="xs">
                          {t(`livestock.activity.${r.activityLevel}`)} · {fmt.percent(r.activityPct)}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-3 py-3"><BatteryCell pct={r.batteryPct} /></td>
                    <td className={`whitespace-nowrap px-3 py-3 ${r.status === 'offline' ? 'font-semibold text-warn' : 'text-ink-3'}`}>
                      {r.lastUpdate ? fmt.dateTime(new Date(r.lastUpdate).getTime()) : t('common.never')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function speciesIndicator(s: SpeciesSummary, { t, fmt }: Pick<I18nValue, 't' | 'fmt'>): string {
  const m = s.metrics;
  if (m.housingTemperatureC !== null && m.housingHumidityPct !== null)
    return t('livestock.metric.housing', { temp: fmt.temperature(m.housingTemperatureC), humidity: fmt.percent(m.housingHumidityPct) });
  const parts: string[] = [];
  if (m.activityPctOfBaseline !== null) parts.push(t('livestock.metric.activity', { value: fmt.percent(m.activityPctOfBaseline) }));
  if (m.ruminationMinPerDay !== null) parts.push(t('livestock.metric.rumination', { value: fmt.number(m.ruminationMinPerDay) }));
  if (m.bodyTemperatureC !== null) parts.push(t('livestock.metric.bodyTemp', { value: fmt.temperature(m.bodyTemperatureC) }));
  return parts.length ? parts.join(' · ') : t('livestock.metric.none');
}

export function HerdBySpecies({ model }: { model: OverviewModel }) {
  const i18n = useI18n();
  const { t, fmt } = i18n;
  const { species, totalHead } = model.livestock;
  const max = Math.max(...species.map((s) => s.head), 1);
  return (
    <Card title={t('livestock.bySpecies')} subtitle={t('livestock.subtitle')} icon={<Users />}>
      <ul className="space-y-4">
        {species.map((s) => {
          const indicator = speciesIndicator(s, i18n);
          return (
            <li key={s.species} className="text-sm">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  {t(`species.${s.species}`)}
                  {s.attention > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-warn">
                      <AlertTriangle aria-hidden className="size-3" />
                      {s.attention}
                    </span>
                  )}
                </span>
                <span className="tabular text-xs text-ink-3">
                  {t('livestock.monitoredOf', { monitored: fmt.number(s.monitoredHead), head: fmt.number(s.head) })}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-chip" aria-hidden>
                <span className="absolute inset-y-0 start-0 rounded-full bg-navy-200" style={{ width: `${(s.head / max) * 100}%` }} />
                <span className="absolute inset-y-0 start-0 rounded-full bg-navy-600" style={{ width: `${(s.monitoredHead / max) * 100}%` }} />
              </div>
              <p className="mt-1 truncate text-xs text-ink-3" title={indicator}>
                {indicator}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-3">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-navy-600" />{t('livestock.col.monitored')}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-navy-200" />{t('livestock.col.head')}</span>
        <span className="ms-auto">{t('kpi.livestock.title')}: <strong className="text-ink">{fmt.number(totalHead)}</strong></span>
      </div>
    </Card>
  );
}

import { AlertTriangle, ChevronDown, PawPrint } from 'lucide-react';
import { Fragment, useState } from 'react';
import { SPECIES_CONFIG } from '../../config/app';
import { useI18n } from '../../i18n/context';
import type { AnimalCheckRow } from '../../modules/livestock/calculations';
import type { SensorKind } from '../../types/domain';
import { Card } from '../common/Card';
import { EmptyState } from '../common/controls';
import { StatusBadge } from '../common/StatusBadge';
import { SEVERITY_TONE, type Tone } from '../common/tone';
import { alertText } from '../dashboard/alert-text';
import { BatteryCell } from '../dashboard/LivestockOverview';

const STATUS_TONE: Record<AnimalCheckRow['status'], Tone> = { alert: 'crit', monitor: 'warn', offline: 'neutral' };
const ACTIVITY_TONE = { low: 'warn', high: 'warn', normal: 'ok' } as const;

/**
 * Animals with alerts or a silent tag. Each row expands to the open alerts
 * behind its status, so the table stays scannable.
 */
export function HerdCheckTable({ rows, now }: { rows: AnimalCheckRow[]; now: number }) {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState<string | null>(null);

  /** "—" when the species' tag cannot measure it; "Unavailable" when it can but has no fresh value. */
  const vital = (r: AnimalCheckRow, kind: SensorKind, value: number | null, format: (v: number) => string) =>
    !SPECIES_CONFIG[r.state.animal.species].metrics.includes(kind) ? (
      <span className="text-ink-3">—</span>
    ) : value === null ? (
      <span className="text-ink-3">{t('common.unavailable')}</span>
    ) : (
      format(value)
    );

  return (
    <Card id="animals-to-check" title={t('livestock.checkTitle')} subtitle={t('livestock.checkSubtitle')} icon={<AlertTriangle />} className="scroll-mt-6">
      {rows.length === 0 ? (
        <EmptyState>{t('livestock.noneToCheck')}</EmptyState>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="text-xs text-ink-3 [&>th]:bg-subtle [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-semibold [&>th:first-child]:rounded-s-lg [&>th:last-child]:rounded-e-lg">
                <th scope="col">{t('livestock.col.animal')}</th>
                <th scope="col">{t('livestock.col.status')}</th>
                <th scope="col">{t('herd.col.respiration')}</th>
                <th scope="col">{t('livestock.col.temp')}</th>
                <th scope="col">{t('livestock.col.activity')}</th>
                <th scope="col">{t('livestock.col.battery')}</th>
                <th scope="col">{t('livestock.col.updated')}</th>
                <th scope="col"><span className="sr-only">{t('herd.details.alerts')}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = r.state.animal;
                const label = a.name ? `${a.tagNumber} · ${a.name}` : a.tagNumber;
                const expanded = open === a.id;
                const detailsId = `animal-details-${a.id}`;
                return (
                  <Fragment key={a.id}>
                    <tr className={`cursor-pointer border-t border-line transition-colors hover:bg-subtle/70 ${expanded ? 'bg-subtle/70' : ''}`} onClick={() => setOpen(expanded ? null : a.id)}>
                      <td className="px-2.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-navy-800">
                            <PawPrint aria-hidden className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-ink">{label}</p>
                            <p className="truncate text-xs text-ink-3">{t(`species.${a.species}`)} · {a.group}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-3">
                        <StatusBadge tone={STATUS_TONE[r.status]} size="xs">{t(`livestock.status.${r.status}`)}</StatusBadge>
                      </td>
                      <td className="tabular whitespace-nowrap px-2.5 py-3 text-ink-2">{vital(r, 'respiration_rate', r.respirationPerMin, (v) => t('herd.unit.perMin', { value: fmt.number(v) }))}</td>
                      <td className="tabular whitespace-nowrap px-2.5 py-3 text-ink-2">{vital(r, 'body_temperature', r.bodyTemperatureC, fmt.temperature)}</td>
                      <td className="px-2.5 py-3">
                        {r.activityLevel === null || r.activityPct === null ? (
                          <span className="text-ink-3">{t('common.unavailable')}</span>
                        ) : (
                          <StatusBadge tone={ACTIVITY_TONE[r.activityLevel]} size="xs">
                            {t(`livestock.activity.${r.activityLevel}`)} · {fmt.percent(r.activityPct)}
                          </StatusBadge>
                        )}
                      </td>
                      <td className="px-2.5 py-3"><BatteryCell pct={r.batteryPct} /></td>
                      <td className={`whitespace-nowrap px-2.5 py-3 ${r.status === 'offline' ? 'font-semibold text-warn' : 'text-ink-3'}`} title={r.lastUpdate ? fmt.dateTime(new Date(r.lastUpdate).getTime()) : undefined}>
                        {r.lastUpdate ? fmt.relative(r.lastUpdate, now) : t('common.never')}
                      </td>
                      <td className="px-2 py-3 text-end">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={detailsId}
                          aria-label={t('herd.details', { animal: label })}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(expanded ? null : a.id);
                          }}
                          className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-chip hover:text-ink"
                        >
                          <ChevronDown aria-hidden className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={detailsId} className="bg-subtle/70">
                        <td colSpan={8} className="px-3 pb-4 pt-1">
                          <div className="rounded-xl bg-surface p-3.5 ring-1 ring-line">
                            {r.state.alerts.length === 0 ? (
                              <p className="text-ink-2">{t('herd.details.offline', { time: r.lastUpdate ? fmt.relative(r.lastUpdate, now) : t('common.never') })}</p>
                            ) : (
                              <ul className="space-y-2.5">
                                {r.state.alerts.map((al) => {
                                  const text = alertText(al, { t, fmt });
                                  return (
                                    <li key={al.id} className="flex gap-2.5">
                                      <StatusBadge tone={SEVERITY_TONE[al.severity]} size="xs">{t(`alerts.severity.${al.severity}`)}</StatusBadge>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-ink">{text.title} <span className="font-normal text-ink-3">· {fmt.relative(al.createdAt, now)}</span></p>
                                        <p className="text-ink-2">{text.body}</p>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            {(r.ruminationMinPerDay !== null || r.heartRateBpm !== null) && (
                              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-2.5 text-xs text-ink-3">
                                {r.heartRateBpm !== null && (
                                  <span>{t('herd.col.heartRate')}: <strong className="tabular text-ink">{t('herd.unit.bpm', { value: fmt.number(r.heartRateBpm) })}</strong></span>
                                )}
                                {r.ruminationMinPerDay !== null && (
                                  <span>{t('herd.details.rumination')}: <strong className="tabular text-ink">{t('herd.unit.minPerDay', { value: fmt.number(r.ruminationMinPerDay) })}</strong></span>
                                )}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

import { Bell, Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import { filterAlerts, type AlertCounts, type AlertStatusFilter } from '../../modules/alerts-analytics/alerts';
import type { Alert, AlertSeverity } from '../../types/domain';
import { Card } from '../common/Card';
import { EmptyState, SelectField } from '../common/controls';
import { StatusBadge } from '../common/StatusBadge';
import { SEVERITY_TONE } from '../common/tone';
import { alertText } from './alert-text';

const ACCENT: Record<AlertSeverity, string> = {
  critical: 'before:bg-crit-mark',
  warning: 'before:bg-warn-mark',
  info: 'before:bg-water',
};

export function AlertsPanel({
  alerts,
  counts,
  now,
  onUpdate,
  pendingIds,
  canAcknowledge,
  canResolve,
}: {
  alerts: Alert[];
  counts: AlertCounts;
  now: number;
  onUpdate: (id: string, status: 'acknowledged' | 'resolved') => void;
  pendingIds: Set<string>;
  canAcknowledge: boolean;
  canResolve: boolean;
}) {
  const { t, fmt } = useI18n();
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all');
  const [status, setStatus] = useState<AlertStatusFilter>('open');
  const visible = filterAlerts(alerts, severity, status);

  return (
    <Card
      id="alerts"
      title={t('alerts.title')}
      subtitle={t('alerts.subtitle', { open: counts.activeTotal + counts.acknowledged, acknowledged: counts.acknowledged })}
      icon={<Bell className="size-[18px]" />}
      className="scroll-mt-28"
      bodyClassName="flex flex-col"
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        <SelectField
          label={t('alerts.allSeverities')}
          value={severity}
          onChange={setSeverity}
          options={[
            { value: 'all', label: t('alerts.allSeverities') },
            { value: 'critical', label: `${t('alerts.severity.critical')} (${counts.active.critical})` },
            { value: 'warning', label: `${t('alerts.severity.warning')} (${counts.active.warning})` },
            { value: 'info', label: `${t('alerts.severity.info')} (${counts.active.info})` },
          ]}
        />
        <SelectField
          label={t('alerts.status.all')}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'open', label: t('alerts.status.open') },
            { value: 'active', label: t('alerts.status.active') },
            { value: 'acknowledged', label: t('alerts.status.acknowledged') },
            { value: 'resolved', label: t('alerts.status.resolved') },
            { value: 'all', label: t('alerts.status.all') },
          ]}
        />
      </div>

      {!canAcknowledge && !canResolve && <p className="mb-3 rounded-lg bg-subtle px-3 py-2 text-xs text-ink-3">{t('alerts.readOnly')}</p>}

      {visible.length === 0 ? (
        <EmptyState icon={<CheckCheck className="size-6 text-ok" />}>{t('alerts.empty')}</EmptyState>
      ) : (
        <ul className="scrollbar-thin -me-2 max-h-[34rem] space-y-2 overflow-y-auto pe-2">
          {visible.map((a) => {
            const text = alertText(a, { t, fmt });
            const pending = pendingIds.has(a.id);
            const muted = a.status !== 'active';
            return (
              <li
                key={a.id}
                className={`relative overflow-hidden rounded-lg border border-line p-3 ps-4 text-xs before:absolute before:inset-y-0 before:start-0 before:w-1 ${ACCENT[a.severity]} ${muted ? 'bg-subtle/70' : 'bg-surface'}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge tone={SEVERITY_TONE[a.severity]} size="xs">{t(`alerts.severity.${a.severity}`)}</StatusBadge>
                  {a.status !== 'active' && (
                    <StatusBadge tone={a.status === 'resolved' ? 'ok' : 'neutral'} size="xs" icon={a.status === 'resolved' ? CheckCheck : Check}>
                      {t(`alerts.status.${a.status}`)}
                    </StatusBadge>
                  )}
                  <span className="ms-auto whitespace-nowrap text-[11px] text-ink-3" title={fmt.dateTime(new Date(a.createdAt).getTime())}>
                    {fmt.relative(a.createdAt, now)}
                  </span>
                </div>
                <p className={`mt-1.5 text-[13px] font-semibold ${muted ? 'text-ink-2' : 'text-ink'}`}>{text.title}</p>
                <p className="text-[11px] font-medium text-ink-3">
                  {text.targetLabel}: {text.subject}
                </p>
                <p className="mt-1 leading-relaxed text-ink-2">{text.body}</p>

                {a.status !== 'resolved' && (canAcknowledge || canResolve) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {a.status === 'active' && canAcknowledge && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onUpdate(a.id, 'acknowledged')}
                        className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2 py-1 font-medium text-ink-2 hover:bg-subtle disabled:opacity-50"
                      >
                        <Check aria-hidden className="size-3.5" /> {t('alerts.acknowledge')}
                      </button>
                    )}
                    {canResolve && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onUpdate(a.id, 'resolved')}
                        className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2 py-1 font-medium text-white hover:bg-navy-700 disabled:opacity-50"
                      >
                        <CheckCheck aria-hidden className="size-3.5" /> {t('alerts.resolve')}
                      </button>
                    )}
                    {a.acknowledgedAt && <span className="text-[11px] text-ink-3">{t('alerts.ackAt', { time: fmt.dateTime(new Date(a.acknowledgedAt).getTime()) })}</span>}
                  </div>
                )}
                {a.status === 'resolved' && a.resolvedAt && <p className="mt-1.5 text-[11px] text-ink-3">{t('alerts.resolvedAt', { time: fmt.dateTime(new Date(a.resolvedAt).getTime()) })}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

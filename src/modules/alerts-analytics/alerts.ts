import type { Alert, AlertSeverity, AlertStatus } from '../../types/domain';

const SEVERITY_RANK: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 };
const STATUS_RANK: Record<AlertStatus, number> = { active: 2, acknowledged: 1, resolved: 0 };

export const severityRank = (s: AlertSeverity) => SEVERITY_RANK[s];
export const isUnresolved = (a: Alert) => a.status !== 'resolved';

/** Unresolved first, then by severity, then newest first. */
export function prioritizeAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      Number(isUnresolved(b)) - Number(isUnresolved(a)) ||
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export interface AlertCounts {
  /** Status `active` (not yet acknowledged), by severity. */
  active: Record<AlertSeverity, number>;
  activeTotal: number;
  acknowledged: number;
  resolved: number;
  total: number;
}

export function countAlerts(alerts: Alert[]): AlertCounts {
  const active: Record<AlertSeverity, number> = { critical: 0, warning: 0, info: 0 };
  let acknowledged = 0;
  let resolved = 0;
  for (const a of alerts) {
    if (a.status === 'active') active[a.severity]++;
    else if (a.status === 'acknowledged') acknowledged++;
    else resolved++;
  }
  return { active, activeTotal: active.critical + active.warning + active.info, acknowledged, resolved, total: alerts.length };
}

export type AlertStatusFilter = 'open' | AlertStatus | 'all';

export function filterAlerts(alerts: Alert[], severity: AlertSeverity | 'all', status: AlertStatusFilter): Alert[] {
  return alerts.filter(
    (a) =>
      (severity === 'all' || a.severity === severity) &&
      (status === 'all' || (status === 'open' ? isUnresolved(a) : a.status === status)),
  );
}

/** Returns a copy of the alert with a new status, stamping the transition time. */
export function transitionAlert(alert: Alert, status: 'acknowledged' | 'resolved', at: string): Alert {
  return {
    ...alert,
    status,
    acknowledgedAt: alert.acknowledgedAt ?? at,
    resolvedAt: status === 'resolved' ? at : null,
  };
}

/**
 * Demo backend — stands in for layers 2–6 during Phase 1.
 *
 *  Layer 2   session + permission checks and request validation (below)
 *  Layer 3D  alert rules engine and alert status workflow (alert-rules.ts)
 *  Layer 5   seeded operational records and telemetry (seed/)
 *  Layer 6   simulated edge devices behind the seed data
 *
 * SIMULATED DATA ONLY. Snapshots are generated once per session relative to
 * "now"; there is no simulated live streaming.
 */
import { indexSnapshot } from '../../modules/devices/telemetry';
import { transitionAlert } from '../../modules/alerts-analytics/alerts';
import type { Alert, FarmSnapshot, Permission, Role, Session } from '../../types/domain';
import { ROLE_PERMISSIONS } from '../access';
import { ApiError, type FarmSenseApi } from '../types';
import { evaluateAlertRules } from './alert-rules';
import { buildDemoSnapshot, FARMS, INITIAL_ALERT_STATUS } from './seed/farms';

type StoredStatus = Record<string, { status: 'acknowledged' | 'resolved'; acknowledgedAt: string; resolvedAt: string | null }>;

const STORAGE_KEY = 'farmsense.demo.alertStatus.v1';

function readStore(): Record<string, StoredStatus> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, StoredStatus>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredStatus>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode) — acknowledgements last for this session only.
  }
}

/** Demo role, overridable with `?role=viewer|worker|manager|owner` to preview permissions. */
function demoRole(): Role {
  try {
    const r = new URLSearchParams(window.location.search).get('role');
    if (r === 'owner' || r === 'manager' || r === 'worker' || r === 'viewer') return r;
  } catch {
    // Not in a browser (tests).
  }
  return 'manager';
}

export function createMockBackend(options: { now?: Date; role?: Role } = {}): FarmSenseApi {
  const now = new Date(options.now ?? Date.now());
  now.setSeconds(0, 0);
  const role = options.role ?? demoRole();
  const session: Session = {
    user: { id: 'demo-user', displayName: 'Demo user', role },
    farmIds: FARMS.map((f) => f.id),
    permissions: ROLE_PERMISSIONS[role],
  };
  const snapshots = new Map<string, FarmSnapshot>();
  let store = readStore();

  // ---- Layer 2: access control & validation ----
  const require = (permission: Permission) => {
    if (!session.permissions.includes(permission)) throw new ApiError('forbidden', `Missing permission ${permission}`);
  };
  const farmData = (farmId: string): FarmSnapshot => {
    require('farm:read');
    if (!session.farmIds.includes(farmId)) throw new ApiError('forbidden', `No access to farm ${farmId}`);
    let snap = snapshots.get(farmId);
    if (!snap) {
      const built = buildDemoSnapshot(farmId, now);
      if (!built) throw new ApiError('not_found', `Unknown farm ${farmId}`);
      snap = built;
      snapshots.set(farmId, snap);
    }
    return snap;
  };

  // ---- Layer 3D: alerts (rules engine + stored workflow state) ----
  const alertsFor = (farmId: string): Alert[] => {
    const stored = store[farmId] ?? {};
    return evaluateAlertRules(indexSnapshot(farmData(farmId))).map((alert) => {
      const s = stored[alert.id];
      if (s) return { ...alert, ...s };
      const initial = INITIAL_ALERT_STATUS[alert.id];
      return initial ? transitionAlert(alert, initial, alert.createdAt) : alert;
    });
  };

  return {
    mode: 'demo',
    access: {
      getSession: async () => session,
    },
    farms: {
      listFarms: async () => {
        require('farm:read');
        return FARMS.filter((f) => session.farmIds.includes(f.id));
      },
    },
    waterCrop: {
      getSetup: async (farmId) => {
        const s = farmData(farmId);
        return { crops: s.crops, fields: s.fields, zones: s.zones, tanks: s.tanks };
      },
      listIrrigationEvents: async (farmId, from, to) => {
        const s = farmData(farmId);
        if (!(from < to)) throw new ApiError('invalid_request', '`from` must be before `to`');
        const events = s.irrigationEvents.filter((e) => (e.endedAt ?? s.asOf) > from && e.startedAt < to);
        return { events, coveredFrom: from > s.irrigationCoveredFrom ? from : s.irrigationCoveredFrom };
      },
    },
    livestock: {
      listAnimals: async (farmId) => farmData(farmId).animals,
      getHerdActivity: async (farmId, from, to) => {
        if (!(from < to)) throw new ApiError('invalid_request', '`from` must be before `to`');
        return farmData(farmId).herdActivity.filter((h) => h.hourStart >= from && h.hourStart < to);
      },
    },
    devices: {
      getRegistry: async (farmId) => {
        const s = farmData(farmId);
        return { devices: s.devices, sensors: s.sensors };
      },
      getLatestReadings: async (farmId) => {
        const s = farmData(farmId);
        return { asOf: s.asOf, readings: s.latestReadings };
      },
    },
    alerts: {
      listAlerts: async (farmId) => alertsFor(farmId),
      updateAlertStatus: async (farmId, alertId, status) => {
        require(status === 'acknowledged' ? 'alerts:acknowledge' : 'alerts:resolve');
        const alert = alertsFor(farmId).find((a) => a.id === alertId);
        if (!alert) throw new ApiError('not_found', `Unknown alert ${alertId}`);
        if (alert.status === 'resolved') throw new ApiError('invalid_request', 'Alert is already resolved');
        if (status === 'acknowledged' && alert.status !== 'active') throw new ApiError('invalid_request', 'Only new alerts can be acknowledged');
        const next = transitionAlert(alert, status, new Date().toISOString());
        store = {
          ...store,
          [farmId]: { ...store[farmId], [alertId]: { status, acknowledgedAt: next.acknowledgedAt as string, resolvedAt: next.resolvedAt } },
        };
        writeStore(store);
        return next;
      },
    },
    resetDemoState: () => {
      store = {};
      writeStore(store);
    },
  };
}

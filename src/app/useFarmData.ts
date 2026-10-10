import { useCallback, useEffect, useState } from 'react';
import { loadFarmSnapshot, type FarmSenseApi } from '../api';
import type { Alert, Farm, FarmSnapshot, Session } from '../types/domain';

/** Session (layer 2) and the farms this user may access. */
export function useSession(api: FarmSenseApi) {
  const [session, setSession] = useState<Session | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([api.access.getSession(), api.farms.listFarms()]).then(([s, f]) => {
      if (!alive) return;
      setSession(s);
      setFarms(f);
    });
    return () => {
      alive = false;
    };
  }, [api]);
  return { session, farms };
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; snapshot: FarmSnapshot; alerts: Alert[] };

/** Loads the overview snapshot (3A–3C) and alerts (3D) for a farm; exposes alert status updates. */
export function useFarmData(api: FarmSenseApi, farm: Farm | null) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!farm) return;
    let alive = true;
    Promise.all([loadFarmSnapshot(api, farm), api.alerts.listAlerts(farm.id)])
      .then(([snapshot, alerts]) => alive && setState({ status: 'ready', snapshot, alerts }))
      .catch((e: unknown) => alive && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [api, farm, reloadKey]);

  const updateAlert = useCallback(
    async (alertId: string, status: 'acknowledged' | 'resolved') => {
      if (!farm) return false;
      setPending((p) => new Set(p).add(alertId));
      try {
        const updated = await api.alerts.updateAlertStatus(farm.id, alertId, status);
        setState((s) => (s.status === 'ready' ? { ...s, alerts: s.alerts.map((a) => (a.id === alertId ? updated : a)) } : s));
        return true;
      } catch {
        return false;
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(alertId);
          return next;
        });
      }
    },
    [api, farm],
  );

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setReloadKey((k) => k + 1);
  }, []);

  return { state, pending, updateAlert, reload };
}

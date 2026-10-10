import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DATE_RANGES, DEFAULT_TARIFF, type DateRangeKey } from '../config/app';
import { NAV_ITEMS, isNavId, type NavId } from '../config/navigation';
import { useI18n } from '../i18n/context';
import { buildHerdCsv, buildSummaryCsv } from './report-export';
import { buildOverview } from './overview-model';
import { api, can } from '../api';
import { herdHealth } from '../modules/livestock/herd-health';
import type { ResourceTariff, Species } from '../types/domain';
import { downloadCsv, fileStamp, toCsv } from '../utils/csv';
import { readStored, writeStored } from '../utils/storage';
import { useToast } from '../components/common/toast-context';
import { DemoBanner } from '../components/layout/DemoBanner';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { HerdHealthPage } from './pages/HerdHealthPage';
import { OverviewPage } from './pages/OverviewPage';
import { useFarmData, useSession } from './useFarmData';

function routeFromHash(): NavId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return isNavId(id) ? id : 'overview';
}

/** Persisted UI preference. */
function usePreference<T>(key: string, fallback: T, valid: (v: unknown) => boolean = () => true) {
  const [value, setValue] = useState<T>(() => {
    const v = readStored<unknown>(key, fallback);
    return valid(v) ? (v as T) : fallback;
  });
  const update = useCallback(
    (v: T) => {
      writeStored(key, v);
      setValue(v);
    },
    [key],
  );
  return [value, update] as const;
}

const isTariff = (v: unknown): boolean => {
  const t = v as ResourceTariff;
  return typeof t === 'object' && t !== null && typeof t.currency === 'string' && t.waterPricePerM3 >= 0 && t.electricityPricePerKWh >= 0;
};

export function App() {
  const { t } = useI18n();
  const notify = useToast();

  const [route, setRoute] = useState<NavId>(routeFromHash);
  const [collapsed, setCollapsed] = usePreference('sidebarCollapsed', false);
  const [mobileNav, setMobileNav] = useState(false);
  const [range, setRange] = usePreference<DateRangeKey>('range', 'today', (v) => DATE_RANGES.includes(v as DateRangeKey));
  const [tariff, setTariff] = usePreference<ResourceTariff>('tariff', DEFAULT_TARIFF, isTariff);
  const [storedFarmId, setFarmId] = usePreference<string | null>('farmId', null);
  const [herdSpecies, setHerdSpecies] = usePreference<Species | 'all'>('herdSpecies', 'all', (v) => typeof v === 'string');

  const { session, farms } = useSession(api);
  const farm = farms.find((f) => f.id === storedFarmId) ?? farms[0] ?? null;
  const { state, pending, updateAlert, reload } = useFarmData(api, farm);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((id: NavId) => {
    window.location.hash = `/${id}`;
    setRoute(id);
    window.scrollTo({ top: 0 });
  }, []);

  const model = useMemo(
    () => (state.status === 'ready' ? buildOverview(state.snapshot, state.alerts, range, tariff) : null),
    [state, range, tariff],
  );

  const herd = useMemo(() => {
    if (!model || state.status !== 'ready') return null;
    const h = herdHealth(model.idx, state.alerts, herdSpecies);
    // A species missing on the selected farm falls back to the whole herd.
    return herdSpecies === 'all' || h.speciesAvailable.includes(herdSpecies) ? h : herdHealth(model.idx, state.alerts, 'all');
  }, [model, state, herdSpecies]);
  const herdScope = herd && herdSpecies !== 'all' && herd.speciesAvailable.includes(herdSpecies) ? herdSpecies : 'all';

  const notifications = useMemo(() => model?.alerts.filter((a) => a.status === 'active' && a.severity !== 'info') ?? [], [model]);

  const exportSummary = useCallback(() => {
    if (!model) return;
    downloadCsv(`farmsense-summary-${model.idx.snapshot.farm.id}-${model.period.range}-${fileStamp(model.now)}.csv`, toCsv(buildSummaryCsv(model, { t })));
    notify(t('export.done'), 'success');
  }, [model, notify, t]);

  const exportHerd = useCallback(() => {
    if (!model || !herd) return;
    downloadCsv(`farmsense-herd-${model.idx.snapshot.farm.id}-${herdScope}-${fileStamp(model.now)}.csv`, toCsv(buildHerdCsv(model, herd, herdScope, { t })));
    notify(t('export.done'), 'success');
  }, [model, herd, herdScope, notify, t]);

  const goToAlerts = useCallback(() => {
    if (route !== 'overview') navigate('overview');
    requestAnimationFrame(() => document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [route, navigate]);

  const onAlertUpdate = useCallback(
    async (id: string, status: 'acknowledged' | 'resolved') => {
      const ok = await updateAlert(id, status);
      if (!ok) notify(t('alerts.updateFailed'));
    },
    [updateAlert, notify, t],
  );

  const navItem = NAV_ITEMS.find((n) => n.id === route) ?? NAV_ITEMS[0];

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        active={route}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col">
        <Header
          title={route === 'livestock' ? t('herd.title') : t(navItem.labelKey)}
          subtitle={route === 'livestock' && farm ? t('herd.subtitle', { farm: farm.name }) : undefined}
          connectivity={
            route === 'livestock'
              ? herd && { kind: 'tags', online: herd.tags.online, total: herd.tags.total }
              : model && { kind: 'devices', online: model.devices.online, total: model.devices.total }
          }
          farms={farms}
          farm={farm}
          onFarmChange={setFarmId}
          range={range}
          onRangeChange={setRange}
          lastUpdate={model?.lastUpdate ?? null}
          now={model?.now ?? 0}
          notifications={notifications}
          onExport={!model || !can(session, 'reports:export') ? null : route === 'overview' ? exportSummary : route === 'livestock' ? exportHerd : null}
          session={session}
          onGoToAlerts={goToAlerts}
          onOpenMenu={() => setMobileNav(true)}
          onResetDemo={() => {
            api.resetDemoState?.();
            reload();
            notify(t('user.resetDone'), 'success');
          }}
          showRange={route === 'overview'}
          showLive={!!model && (route === 'overview' || route === 'livestock')}
        />
        <main className="w-full flex-1 px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-6">
          {route !== 'overview' && route !== 'livestock' ? (
            <ComingSoonPage item={navItem} onBack={() => navigate('overview')} />
          ) : state.status === 'loading' || !model ? (
            state.status === 'error' ? (
              <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center shadow-card">
                <p className="text-sm text-ink-2">{t('overview.error')}</p>
                <p className="mt-1 text-xs text-ink-3">{state.error}</p>
                <button type="button" onClick={reload} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-sm font-medium text-white">
                  <RefreshCw className="size-4" /> {t('overview.retry')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-3">
                <Loader2 className="size-4 animate-spin" /> {t('overview.loading')}
              </div>
            )
          ) : route === 'livestock' ? (
            herd && <HerdHealthPage herd={herd} now={model.now} species={herdScope} onSpeciesChange={setHerdSpecies} />
          ) : (
            <OverviewPage model={model} session={session} onRangeChange={setRange} onTariffChange={setTariff} onAlertUpdate={onAlertUpdate} pendingAlertIds={pending} />
          )}
        </main>
        </div>
      </div>
    </div>
  );
}

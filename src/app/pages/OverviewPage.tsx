import { Droplets, PawPrint, Radio, Sprout } from 'lucide-react';
import { useState } from 'react';
import type { DateRangeKey } from '../../config/app';
import type { OverviewModel } from '../overview-model';
import { can } from '../../api';
import { useI18n } from '../../i18n/context';
import type { ResourceTariff, Session } from '../../types/domain';
import { readStored, writeStored } from '../../utils/storage';
import { CostSummaryCard } from '../../components/charts/CostSummaryCard';
import { WaterConsumptionChart } from '../../components/charts/WaterConsumptionChart';
import { Tabs, type TabItem } from '../../components/common/Tabs';
import { AlertsPanel } from '../../components/dashboard/AlertsPanel';
import { FieldConditions } from '../../components/dashboard/FieldConditions';
import { KpiRow } from '../../components/dashboard/KpiCards';
import { AnimalsToCheck, HerdBySpecies } from '../../components/dashboard/LivestockOverview';
import { DeviceCoverage, FieldStatusDonut, IrrigationStatusStrip, WaterByZone } from '../../components/dashboard/SummaryCards';
import { IrrigationZonesTable } from '../../components/tables/IrrigationZonesTable';

interface OverviewPageProps {
  model: OverviewModel;
  session: Session | null;
  onRangeChange: (r: DateRangeKey) => void;
  onTariffChange: (t: ResourceTariff) => void;
  onAlertUpdate: (id: string, status: 'acknowledged' | 'resolved') => void;
  pendingAlertIds: Set<string>;
}

const SECTIONS = ['water', 'fields', 'livestock', 'devices'] as const;
type Section = (typeof SECTIONS)[number];
const isSection = (v: unknown): v is Section => SECTIONS.includes(v as Section);

const STACK = 'flex min-w-0 flex-col gap-4 lg:gap-5';

/**
 * Farm Overview, organised for progressive disclosure: four headline KPIs,
 * then one domain at a time in tabs beside an always-visible alert stream.
 */
export function OverviewPage({ model, session, onRangeChange, onTariffChange, onAlertUpdate, pendingAlertIds }: OverviewPageProps) {
  const { t } = useI18n();
  const [section, setSectionState] = useState<Section>(() => {
    const stored = readStored<unknown>('overviewSection', 'water');
    return isSection(stored) ? stored : 'water';
  });
  const setSection = (s: Section) => {
    writeStored('overviewSection', s);
    setSectionState(s);
  };

  const attention = (count: number) => ({ badge: count, badgeLabel: t('overview.tabAttention', { count }) });
  const tabs: TabItem<Section>[] = [
    { value: 'water', label: t('nav.water'), icon: Droplets, ...attention(model.irrigation.zonesWithWarnings + model.irrigation.zonesWithoutData) },
    { value: 'fields', label: t('nav.crops'), icon: Sprout, ...attention(model.fields.filter((f) => f.status === 'attention').length) },
    { value: 'livestock', label: t('nav.livestock'), icon: PawPrint, ...attention(model.livestock.withAlerts) },
    { value: 'devices', label: t('nav.devices'), icon: Radio, ...attention(model.devices.offline) },
  ];

  return (
    <div className="space-y-4 lg:space-y-5">
      <KpiRow model={model} />

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <Tabs value={section} items={tabs} onChange={setSection} label={t('overview.sections')}>
          {section === 'water' && (
            <div className={STACK}>
              <IrrigationStatusStrip model={model} />
              <WaterConsumptionChart model={model} onRangeChange={onRangeChange} />
              <IrrigationZonesTable model={model} />
              <WaterByZone model={model} />
            </div>
          )}
          {section === 'fields' && (
            <div className={STACK}>
              <FieldStatusDonut model={model} />
              <FieldConditions fields={model.fields} now={model.now} />
            </div>
          )}
          {section === 'livestock' && (
            <div className={STACK}>
              <AnimalsToCheck model={model} />
              <HerdBySpecies model={model} />
            </div>
          )}
          {section === 'devices' && (
            <div className={STACK}>
              <DeviceCoverage model={model} />
            </div>
          )}
        </Tabs>

        <aside className={STACK} aria-label={t('overview.activity')}>
          <AlertsPanel
            alerts={model.alerts}
            counts={model.alertCounts}
            now={model.now}
            onUpdate={onAlertUpdate}
            pendingIds={pendingAlertIds}
            canAcknowledge={can(session, 'alerts:acknowledge')}
            canResolve={can(session, 'alerts:resolve')}
          />
          <CostSummaryCard model={model} onTariffChange={can(session, 'tariffs:edit') ? onTariffChange : null} />
        </aside>
      </div>
    </div>
  );
}

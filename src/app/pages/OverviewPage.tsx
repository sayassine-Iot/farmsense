import type { DateRangeKey } from '../../config/app';
import type { OverviewModel } from '../overview-model';
import { can } from '../../api';
import type { ResourceTariff, Session } from '../../types/domain';
import { CostSummaryCard } from '../../components/charts/CostSummaryCard';
import { WaterConsumptionChart } from '../../components/charts/WaterConsumptionChart';
import { AlertsPanel } from '../../components/dashboard/AlertsPanel';
import { FieldConditions } from '../../components/dashboard/FieldConditions';
import { KpiRow } from '../../components/dashboard/KpiCards';
import { AnimalsToCheck, HerdBySpecies } from '../../components/dashboard/LivestockOverview';
import { DeviceCoverage, FieldStatusDonut, WaterByZone } from '../../components/dashboard/SummaryCards';
import { IrrigationZonesTable } from '../../components/tables/IrrigationZonesTable';

interface OverviewPageProps {
  model: OverviewModel;
  session: Session | null;
  onRangeChange: (r: DateRangeKey) => void;
  onTariffChange: (t: ResourceTariff) => void;
  onAlertUpdate: (id: string, status: 'acknowledged' | 'resolved') => void;
  pendingAlertIds: Set<string>;
}

const ROW = 'grid grid-cols-1 gap-4 lg:gap-5';

export function OverviewPage({ model, session, onRangeChange, onTariffChange, onAlertUpdate, pendingAlertIds }: OverviewPageProps) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <KpiRow model={model} />

      <div className={`${ROW} md:grid-cols-2 xl:grid-cols-3`}>
        <FieldStatusDonut model={model} />
        <WaterByZone model={model} />
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <DeviceCoverage model={model} />
        </div>
      </div>

      <div className={`${ROW} xl:grid-cols-3`}>
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5 xl:col-span-2">
          <WaterConsumptionChart model={model} onRangeChange={onRangeChange} />
          <IrrigationZonesTable model={model} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
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
        </div>
      </div>

      <div className={`${ROW} xl:grid-cols-3`}>
        <div className="min-w-0 xl:col-span-2">
          <AnimalsToCheck model={model} />
        </div>
        <HerdBySpecies model={model} />
      </div>

      <FieldConditions fields={model.fields} now={model.now} />
    </div>
  );
}

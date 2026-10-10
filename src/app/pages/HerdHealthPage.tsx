import { useI18n } from '../../i18n/context';
import type { HerdHealth } from '../../modules/livestock/herd-health';
import type { Species } from '../../types/domain';
import { SegmentedControl } from '../../components/common/controls';
import { HerdActivityChart } from '../../components/livestock/HerdActivityChart';
import { HerdCheckTable } from '../../components/livestock/HerdCheckTable';
import { HerdKpis } from '../../components/livestock/HerdKpis';
import { AlertsBySignal, HerdStatusDonut, SensorCoverage } from '../../components/livestock/HerdSummaryCards';

interface HerdHealthPageProps {
  herd: HerdHealth;
  now: number;
  species: Species | 'all';
  onSpeciesChange: (s: Species | 'all') => void;
}

/** Herd Health: neck-tag monitoring of individually tagged animals. */
export function HerdHealthPage({ herd, now, species, onSpeciesChange }: HerdHealthPageProps) {
  const { t } = useI18n();
  const openAttention = () => document.getElementById('animals-to-check')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-4 lg:space-y-5">
      {herd.speciesAvailable.length > 1 && (
        <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <SegmentedControl
            label={t('herd.scope')}
            size="md"
            value={species}
            onChange={onSpeciesChange}
            options={[{ value: 'all', label: t('livestock.allSpecies') }, ...herd.speciesAvailable.map((s) => ({ value: s, label: t(`species.${s}`) }))]}
          />
        </div>
      )}

      <HerdKpis herd={herd} onOpenAttention={openAttention} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        <HerdStatusDonut herd={herd} />
        <AlertsBySignal herd={herd} />
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <SensorCoverage herd={herd} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <HerdCheckTable rows={herd.toCheck} now={now} />
        <HerdActivityChart herd={herd} />
      </div>
    </div>
  );
}

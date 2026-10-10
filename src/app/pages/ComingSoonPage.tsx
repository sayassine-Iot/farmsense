import { ArrowLeft, Construction } from 'lucide-react';
import type { NavItem } from '../../config/navigation';
import { useI18n } from '../../i18n/context';

export function ComingSoonPage({ item, onBack }: { item: NavItem; onBack: () => void }) {
  const { t } = useI18n();
  const Icon = item.icon;
  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-12">
      <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-navy-50 text-navy-700">
          <Icon aria-hidden className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">{t(item.labelKey)}</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-medium text-warn">
          <Construction aria-hidden className="size-3.5" /> {t('soon.title')}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-2">{t('soon.body')}</p>
        {item.plannedKey && (
          <div className="mx-auto mt-5 max-w-md rounded-lg bg-subtle p-4 text-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{t('soon.planned')}</p>
            <p className="mt-1 text-sm text-ink-2">{t(item.plannedKey)}</p>
          </div>
        )}
        <button type="button" onClick={onBack} className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
          <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" /> {t('soon.back')}
        </button>
      </div>
    </div>
  );
}

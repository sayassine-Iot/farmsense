import { Sprout } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-sm">
        <Sprout aria-hidden className="size-5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-[17px] font-extrabold tracking-tight text-ink">{t('app.name')}</span>
          <span className="block truncate text-[11px] text-ink-3">{t('app.subtitle')}</span>
        </span>
      )}
    </div>
  );
}

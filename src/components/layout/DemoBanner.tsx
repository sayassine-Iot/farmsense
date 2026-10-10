import { FlaskConical } from 'lucide-react';
import { useI18n } from '../../i18n/context';

/** Persistent, non-dismissible indicator that the dashboard shows simulated data. */
export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div role="status" className="flex items-center gap-2 border-b border-amber-300/60 bg-amber-50 px-4 py-1.5 text-xs text-amber-900 sm:px-6">
      <FlaskConical aria-hidden className="size-3.5 shrink-0" />
      <strong className="shrink-0 font-semibold tracking-wide">{t('demo.banner')}</strong>
      <span className="hidden truncate text-amber-800 sm:inline">· {t('demo.detail')}</span>
    </div>
  );
}

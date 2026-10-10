import { useI18n } from '../../i18n/context';

const LEAF = '#6ee7a0';

/**
 * FarmSense mark: a sprout growing out of a microcontroller and
 * broadcasting a signal — embedded IoT sensing for intelligent farming.
 * Shares its geometry with public/favicon.svg.
 */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="6" y="13.2" width="12" height="8.8" rx="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M2.8 16h3.2M2.8 19.2h3.2M18 16h3.2M18 19.2h3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.6" r="1.7" fill={LEAF} />
      <path d="M12 13.2V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10.6C12 7.2 9.3 5 5 5c0 3.4 2.7 5.6 7 5.6ZM12 10.6C12 7.2 14.7 5 19 5c0 3.4-2.7 5.6-7 5.6Z" fill={LEAF} />
      <path d="M9.6 3.4a3.4 3.4 0 0 1 4.8 0M7.6 1.4a6.2 6.2 0 0 1 8.8 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-sm">
        <LogoGlyph className="size-7" />
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

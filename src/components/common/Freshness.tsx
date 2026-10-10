import { Clock, WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type { ReadingQuality } from '../../modules/devices/telemetry';

/** "Updated 5 min ago", flagged when the reading is stale or the device offline. */
export function Freshness({ timestamp, quality, now, prefix = true }: { timestamp: string | null; quality?: ReadingQuality; now: number; prefix?: boolean }) {
  const { fmt, t } = useI18n();
  if (!timestamp) return <span className="text-ink-3">{t('common.never')}</span>;
  const rel = fmt.relative(timestamp, now);
  const flagged = quality === 'stale' || quality === 'offline';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${flagged ? 'font-medium text-warn' : 'text-ink-3'}`} title={fmt.dateTime(new Date(timestamp).getTime())}>
      {quality === 'offline' ? <WifiOff aria-hidden className="size-3" /> : <Clock aria-hidden className="size-3" />}
      {prefix ? t('fields.updated', { time: rel }) : rel}
      {flagged && <span className="sr-only">({t(quality === 'offline' ? 'common.offline' : 'common.stale')})</span>}
    </span>
  );
}

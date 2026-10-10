import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from './tone';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  crit: 'bg-crit-bg text-crit',
  info: 'bg-info-bg text-info',
  neutral: 'bg-chip text-ink-2',
};

/** Soft pill. The text label always carries the meaning, so status is never color-only. */
export function StatusBadge({
  tone,
  children,
  icon: Icon,
  size = 'sm',
}: {
  tone: Tone;
  children: ReactNode;
  icon?: LucideIcon;
  size?: 'xs' | 'sm';
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-semibold ${TONE_CLASS[tone]} ${
        size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {Icon && <Icon aria-hidden className={size === 'xs' ? 'size-3' : 'size-3.5'} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

/** Small colored dot used in legends and breakdown lists. */
export function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} />;
}

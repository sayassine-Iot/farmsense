import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useI18n } from '../../i18n/context';

/**
 * Change versus the previous period. `lowerIsBetter` colors a decrease green
 * (water, cost); with `neutral` no judgement color is applied.
 */
export function Delta({ pct, caption, lowerIsBetter = true, neutral = false }: { pct: number | null; caption: string; lowerIsBetter?: boolean; neutral?: boolean }) {
  const { fmt, t } = useI18n();
  if (pct === null) return <span className="text-xs text-ink-3">{t('common.noComparison')}</span>;
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const good = flat ? null : up !== lowerIsBetter;
  const tone = neutral || good === null ? 'text-ink-2 bg-subtle' : good ? 'text-ok bg-ok-bg' : 'text-warn bg-warn-bg';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular ${tone}`}>
        <Icon aria-hidden className="size-3.5" strokeWidth={2.4} />
        {up && !flat ? '+' : ''}
        {fmt.percent(pct, Math.abs(pct) < 10 ? 1 : 0)}
      </span>
      {caption}
    </span>
  );
}

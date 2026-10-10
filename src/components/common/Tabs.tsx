import type { LucideIcon } from 'lucide-react';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Items needing attention in this section; hidden when 0. */
  badge?: number;
  /** Accessible text for the badge, e.g. "3 need attention". */
  badgeLabel?: string;
}

/**
 * WAI-ARIA tabs (automatic activation, arrow/Home/End keys). Only the
 * active panel is rendered, so charts mount at their real width.
 */
export function Tabs<T extends string>({
  value,
  items,
  onChange,
  label,
  children,
}: {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  label: string;
  children: ReactNode;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, items.findIndex((i) => i.value === value));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    let next: number | null = null;
    if (step !== undefined) next = (activeIndex + step + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="min-w-0">
      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="inline-flex min-w-full gap-1 rounded-2xl bg-surface p-1.5 shadow-card ring-1 ring-line/60 sm:min-w-0">
          {items.map((item, i) => {
            const active = i === activeIndex;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                id={`${base}-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${base}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(item.value)}
                className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-150 sm:flex-none ${
                  active ? 'bg-navy-800 text-white shadow-sm' : 'text-ink-2 hover:bg-subtle hover:text-ink'
                }`}
              >
                {Icon && <Icon aria-hidden className={`size-4 ${active ? 'text-white/85' : 'text-ink-3'}`} />}
                {item.label}
                {!!item.badge && (
                  <span
                    className={`tabular grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5 ${active ? 'bg-white/20 text-white' : 'bg-warn-bg text-warn'}`}
                  >
                    <span aria-hidden>{item.badge}</span>
                    <span className="sr-only">{item.badgeLabel ?? item.badge}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div
        key={value}
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${items[activeIndex]?.value}`}
        className="mt-4 animate-[fs-fade-in_180ms_ease-out] motion-reduce:animate-none lg:mt-5"
      >
        {children}
      </div>
    </div>
  );
}

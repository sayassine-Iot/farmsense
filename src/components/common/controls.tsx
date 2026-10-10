import { ChevronDown, Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-chip p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`whitespace-nowrap rounded-lg font-semibold transition-colors ${
              size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
            } ${active ? 'bg-surface text-navy-800 shadow-sm' : 'text-ink-2 hover:text-ink'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  label,
  icon,
  className = '',
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Accessible label; not displayed. */
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <label className={`relative inline-flex min-w-0 items-center ${className}`}>
      <span className="sr-only">{label}</span>
      {icon && <span className="pointer-events-none absolute start-2.5 text-ink-3">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`h-9 w-full min-w-0 appearance-none truncate rounded-xl border border-line bg-surface pe-8 text-[13px] font-medium text-ink-2 hover:border-line-strong focus:border-navy-500 ${
          icon ? 'ps-8' : 'ps-2.5'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute end-2 size-4 text-ink-3" />
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative inline-flex min-w-0 items-center">
      <span className="sr-only">{placeholder}</span>
      <Search aria-hidden className="pointer-events-none absolute start-2.5 size-3.5 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full min-w-0 rounded-xl border border-line bg-surface ps-8 pe-2.5 text-[13px] text-ink placeholder:text-ink-3 hover:border-line-strong focus:border-navy-500 sm:w-44"
      />
    </label>
  );
}

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-subtle px-4 py-8 text-center text-sm text-ink-3">
      {icon}
      <div>{children}</div>
    </div>
  );
}

export function ProgressBar({ value, tone = 'navy', label }: { value: number; tone?: 'navy' | 'warn' | 'crit' | 'water'; label: string }) {
  const color = { navy: 'bg-navy-700', warn: 'bg-warn-mark', crit: 'bg-crit-mark', water: 'bg-water' }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-1.5 w-full overflow-hidden rounded-full bg-navy-50">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

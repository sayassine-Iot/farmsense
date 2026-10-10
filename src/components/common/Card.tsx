import type { ReactNode } from 'react';

interface CardProps {
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** Round, soft icon chip used in card headers. */
export function IconChip({ children, tone = 'neutral', size = 'md' }: { children: ReactNode; tone?: 'neutral' | 'navy' | 'water' | 'ok' | 'warn' | 'crit'; size?: 'sm' | 'md' }) {
  const tones = {
    neutral: 'bg-chip text-navy-800',
    navy: 'bg-navy-50 text-navy-700',
    water: 'bg-info-bg text-water',
    ok: 'bg-ok-bg text-ok',
    warn: 'bg-warn-bg text-warn',
    crit: 'bg-crit-bg text-crit',
  };
  return <span className={`grid shrink-0 place-items-center rounded-full ${tones[tone]} ${size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-10 [&_svg]:size-[19px]'}`}>{children}</span>;
}

export function Card({ id, title, subtitle, icon, actions, footer, className = '', bodyClassName = '', children }: CardProps) {
  return (
    <section id={id} className={`flex min-w-0 flex-col rounded-2xl bg-surface shadow-card ring-1 ring-line/60 transition-shadow duration-200 hover:shadow-pop ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <IconChip>{icon}</IconChip>}
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold leading-6 tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="text-[13px] leading-5 text-ink-3">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`min-w-0 flex-1 px-5 pb-5 pt-4 sm:px-6 ${bodyClassName}`}>{children}</div>
      {footer && <footer className="mx-5 border-t border-line py-3 text-xs text-ink-3 sm:mx-6">{footer}</footer>}
    </section>
  );
}

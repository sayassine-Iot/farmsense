import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { NAV_ITEMS, type NavId } from '../../config/navigation';
import { useI18n } from '../../i18n/context';
import { BrandMark } from './BrandMark';

interface SidebarProps {
  active: NavId;
  onNavigate: (id: NavId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function NavList({ active, onNavigate, collapsed }: { active: NavId; onNavigate: (id: NavId) => void; collapsed: boolean }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#/${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-navy-50 font-semibold text-navy-800' : 'text-ink-2 hover:bg-subtle hover:text-ink'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon aria-hidden className={`size-[18px] shrink-0 ${isActive ? 'text-navy-700' : 'text-ink-3 group-hover:text-ink-2'}`} strokeWidth={1.9} />
              {!collapsed && <span className="flex-1 truncate">{t(item.labelKey)}</span>}
              {!collapsed && item.phase > 1 && (
                <span className="rounded-md bg-chip px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-ink-3">{t('nav.soon')}</span>
              )}
              {collapsed && <span className="sr-only">{t(item.labelKey)}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ active, onNavigate, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop */}
      <div className={`hidden shrink-0 border-e border-line bg-surface transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      <aside className="sticky top-0 flex h-dvh flex-col">
        <div className={`flex h-20 items-center ${collapsed ? 'justify-center' : 'px-5'}`}>
          <BrandMark compact={collapsed} />
        </div>
        <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          <NavList active={active} onNavigate={onNavigate} collapsed={collapsed} />
        </nav>
        <div className="border-t border-line p-3">
          {!collapsed && <p className="mb-2 px-2 text-[11px] text-ink-3">{t('nav.phase')}</p>}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-3 hover:bg-subtle hover:text-ink ${collapsed ? 'justify-center px-0' : ''}`}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {collapsed ? <ChevronsRight className="size-4 rtl:rotate-180" /> : <ChevronsLeft className="size-4 rtl:rotate-180" />}
            {!collapsed && t('nav.collapse')}
          </button>
        </div>
      </aside>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.openMenu')}>
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label={t('nav.closeMenu')} onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-pop">
            <div className="flex h-20 items-center justify-between border-b border-line px-5">
              <BrandMark />
              <button type="button" onClick={onCloseMobile} className="rounded-lg p-1.5 text-ink-2 hover:bg-subtle" aria-label={t('nav.closeMenu')}>
                <X className="size-5" />
              </button>
            </div>
            <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
              <NavList
                active={active}
                collapsed={false}
                onNavigate={(id) => {
                  onNavigate(id);
                  onCloseMobile();
                }}
              />
            </nav>
            <p className="border-t border-line px-5 py-3 text-[11px] text-ink-3">{t('nav.phase')}</p>
          </aside>
        </div>
      )}
    </>
  );
}

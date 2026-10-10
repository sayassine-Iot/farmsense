import { Bell, CalendarDays, Check, ChevronDown, Download, Globe, LogOut, MapPin, Menu, RotateCcw, UserRound, Wifi, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { DATA_QUALITY, DATE_RANGES, type DateRangeKey } from '../../config/app';
import { LOCALES, useI18n } from '../../i18n/context';
import type { Alert, Farm, Session } from '../../types/domain';
import { Popover } from '../common/Popover';
import { StatusBadge } from '../common/StatusBadge';
import { SEVERITY_TONE } from '../common/tone';
import { useToast } from '../common/toast-context';
import { alertText } from '../dashboard/alert-text';
import { LogoGlyph } from './BrandMark';

const COUNTRY_NAMES: Record<string, Record<string, string>> = {
  MA: { en: 'Morocco', fr: 'Maroc', ar: 'المغرب' },
  TN: { en: 'Tunisia', fr: 'Tunisie', ar: 'تونس' },
  DZ: { en: 'Algeria', fr: 'Algérie', ar: 'الجزائر' },
  EG: { en: 'Egypt', fr: 'Égypte', ar: 'مصر' },
};

interface HeaderProps {
  title: string;
  /** Defaults to the farm-monitoring subtitle. */
  subtitle?: string;
  farms: Farm[];
  farm: Farm | null;
  onFarmChange: (id: string) => void;
  range: DateRangeKey;
  onRangeChange: (r: DateRangeKey) => void;
  lastUpdate: string | null;
  now: number;
  /** Connectivity chip: all devices, or neck tags on the herd page. */
  connectivity: { kind: 'devices' | 'tags'; online: number; total: number } | null;
  /** Unacknowledged warning/critical alerts. */
  notifications: Alert[];
  onExport: (() => void) | null;
  onGoToAlerts: () => void;
  onOpenMenu: () => void;
  onResetDemo: () => void;
  /** Period picker (pages whose figures depend on it). */
  showRange: boolean;
  /** Live-data badge next to the title. */
  showLive: boolean;
  session: Session | null;
}

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex h-9 min-w-0 shrink-0 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] text-ink-2 shadow-card ring-1 ring-line/70">
      <Icon aria-hidden className="size-4 shrink-0 text-ink-2" />
      {children}
    </span>
  );
}

/** Feed status from the age of the newest reading: Live, Delayed or No data. */
function LiveBadge({ lastUpdate, now }: { lastUpdate: string | null; now: number }) {
  const { t, fmt } = useI18n();
  const ageMin = lastUpdate ? (now - new Date(lastUpdate).getTime()) / 60_000 : null;
  const state = ageMin === null ? 'none' : ageMin <= DATA_QUALITY.liveWithinMinutes ? 'live' : 'delayed';
  const style = { live: 'bg-ok-bg text-ok ring-ok-mark/30', delayed: 'bg-warn-bg text-warn ring-warn-mark/30', none: 'bg-chip text-ink-2 ring-line' }[state];
  const dot = { live: 'bg-ok-mark', delayed: 'bg-warn-mark', none: 'bg-ink-3' }[state];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
      title={lastUpdate ? t('header.updated', { time: fmt.relative(lastUpdate, now) }) : undefined}
    >
      <span aria-hidden className="relative flex size-2">
        {state === 'live' && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${dot}`} />}
        <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
      </span>
      {t(`header.status.${state}`)}
    </span>
  );
}

const whiteButton = 'inline-flex h-10 items-center gap-2 rounded-xl bg-surface px-3.5 text-sm font-semibold text-ink shadow-card ring-1 ring-line hover:bg-subtle';

export function Header(props: HeaderProps) {
  const { t, fmt, locale, setLocale } = useI18n();
  const notify = useToast();
  const { farm, notifications } = props;
  const roleLabel = props.session ? t(`role.${props.session.user.role}`) : '';

  return (
    <header className="px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        {/* Title */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button type="button" onClick={props.onOpenMenu} className="-ms-1 grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 hover:bg-surface lg:hidden" aria-label={t('nav.openMenu')}>
            <Menu className="size-5" />
          </button>
          <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-[0_8px_20px_-6px_rgb(29_52_135/0.55)] sm:grid">
            <LogoGlyph className="size-9" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink sm:text-[30px] sm:leading-9">{props.title}</h1>
              {props.showLive && <LiveBadge lastUpdate={props.lastUpdate} now={props.now} />}
            </div>
            {farm && <p className="truncate text-sm text-ink-3 sm:text-[15px]">{props.subtitle ?? t('header.subtitle', { farm: farm.name })}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {props.showRange && (
            <Popover
              label={t('header.range')}
              panelClassName="w-56"
              trigger={({ toggle, open }) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="listbox" className={whiteButton}>
                  <CalendarDays aria-hidden className="size-4 text-ink-2" />
                  {t(`range.long.${props.range}`)}
                  <ChevronDown aria-hidden className="size-4 text-ink-3" />
                </button>
              )}
            >
              {(close) => (
                <ul role="listbox" aria-label={t('header.range')} className="p-1.5">
                  {DATE_RANGES.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={r === props.range}
                        onClick={() => {
                          props.onRangeChange(r);
                          close();
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${r === props.range ? 'bg-navy-50 font-semibold text-navy-800' : 'text-ink-2 hover:bg-subtle'}`}
                      >
                        {t(`range.long.${r}`)}
                        {r === props.range && <Check aria-hidden className="size-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Popover>
          )}

          {props.onExport && (
            <button type="button" onClick={props.onExport} title={t('header.exportHint')} className={whiteButton}>
              <Download aria-hidden className="size-4" />
              <span className="hidden sm:inline">{t('header.export')}</span>
              <span className="sr-only sm:hidden">{t('header.export')}</span>
            </button>
          )}

          {/* Notifications */}
          <Popover
            label={t('header.notifications')}
            panelClassName="w-80"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-label={`${t('header.notifications')} — ${t('header.openAlerts', { count: notifications.length })}`}
                className="relative grid size-10 place-items-center rounded-xl bg-surface text-ink-2 shadow-card ring-1 ring-line hover:bg-subtle"
              >
                <Bell className="size-[18px]" />
                {notifications.length > 0 && (
                  <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-crit-mark px-1 text-[10px] font-bold leading-5 text-white ring-2 ring-page">
                    {notifications.length}
                  </span>
                )}
              </button>
            )}
          >
            {(close) => (
              <div>
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="text-sm font-bold">{t('header.notifications')}</span>
                  <span className="text-xs text-ink-3">{t('header.openAlerts', { count: notifications.length })}</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-ink-3">{t('header.noNotifications')}</p>
                ) : (
                  <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                    {notifications.slice(0, 6).map((a) => {
                      const text = alertText(a, { t, fmt });
                      return (
                        <li key={a.id} className="flex gap-2.5 px-4 py-2.5">
                          <StatusBadge tone={SEVERITY_TONE[a.severity]} size="xs">
                            {t(`alerts.severity.${a.severity}`)}
                          </StatusBadge>
                          <div className="min-w-0 text-xs">
                            <p className="font-semibold text-ink">{text.title}</p>
                            <p className="truncate text-ink-3">
                              {text.subject} · {fmt.relative(a.createdAt, props.now)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="border-t border-line p-2">
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      props.onGoToAlerts();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
                  >
                    {t('header.viewAlerts')}
                  </button>
                </div>
              </div>
            )}
          </Popover>

          {/* User menu */}
          <Popover
            label={t('user.menu')}
            panelClassName="w-64"
            trigger={({ toggle, open }) => (
              <button type="button" onClick={toggle} aria-expanded={open} aria-label={t('user.menu')} className="grid size-10 place-items-center rounded-full bg-navy-100 text-xs font-bold text-navy-800 ring-2 ring-surface hover:ring-navy-200">
                DU
              </button>
            )}
          >
            {(close) => (
              <div className="py-1.5 text-sm">
                <div className="border-b border-line px-4 pb-2.5 pt-1.5">
                  <p className="font-semibold">{t('user.name')}</p>
                  <p className="text-xs text-ink-3">{roleLabel}</p>
                </div>
                <button type="button" className="flex w-full items-center gap-2.5 px-4 py-2 text-ink-2 hover:bg-subtle" onClick={() => { close(); notify(t('user.unavailable')); }}>
                  <UserRound aria-hidden className="size-4" /> {t('user.profile')}
                </button>
                <div className="px-4 py-2">
                  <p className="mb-1.5 flex items-center gap-2.5 text-ink-2">
                    <Globe aria-hidden className="size-4" /> {t('user.language')}
                  </p>
                  <div className="flex gap-1">
                    {LOCALES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        lang={l.code}
                        onClick={() => setLocale(l.code)}
                        aria-pressed={locale === l.code}
                        className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium ${locale === l.code ? 'border-navy-600 bg-navy-50 text-navy-800' : 'border-line text-ink-2 hover:bg-subtle'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="flex w-full items-center gap-2.5 px-4 py-2 text-ink-2 hover:bg-subtle" onClick={() => { close(); props.onResetDemo(); }}>
                  <RotateCcw aria-hidden className="size-4" /> {t('user.reset')}
                </button>
                <button type="button" className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2 text-ink-2 hover:bg-subtle" onClick={() => { close(); notify(t('user.unavailable')); }}>
                  <LogOut aria-hidden className="size-4" /> {t('user.signOut')}
                </button>
              </div>
            )}
          </Popover>
        </div>
      </div>

      {/* Context chips */}
      <div className="scrollbar-thin -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {props.lastUpdate && (
          <Chip icon={CalendarDays}>
            <span className="whitespace-nowrap">{t('header.chipUpdated', { time: fmt.dateTime(new Date(props.lastUpdate).getTime()) })}</span>
          </Chip>
        )}
        <Chip icon={MapPin}>
          <label className="relative inline-flex items-center">
            <span className="whitespace-nowrap">{t('header.chipFarm')}:</span>
            <select
              value={farm?.id ?? ''}
              onChange={(e) => props.onFarmChange(e.target.value)}
              className="ms-1 max-w-[12rem] cursor-pointer appearance-none truncate bg-transparent pe-5 font-semibold text-ink focus:outline-none"
            >
              {props.farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute end-0 size-3.5 text-ink-3" />
          </label>
        </Chip>
        {farm && (
          <span className="hidden md:contents">
            <Chip icon={Globe}>
              <span className="whitespace-nowrap">
                {farm.region}, {COUNTRY_NAMES[farm.country]?.[locale] ?? farm.country}
              </span>
            </Chip>
          </span>
        )}
        {props.connectivity && (
          <Chip icon={Wifi}>
            <span className="whitespace-nowrap">
              {t(props.connectivity.kind === 'tags' ? 'header.chipTags' : 'header.chipDevices', { online: props.connectivity.online, total: props.connectivity.total })}
            </span>
            <span aria-hidden className={`size-2 rounded-full ${props.connectivity.online === props.connectivity.total ? 'bg-ok-mark' : 'bg-warn-mark'}`} />
          </Chip>
        )}
      </div>
    </header>
  );
}

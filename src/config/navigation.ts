import { BarChart3, Bell, Cpu, Droplets, LayoutDashboard, PawPrint, Settings, Sprout, type LucideIcon } from 'lucide-react';
import type { MessageKey } from '../i18n/en';

export type NavId = 'overview' | 'water' | 'crops' | 'livestock' | 'devices' | 'alerts' | 'analytics' | 'settings';

export interface NavItem {
  id: NavId;
  labelKey: MessageKey;
  icon: LucideIcon;
  /** Phase in which the module page is delivered. */
  phase: 1 | 2;
  /** Description of the planned module (future phases only). */
  plannedKey?: MessageKey;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard, phase: 1 },
  { id: 'water', labelKey: 'nav.water', icon: Droplets, phase: 2, plannedKey: 'soon.water' },
  { id: 'crops', labelKey: 'nav.crops', icon: Sprout, phase: 2, plannedKey: 'soon.crops' },
  { id: 'livestock', labelKey: 'nav.livestock', icon: PawPrint, phase: 1 },
  { id: 'devices', labelKey: 'nav.devices', icon: Cpu, phase: 2, plannedKey: 'soon.devices' },
  { id: 'alerts', labelKey: 'nav.alerts', icon: Bell, phase: 2, plannedKey: 'soon.alerts' },
  { id: 'analytics', labelKey: 'nav.analytics', icon: BarChart3, phase: 2, plannedKey: 'soon.analytics' },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings, phase: 2, plannedKey: 'soon.settings' },
];

export const isNavId = (v: string): v is NavId => NAV_ITEMS.some((n) => n.id === v);

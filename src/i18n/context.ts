import { createContext, useContext } from 'react';
import type { Formatters, Locale } from '../utils/format';
import { ar } from './ar';
import { en, type MessageKey, type Messages } from './en';
import { fr } from './fr';

export type { MessageKey };

const MESSAGES: Record<Locale, Messages> = { en, fr, ar };

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = MESSAGES[locale][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  fmt: Formatters;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

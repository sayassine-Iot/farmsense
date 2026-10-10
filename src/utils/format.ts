import { UNITS } from '../config/app';
import type { CurrencyCode } from '../types/domain';
import { DAY_MS, HOUR_MS, MINUTE_MS } from './time';

export type Locale = 'en' | 'fr' | 'ar';

const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  // Latin digits are the norm on Maghreb dashboards and in sensor documentation.
  ar: 'ar-MA-u-nu-latn',
};

const UNIT_LABELS: Record<Locale, { m3: string; L: string; perHour: string; kWh: string; min: string; h: string; d: string; c: string }> = {
  en: { m3: 'm³', L: 'L', perHour: '/h', kWh: 'kWh', min: 'min', h: 'h', d: 'd', c: '°C' },
  fr: { m3: 'm³', L: 'L', perHour: '/h', kWh: 'kWh', min: 'min', h: 'h', d: 'j', c: '°C' },
  ar: { m3: 'م³', L: 'ل', perHour: '/س', kWh: 'ك.و.س', min: 'د', h: 'س', d: 'ي', c: '°م' },
};

export interface Formatters {
  locale: Locale;
  intlLocale: string;
  number(value: number, maxDigits?: number): string;
  /** Volume stored in m³; displayed in the configured unit. */
  volume(m3: number, maxDigits?: number): string;
  volumeUnit(): string;
  flow(m3h: number): string;
  energy(kWh: number): string;
  percent(value: number, maxDigits?: number): string;
  currency(value: number, code: CurrencyCode, maxDigits?: number): string;
  temperature(c: number): string;
  duration(minutes: number): string;
  relative(iso: string, now: number): string;
  dateTime(ms: number): string;
  time(ms: number): string;
  bucket(ms: number, granularity: 'hour' | 'day'): string;
  bucketLong(ms: number, granularity: 'hour' | 'day'): string;
}

export function createFormatters(locale: Locale): Formatters {
  const intlLocale = INTL_LOCALE[locale];
  const u = UNIT_LABELS[locale];
  const nf = (max: number, min = 0) => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: max, minimumFractionDigits: min });
  const number = (v: number, maxDigits = 0) => nf(maxDigits).format(v);
  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto', style: 'short' });
  const timeFmt = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' });
  const dateTimeFmt = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });
  const dayLongFmt = new Intl.DateTimeFormat(intlLocale, { weekday: 'short', day: 'numeric', month: 'short' });
  const hourFmt = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' });

  return {
    locale,
    intlLocale,
    number,
    volume: (m3, maxDigits) =>
      UNITS.volume === 'L'
        ? `${number(m3 * 1000, maxDigits ?? 0)} ${u.L}`
        : `${number(m3, maxDigits ?? (m3 < 10 ? 1 : 0))} ${u.m3}`,
    volumeUnit: () => (UNITS.volume === 'L' ? u.L : u.m3),
    flow: (m3h) => `${number(m3h, 1)} ${u.m3}${u.perHour}`,
    energy: (kWh) => `${number(kWh, kWh < 10 ? 1 : 0)} ${u.kWh}`,
    percent: (v, maxDigits = 0) => new Intl.NumberFormat(intlLocale, { style: 'percent', maximumFractionDigits: maxDigits }).format(v / 100),
    currency: (v, code, maxDigits = 2) =>
      new Intl.NumberFormat(intlLocale, { style: 'currency', currency: code, maximumFractionDigits: maxDigits, minimumFractionDigits: Math.min(maxDigits, 2) }).format(v),
    temperature: (c) => `${number(c, 1)} ${u.c}`,
    duration: (minutes) => {
      const m = Math.round(minutes);
      if (m < 60) return `${m} ${u.min}`;
      if (m < 48 * 60) return `${Math.floor(m / 60)} ${u.h} ${String(m % 60).padStart(2, '0')} ${u.min}`;
      return `${Math.round(m / 1440)} ${u.d}`;
    },
    relative: (iso, now) => {
      const diff = new Date(iso).getTime() - now;
      const abs = Math.abs(diff);
      if (abs < MINUTE_MS) return rtf.format(0, 'minute');
      if (abs < HOUR_MS) return rtf.format(Math.round(diff / MINUTE_MS), 'minute');
      if (abs < DAY_MS) return rtf.format(Math.round(diff / HOUR_MS), 'hour');
      return rtf.format(Math.round(diff / DAY_MS), 'day');
    },
    dateTime: (ms) => dateTimeFmt.format(ms),
    time: (ms) => timeFmt.format(ms),
    bucket: (ms, g) => (g === 'hour' ? hourFmt.format(ms) : dayFmt.format(ms)),
    bucketLong: (ms, g) => (g === 'hour' ? `${dayFmt.format(ms)} ${hourFmt.format(ms)}` : dayLongFmt.format(ms)),
  };
}

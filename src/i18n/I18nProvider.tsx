import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createFormatters, type Locale } from '../utils/format';
import { readStored, writeStored } from '../utils/storage';
import { I18nContext, translate } from './context';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = readStored<string>('locale', 'en');
    return stored === 'fr' || stored === 'ar' ? stored : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      dir: (locale === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      fmt: createFormatters(locale),
      t: (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(locale, key, params),
      setLocale: (next: Locale) => {
        writeStored('locale', next);
        setLocaleState(next);
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

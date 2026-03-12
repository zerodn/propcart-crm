'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '@/lib/i18n';

type Locale = 'vi' | 'en';

interface I18nContextType {
  locale: Locale;
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'vi',
  t: (_path: string, _vars?: Record<string, string | number>) => '',
  setLocale: (_l: Locale) => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Keep first render deterministic between SSR and CSR to avoid hydration mismatch.
  const [locale, setLocale] = useState<Locale>('vi');
  const [isLocaleHydrated, setIsLocaleHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('locale');
      if (stored === 'en' || stored === 'vi') {
        setLocale(stored);
      }
    } catch (e) {}
    setIsLocaleHydrated(true);
  }, []);

  useEffect(() => {
    if (!isLocaleHydrated) return;
    try {
      localStorage.setItem('locale', locale);
    } catch (e) {}
  }, [isLocaleHydrated, locale]);

  const t = (path: string, vars?: Record<string, string | number>) => {
    const parts = path.split('.');
    let cur: unknown = translations[locale];
    for (const p of parts) {
      if (!cur) return '';
      if (typeof cur !== 'object' || cur === null || !(p in cur)) return '';
      cur = (cur as Record<string, unknown>)[p];
    }
    let result = typeof cur === 'string' ? cur : '';

    // Replace variables like {name}, {days}, etc.
    if (vars) {
      Object.keys(vars).forEach((key) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(vars[key]));
      });
    }

    return result;
  };

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

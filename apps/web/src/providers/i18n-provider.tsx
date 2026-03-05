'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '@/lib/i18n';

type Locale = 'vi' | 'en';

interface I18nContextType {
  locale: Locale;
  t: (path: string) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'vi',
  t: (path: string) => '',
  setLocale: (l: Locale) => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem('locale');
      if (stored === 'en' || stored === 'vi') return stored;
    } catch (e) {}
    return 'vi';
  });

  useEffect(() => {
    try {
      localStorage.setItem('locale', locale);
    } catch (e) {}
  }, [locale]);

  const t = (path: string) => {
    const parts = path.split('.');
    let cur: any = translations[locale];
    for (const p of parts) {
      if (!cur) return '';
      cur = cur[p];
    }
    return typeof cur === 'string' ? cur : '';
  };

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

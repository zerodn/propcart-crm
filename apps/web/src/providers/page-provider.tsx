'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface PageConfig {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

interface PageContextValue {
  config: PageConfig;
  setPageConfig: (config: PageConfig) => void;
}

const PageContext = createContext<PageContextValue | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PageConfig>({ title: '' });

  const setPageConfig = useCallback((c: PageConfig) => {
    setConfig(c);
  }, []);

  return <PageContext.Provider value={{ config, setPageConfig }}>{children}</PageContext.Provider>;
}

export function usePageConfig() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageConfig must be used within PageProvider');
  return ctx;
}

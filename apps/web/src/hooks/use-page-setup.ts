'use client';

import { useEffect, type ReactNode } from 'react';
import { usePageConfig } from '@/providers/page-provider';

export function usePageSetup(config: { title: string; subtitle?: string; actions?: ReactNode }) {
  const { setPageConfig } = usePageConfig();

  // config.actions is intentionally excluded from deps: it's a new JSX object on
  // every render, which would trigger setPageConfig → PageProvider re-render →
  // page re-render → infinite loop. Actions only need to be set on mount.
  // onClick handlers inside actions use useState setters, which are stable.
  useEffect(() => {
    setPageConfig(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title, config.subtitle, setPageConfig]);
}

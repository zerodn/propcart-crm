'use client';

import { useEffect, type ReactNode } from 'react';
import { usePageConfig } from '@/providers/page-provider';

export function usePageSetup(config: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Pass a stable primitive that changes when actions should re-render (e.g. a permission flag). */
  actionsKey?: string | number | boolean;
}) {
  const { setPageConfig } = usePageConfig();

  // config.actions is intentionally excluded from deps: it's a new JSX object on
  // every render, which would trigger setPageConfig → PageProvider re-render →
  // page re-render → infinite loop. Use actionsKey to signal when actions change.
  useEffect(() => {
    setPageConfig(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title, config.subtitle, config.actionsKey, setPageConfig]);
}

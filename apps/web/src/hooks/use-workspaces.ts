'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import type { WorkspaceItem } from '@/types';
import { useI18n } from '@/providers/i18n-provider';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/auth/workspaces');
      setWorkspaces(data.data ?? []);
    } catch {
      setError(t('workspace.error.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { workspaces, isLoading, error, refetch };
}

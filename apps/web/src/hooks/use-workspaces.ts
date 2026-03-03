'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import type { WorkspaceItem } from '@/types';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/auth/workspaces');
      setWorkspaces(data.data ?? []);
    } catch {
      setError('Không thể tải danh sách workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refetch(); }, []);

  return { workspaces, isLoading, error, refetch };
}

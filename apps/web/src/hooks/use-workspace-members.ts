'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  roleId: string;
  status: number;
  joinedAt: string;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
  };
  role: {
    id: string;
    code: string;
    name: string;
  };
}

export function useWorkspaceMembers(workspaceId?: string, search?: string) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      const url = `/workspaces/${workspaceId}/members${params.toString() ? `?${params.toString()}` : ''}`;
      const { data } = await apiClient.get(url);
      setMembers(data.data ?? []);
    } catch {
      setError('Không thể tải danh sách thành viên');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [workspaceId, search]);

  return { members, isLoading, error, refetch };
}

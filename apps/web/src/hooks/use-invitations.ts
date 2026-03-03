'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import type { Invitation } from '@/types';

export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/me/invitations');
      setInvitations(data.data ?? []);
    } catch {
      setError('Không thể tải danh sách lời mời');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refetch(); }, []);

  return { invitations, isLoading, error, refetch };
}

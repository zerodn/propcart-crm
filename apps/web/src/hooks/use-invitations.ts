'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import type { Invitation } from '@/types';
import { useI18n } from '@/providers/i18n-provider';

export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/me/invitations');
      setInvitations(data.data ?? []);
    } catch {
      setError(t('invitations.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { invitations, isLoading, error, refetch };
}

// Hook for workspace sent invitations
export function useWorkspaceInvitations(workspaceId?: string) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(`/workspaces/${workspaceId}/invitations`);
      setInvitations(data.data ?? []);
    } catch {
      setError(t('invitations.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [workspaceId]);

  return { invitations, isLoading, error, refetch };
}

// Hook for declined invitations with pagination
export function useDeclinedInvitations(workspaceId?: string, page = 1, limit = 10) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  const refetch = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(
        `/workspaces/${workspaceId}/invitations/declined?page=${page}&limit=${limit}`,
      );
      setInvitations(data.data ?? []);
      setMeta(data.meta ?? { total: 0, page, limit, totalPages: 0 });
    } catch {
      setError(t('invitations.loadDeclinedError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [workspaceId, page, limit]);

  return { invitations, isLoading, error, meta, refetch };
}

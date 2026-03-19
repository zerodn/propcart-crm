import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';
import { useI18n } from '@/providers/i18n-provider';

export interface ActivityUser {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface ActivityCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
}

export interface ActivityDemand {
  id: string;
  title: string;
  status: string;
}

export interface Activity {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  demandId?: string | null;
  type: string;
  title: string;
  content?: string | null;
  result?: string | null;
  activityDate: string;
  duration?: number | null;
  status: string;
  deletedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  customer?: ActivityCustomer | null;
  demand?: ActivityDemand | null;
  createdBy?: ActivityUser;
}

export interface ActivityMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityListParams {
  search?: string;
  type?: string;
  status?: string;
  customerId?: string;
  demandId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type ActivityFormData = {
  customerId?: string;
  demandId?: string;
  type: string;
  title: string;
  content?: string;
  result?: string;
  activityDate?: string;
  duration?: number;
  status?: string;
};

export function useActivity() {
  const { workspace } = useAuth();
  const { t } = useI18n();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [meta, setMeta] = useState<ActivityMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (params?: ActivityListParams) => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.type) query.set('type', params.type);
      if (params?.status) query.set('status', params.status);
      if (params?.customerId) query.set('customerId', params.customerId);
      if (params?.demandId) query.set('demandId', params.demandId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      const url = `/workspaces/${workspace.id}/activities${qs ? `?${qs}` : ''}`;
      const res = await apiClient.get<{ data: Activity[]; meta: ActivityMeta }>(url);
      const body = res.data as { data: Activity[]; meta: ActivityMeta };
      setActivities(body.data ?? []);
      setMeta(body.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('activity.message.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchActivities({ page: 1, limit: 20 });
  }, [workspace?.id]);

  const create = async (data: ActivityFormData) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/activities`, data);
      toast.success(t('activity.message.addSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('activity.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, data: Partial<ActivityFormData>) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/activities/${id}`, data);
      toast.success(t('activity.message.updateSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('activity.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const deleteActivity = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/activities/${id}`);
      toast.success(t('activity.message.deleteSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('activity.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  return {
    activities,
    meta,
    isLoading,
    error,
    fetchActivities,
    create,
    update,
    delete: deleteActivity,
  };
}

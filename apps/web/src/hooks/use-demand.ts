import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';
import { useI18n } from '@/providers/i18n-provider';

export interface DemandUser {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface DemandCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
}

export interface Demand {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  title: string;
  propertyType?: string | null;
  purpose?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetUnit?: string | null;
  areaMin?: number | null;
  areaMax?: number | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  districtCode?: string | null;
  districtName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  address?: string | null;
  status: string;
  priority?: string | null;
  assignedUserId?: string | null;
  description?: string | null;
  note?: string | null;
  deletedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  customer?: DemandCustomer | null;
  createdBy?: DemandUser;
  assignedUser?: DemandUser | null;
}

export interface DemandMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DemandListParams {
  search?: string;
  status?: string;
  priority?: string;
  propertyType?: string;
  purpose?: string;
  customerId?: string;
  assignedUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type DemandFormData = {
  customerId?: string;
  title: string;
  propertyType?: string;
  purpose?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetUnit?: string;
  areaMin?: number;
  areaMax?: number;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  address?: string;
  status?: string;
  priority?: string;
  assignedUserId?: string;
  description?: string;
  note?: string;
};

export function useDemand() {
  const { workspace } = useAuth();
  const { t } = useI18n();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [meta, setMeta] = useState<DemandMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemands = useCallback(async (params?: DemandListParams) => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.priority) query.set('priority', params.priority);
      if (params?.propertyType) query.set('propertyType', params.propertyType);
      if (params?.purpose) query.set('purpose', params.purpose);
      if (params?.customerId) query.set('customerId', params.customerId);
      if (params?.assignedUserId) query.set('assignedUserId', params.assignedUserId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      const url = `/workspaces/${workspace.id}/demands${qs ? `?${qs}` : ''}`;
      const res = await apiClient.get<{ data: Demand[]; meta: DemandMeta }>(url);
      const body = res.data as { data: Demand[]; meta: DemandMeta };
      setDemands(body.data ?? []);
      setMeta(body.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('demand.message.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchDemands({ page: 1, limit: 20 });
  }, [workspace?.id]);

  const create = async (data: DemandFormData) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/demands`, data);
      toast.success(t('demand.message.addSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('demand.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, data: Partial<DemandFormData>) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/demands/${id}`, data);
      toast.success(t('demand.message.updateSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('demand.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const deleteDemand = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/demands/${id}`);
      toast.success(t('demand.message.deleteSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('demand.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  return {
    demands,
    meta,
    isLoading,
    error,
    fetchDemands,
    create,
    update,
    delete: deleteDemand,
  };
}

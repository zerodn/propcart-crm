import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';
import { useI18n } from '@/providers/i18n-provider';

export interface CustomerUser {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface Customer {
  id: string;
  workspaceId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  districtCode?: string | null;
  districtName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  source?: string | null;
  group?: string | null;
  status: string;
  interestLevel?: string | null;
  avatarUrl?: string | null;
  assignedUserId?: string | null;
  tags?: string[] | null;
  note?: string | null;
  deletedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: CustomerUser;
  assignedUser?: CustomerUser | null;
}

export interface CustomerMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerListParams {
  search?: string;
  status?: string;
  interestLevel?: string;
  source?: string;
  group?: string;
  assignedUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type CustomerFormData = {
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  source?: string;
  group?: string;
  status?: string;
  interestLevel?: string;
  assignedUserId?: string;
  tags?: string[];
  note?: string;
  avatarUrl?: string | null;
};

export function useCustomer() {
  const { workspace } = useAuth();
  const { t } = useI18n();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<CustomerMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (params?: CustomerListParams) => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.interestLevel) query.set('interestLevel', params.interestLevel);
      if (params?.source) query.set('source', params.source);
      if (params?.group) query.set('group', params.group);
      if (params?.assignedUserId) query.set('assignedUserId', params.assignedUserId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      const url = `/workspaces/${workspace.id}/customers${qs ? `?${qs}` : ''}`;
      const res = await apiClient.get<{ data: Customer[]; meta: CustomerMeta }>(url);
      const body = res.data as { data: Customer[]; meta: CustomerMeta };
      setCustomers(body.data ?? []);
      setMeta(body.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('customer.message.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchCustomers({ page: 1, limit: 20 });
  }, [workspace?.id]);

  const create = async (data: CustomerFormData) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/customers`, data);
      toast.success(t('customer.message.addSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('customer.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, data: Partial<CustomerFormData>) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/customers/${id}`, data);
      toast.success(t('customer.message.updateSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('customer.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/customers/${id}`);
      toast.success(t('customer.message.deleteSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('customer.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  return {
    customers,
    meta,
    isLoading,
    error,
    fetchCustomers,
    create,
    update,
    delete: deleteCustomer,
  };
}

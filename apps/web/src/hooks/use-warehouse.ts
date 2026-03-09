import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export interface PropertyWarehouse {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  status: number;
  latitude?: number;
  longitude?: number;
  provinceCode?: string;
  provinceName?: string;
  wardCode?: string;
  wardName?: string;
  fullAddress?: string;
  createdByUserId: string;
  createdBy: {
    id: string;
    fullName?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function useWarehouse(workspaceId: string) {
  const [warehouses, setWarehouses] = useState<PropertyWarehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(
    async (opts?: { search?: string; type?: string; status?: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ data: PropertyWarehouse[] }>(
          `/workspaces/${workspaceId}/warehouses`,
          { params: opts },
        );
        const items = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
        setWarehouses(items);
        return items;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load warehouses';
        setError(message);
        toast.error(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  const create = useCallback(
    async (data: any) => {
      try {
        console.log('Creating warehouse with data:', data);
        const response = await apiClient.post<PropertyWarehouse>(
          `/workspaces/${workspaceId}/warehouses`,
          data,
        );
        const warehouse = response.data;
        toast.success('Kho hàng đã được tạo');
        return warehouse;
      } catch (err) {
        console.error('Create warehouse error:', err);
        const message = err instanceof Error ? err.message : 'Failed to create warehouse';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  const update = useCallback(
    async (id: string, data: any) => {
      try {
        const response = await apiClient.patch<PropertyWarehouse>(
          `/workspaces/${workspaceId}/warehouses/${id}`,
          data,
        );
        const updated = response.data;
        toast.success('Kho hàng đã được cập nhật');
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update warehouse';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/workspaces/${workspaceId}/warehouses/${id}`);
        setWarehouses((prev) => prev.filter((w) => w.id !== id));
        toast.success('Kho hàng đã được xoá');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete warehouse';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  return { warehouses, isLoading, error, list, create, update, delete: delete_ };
}

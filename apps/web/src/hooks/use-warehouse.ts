import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

type UnknownRecord = Record<string, unknown>;

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
  createdBy?: {
    id: string;
    fullName?: string;
    phone?: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

function normalizeWarehouse(raw: UnknownRecord): PropertyWarehouse {
  const createdBy =
    (raw.createdBy as UnknownRecord | undefined) ??
    (raw.created_by as UnknownRecord | undefined) ??
    null;

  return {
    ...raw,
    createdByUserId:
      (raw.createdByUserId as string | undefined) ??
      (raw.created_by_user_id as string | undefined) ??
      '',
    createdBy: createdBy
      ? {
          id: (createdBy.id as string) ?? '',
          fullName:
            (createdBy.fullName as string | undefined) ??
            (createdBy.full_name as string | undefined),
          phone:
            (createdBy.phone as string | undefined) ??
            (createdBy.phone_number as string | undefined),
          email: createdBy.email as string | undefined,
        }
      : null,
  } as PropertyWarehouse;
}

export function useWarehouse(workspaceId: string) {
  const [warehouses, setWarehouses] = useState<PropertyWarehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const list = useCallback(
    async (opts?: { search?: string; type?: string; status?: number; page?: number; limit?: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ data: PropertyWarehouse[]; meta?: Record<string, number> }>(
          `/workspaces/${workspaceId}/warehouses`,
          { params: opts },
        );
        const rawData = response.data as unknown as Record<string, unknown>;
        const rawItems = (
          Array.isArray(rawData) ? rawData : ((rawData?.data ?? []) as unknown[])
        ) as unknown[];
        const items = rawItems.map((item) => normalizeWarehouse(item as UnknownRecord));
        const rawMeta = rawData?.meta as Record<string, number> | undefined;
        if (rawMeta) {
          setMeta({
            total: rawMeta.total ?? items.length,
            page: rawMeta.page ?? 1,
            limit: rawMeta.limit ?? items.length,
            totalPages: rawMeta.totalPages ?? 1,
          });
        } else {
          setMeta({ total: items.length, page: 1, limit: items.length, totalPages: 1 });
        }
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
    async (data: Record<string, unknown>) => {
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
    async (id: string, data: Record<string, unknown>) => {
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

  return { warehouses, isLoading, error, meta, list, create, update, delete: delete_ };
}

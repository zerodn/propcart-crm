import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export interface PropertyProduct {
  id: string;
  workspaceId: string;
  warehouseId: string;
  propertyType: string;
  zone?: string;
  block?: string;
  unitCode: string;
  direction?: string;
  area?: number;
  priceWithoutVat?: number;
  priceWithVat?: number;
  promotionProgram?: string;
  priceSheetUrl?: string;
  salesPolicyUrl?: string;
  layoutPlanUrl?: string;
  cartLink?: string;
  callPhone?: string;
  zaloPhone?: string;
  transactionStatus: 'AVAILABLE' | 'BOOKED';
  note?: string;
  isInterested: boolean;
  isShared: boolean;
  createdByUserId: string;
  createdBy?: {
    id: string;
    fullName?: string;
    phone?: string;
    email?: string;
  } | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

function normalizeProduct(raw: any): PropertyProduct {
  const createdBy = raw?.createdBy ?? raw?.created_by ?? null;
  const warehouse = raw?.warehouse ?? raw?.warehouse_info ?? null;

  return {
    ...raw,
    createdByUserId: raw?.createdByUserId ?? raw?.created_by_user_id ?? '',
    area: raw?.area !== undefined && raw?.area !== null ? Number(raw.area) : undefined,
    priceWithoutVat:
      raw?.priceWithoutVat !== undefined && raw?.priceWithoutVat !== null
        ? Number(raw.priceWithoutVat)
        : undefined,
    priceWithVat:
      raw?.priceWithVat !== undefined && raw?.priceWithVat !== null
        ? Number(raw.priceWithVat)
        : undefined,
    createdBy: createdBy
      ? {
          id: createdBy.id,
          fullName: createdBy.fullName ?? createdBy.full_name,
          phone: createdBy.phone,
          email: createdBy.email,
        }
      : null,
    warehouse: warehouse
      ? {
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
        }
      : null,
  } as PropertyProduct;
}

export function useProduct(workspaceId: string) {
  const [products, setProducts] = useState<PropertyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(
    async (opts?: { search?: string; warehouseId?: string; transactionStatus?: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ data: PropertyProduct[] }>(
          `/workspaces/${workspaceId}/products`,
          { params: opts },
        );
        const rawItems = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
        const items = rawItems.map(normalizeProduct);
        setProducts(items);
        return items;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load products';
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
        const response = await apiClient.post<PropertyProduct>(
          `/workspaces/${workspaceId}/products`,
          data,
        );
        toast.success('Sản phẩm đã được tạo');
        return normalizeProduct(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create product';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  const update = useCallback(
    async (id: string, data: any) => {
      try {
        const response = await apiClient.patch<PropertyProduct>(
          `/workspaces/${workspaceId}/products/${id}`,
          data,
        );
        toast.success('Sản phẩm đã được cập nhật');
        return normalizeProduct(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update product';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/workspaces/${workspaceId}/products/${id}`);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success('Sản phẩm đã được xóa');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete product';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  return { products, isLoading, error, list, create, update, delete: delete_ };
}

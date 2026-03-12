import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

type UnknownRecord = Record<string, unknown>;

export interface ProductDocument {
  documentType: string;
  fileName: string;
  fileUrl: string;
}

export interface ProductImageItem {
  fileName: string;
  originalUrl: string;
  thumbnailUrl: string;
}

export interface PropertyProduct {
  id: string;
  workspaceId: string;
  warehouseId: string;
  name: string;
  unitCode: string;
  tags?: string[];
  propertyType: string;
  zone?: string;
  block?: string;
  direction?: string;
  area?: number;
  priceWithoutVat?: number;
  priceWithVat?: number;
  isContactForPrice?: boolean;
  isHidden?: boolean;
  promotionProgram?: string;
  policyImageUrls?: ProductImageItem[];
  productDocuments?: ProductDocument[];
  callPhone?: string;
  zaloPhone?: string;
  contactMemberIds?: string[];
  transactionStatus: string;
  note?: string;
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

function normalizeProduct(raw: UnknownRecord): PropertyProduct {
  const createdBy =
    (raw.createdBy as UnknownRecord | undefined) ??
    (raw.created_by as UnknownRecord | undefined) ??
    null;
  const warehouse =
    (raw.warehouse as UnknownRecord | undefined) ??
    (raw.warehouse_info as UnknownRecord | undefined) ??
    null;

  return {
    ...raw,
    createdByUserId:
      (raw.createdByUserId as string | undefined) ??
      (raw.created_by_user_id as string | undefined) ??
      '',
    area: raw.area !== undefined && raw.area !== null ? Number(raw.area) : undefined,
    priceWithoutVat:
      raw.priceWithoutVat !== undefined && raw.priceWithoutVat !== null
        ? Number(raw.priceWithoutVat)
        : undefined,
    priceWithVat:
      raw.priceWithVat !== undefined && raw.priceWithVat !== null
        ? Number(raw.priceWithVat)
        : undefined,
    isContactForPrice: (raw.isContactForPrice as boolean | undefined) ?? false,
    isHidden: (raw.isHidden as boolean | undefined) ?? false,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    policyImageUrls: Array.isArray(raw.policyImageUrls)
      ? raw.policyImageUrls
          .map((item: unknown) => {
            if (typeof item === 'string') {
              return {
                fileName: '',
                originalUrl: item,
                thumbnailUrl: item,
              };
            }

            if (item && typeof item === 'object') {
              const record = item as UnknownRecord;
              const originalUrl =
                (record.originalUrl as string | undefined) ||
                (record.fileUrl as string | undefined) ||
                '';
              const thumbnailUrl =
                (record.thumbnailUrl as string | undefined) ||
                (record.thumbUrl as string | undefined) ||
                originalUrl;
              if (!originalUrl && !thumbnailUrl) return null;
              return {
                fileName: (record.fileName as string | undefined) || '',
                originalUrl,
                thumbnailUrl,
              };
            }

            return null;
          })
          .filter(Boolean)
      : [],
    contactMemberIds: Array.isArray(raw.contactMemberIds) ? (raw.contactMemberIds as string[]) : [],
    productDocuments: Array.isArray(raw.productDocuments)
      ? (raw.productDocuments as ProductDocument[])
      : [],
    createdBy: createdBy
      ? {
          id: createdBy.id as string,
          fullName:
            (createdBy.fullName as string | undefined) ??
            (createdBy.full_name as string | undefined),
          phone: createdBy.phone as string | undefined,
          email: createdBy.email as string | undefined,
        }
      : null,
    warehouse: warehouse
      ? {
          id: warehouse.id,
          name: warehouse.name as string,
          code: warehouse.code as string,
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
        const rawItems = (
          Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
        ) as unknown[];
        const items = rawItems.map((item) => normalizeProduct(item as UnknownRecord));
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
    async (data: Record<string, unknown>) => {
      try {
        const response = await apiClient.post<PropertyProduct>(
          `/workspaces/${workspaceId}/products`,
          data,
        );
        toast.success('San pham da duoc tao');
        return normalizeProduct(response.data as unknown as UnknownRecord);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create product';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  const update = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      try {
        const response = await apiClient.patch<PropertyProduct>(
          `/workspaces/${workspaceId}/products/${id}`,
          data,
        );
        toast.success('San pham da duoc cap nhat');
        return normalizeProduct(response.data as unknown as UnknownRecord);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update product';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length)
        return [] as Array<{ fileName: string; fileUrl: string; objectKey: string }>;

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await apiClient.post(
        `/workspaces/${workspaceId}/products/upload-files`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      const payload = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      return payload as Array<{ fileName: string; fileUrl: string; objectKey: string }>;
    },
    [workspaceId],
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/workspaces/${workspaceId}/products/${id}`);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success('San pham da duoc xoa');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete product';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId],
  );

  return { products, isLoading, error, list, create, update, delete: delete_, uploadFiles };
}

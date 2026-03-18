import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';
import { useI18n } from '@/providers/i18n-provider';

export interface CatalogValue {
  value: string;
  label: string;
  color?: string;
  order?: number;
}

export interface CatalogItem {
  id: string;
  type: string;
  code: string;
  name: string;
  values?: CatalogValue[];
  createdAt: string;
}

export interface UseCatalogReturn {
  items: CatalogItem[];
  isLoading: boolean;
  error: string | null;
  create: (
    type: string,
    code: string,
    name: string,
    parentId?: string | null,
    values?: Array<{ value: string; label: string; color?: string }>,
  ) => Promise<void>;
  update: (
    id: string,
    data: {
      type?: string;
      name?: string;
      code?: string;
      parentId?: string | null;
      values?: Array<{ value: string; label: string; color?: string }>;
    },
  ) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCatalog(type?: string): UseCatalogReturn {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = type
        ? `/workspaces/${workspace.id}/catalogs?type=${type}`
        : `/workspaces/${workspace.id}/catalogs`;
      const response = await apiClient.get<{ data: CatalogItem[] }>(url);
      const items = Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []);
      setItems(items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('catalogs.message.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [workspace?.id, type]);

  const create = async (
    itemType: string,
    code: string,
    name: string,
    parentId?: string | null,
    values?: Array<{ value: string; label: string; color?: string }>,
  ) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/catalogs`, {
        type: itemType,
        code,
        name,
        parentId: parentId ?? null,
        values,
      });
      toast.success(t('catalogs.message.addSuccess'));
      await fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('catalogs.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const update = async (
    id: string,
    data: {
      type?: string;
      name?: string;
      code?: string;
      parentId?: string | null;
      values?: Array<{ value: string; label: string; color?: string }>;
    },
  ) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/catalogs/${id}`, data);
      toast.success(t('catalogs.message.updateSuccess'));
      await fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('catalogs.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/catalogs/${id}`);
      toast.success(t('catalogs.message.deleteSuccess'));
      await fetchItems();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.includes('CATALOG_IN_USE')
            ? t('catalogs.message.inUse')
            : err.message
          : t('catalogs.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  return {
    items,
    isLoading,
    error,
    create,
    update,
    delete: deleteItem,
    refetch: fetchItems,
  };
}

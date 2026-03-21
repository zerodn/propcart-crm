'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';

// ===================== Types =====================

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  entity: string;
  fieldKey: string;
  label: string;
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'FILE';
  required: boolean;
  maxLength: number | null;
  catalogCode: string | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldValues = Record<string, string | null>;

// ===================== Hook =====================

export function useCustomFields(entity = 'CUSTOMER') {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<CustomFieldValues>({});
  const [isLoadingDefs, setIsLoadingDefs] = useState(false);
  const [isLoadingValues, setIsLoadingValues] = useState(false);

  // ── Definitions ──

  const fetchDefinitions = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingDefs(true);
    try {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/custom-fields/definitions`,
        { params: { entity } },
      );
      setDefinitions(res.data?.data ?? []);
    } catch {
      toast.error('Không thể tải cấu hình trường tùy chỉnh');
    } finally {
      setIsLoadingDefs(false);
    }
  }, [workspaceId, entity]);

  const createDefinition = useCallback(
    async (data: {
      fieldKey: string;
      label: string;
      fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'FILE';
      required?: boolean;
      maxLength?: number | null;
      catalogCode?: string | null;
      order?: number;
    }) => {
      const res = await apiClient.post(
        `/workspaces/${workspaceId}/custom-fields/definitions`,
        { ...data, entity },
      );
      toast.success('Đã thêm trường');
      await fetchDefinitions();
      return res.data?.data;
    },
    [workspaceId, entity, fetchDefinitions],
  );

  const updateDefinition = useCallback(
    async (id: string, data: Partial<CustomFieldDefinition>) => {
      await apiClient.patch(
        `/workspaces/${workspaceId}/custom-fields/definitions/${id}`,
        data,
      );
      toast.success('Đã cập nhật trường');
      await fetchDefinitions();
    },
    [workspaceId, fetchDefinitions],
  );

  const deleteDefinition = useCallback(
    async (id: string) => {
      await apiClient.delete(
        `/workspaces/${workspaceId}/custom-fields/definitions/${id}`,
      );
      toast.success('Đã xoá trường');
      await fetchDefinitions();
    },
    [workspaceId, fetchDefinitions],
  );

  // ── Values ──

  const fetchValues = useCallback(
    async (entityId: string) => {
      if (!workspaceId || !entityId) return;
      setIsLoadingValues(true);
      try {
        const res = await apiClient.get(
          `/workspaces/${workspaceId}/custom-fields/values`,
          { params: { entity, entityId } },
        );
        setValues(res.data?.data ?? {});
      } catch {
        // Silence — field values may simply not exist yet
      } finally {
        setIsLoadingValues(false);
      }
    },
    [workspaceId, entity],
  );

  const saveValues = useCallback(
    async (entityId: string, fields: Array<{ fieldKey: string; value: string | null }>) => {
      await apiClient.post(`/workspaces/${workspaceId}/custom-fields/values`, {
        entity,
        entityId,
        fields,
      });
    },
    [workspaceId, entity],
  );

  return {
    definitions,
    values,
    isLoadingDefs,
    isLoadingValues,
    fetchDefinitions,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    fetchValues,
    saveValues,
    setValues,
  };
}

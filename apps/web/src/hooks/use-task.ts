import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';
import { useI18n } from '@/providers/i18n-provider';

export interface TaskUser {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface TaskCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
}

export interface Task {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status: string;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  assignedUserId?: string | null;
  deletedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  customer?: TaskCustomer | null;
  createdBy?: TaskUser;
  assignedUser?: TaskUser | null;
}

export interface TaskMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskListParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  customerId?: string;
  assignedUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type TaskFormData = {
  customerId?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  assignedUserId?: string;
};

export function useTask() {
  const { workspace } = useAuth();
  const { t } = useI18n();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<TaskMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (params?: TaskListParams) => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.priority) query.set('priority', params.priority);
      if (params?.category) query.set('category', params.category);
      if (params?.customerId) query.set('customerId', params.customerId);
      if (params?.assignedUserId) query.set('assignedUserId', params.assignedUserId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      const url = `/workspaces/${workspace.id}/tasks${qs ? `?${qs}` : ''}`;
      const res = await apiClient.get<{ data: Task[]; meta: TaskMeta }>(url);
      const body = res.data as { data: Task[]; meta: TaskMeta };
      setTasks(body.data ?? []);
      setMeta(body.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('task.message.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchTasks({ page: 1, limit: 20 });
  }, [workspace?.id]);

  const create = async (data: TaskFormData) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/tasks`, data);
      toast.success(t('task.message.addSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('task.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, data: Partial<TaskFormData>) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/tasks/${id}`, data);
      toast.success(t('task.message.updateSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('task.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/tasks/${id}`);
      toast.success(t('task.message.deleteSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('task.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  return {
    tasks,
    meta,
    isLoading,
    error,
    fetchTasks,
    create,
    update,
    delete: deleteTask,
  };
}

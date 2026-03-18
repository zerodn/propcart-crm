import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';
import { useI18n } from '@/providers/i18n-provider';

type DepartmentMemberOptionApi = {
  userId: string;
  displayName?: string;
  user?: {
    fullName?: string;
    phone?: string;
    email?: string;
  };
};

export interface DepartmentMember {
  departmentId: string;
  userId: string;
  roleId: string;
  user?: {
    id: string;
    phone?: string;
    email?: string;
  };
  workspaceMember?: {
    userId: string;
    displayName?: string;
    employeeCode?: string;
    workspacePhone?: string;
  } | null;
  role?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface DepartmentMemberOption {
  userId: string;
  displayName?: string;
  employeeCode?: string;
  phone?: string;
  email?: string;
}

export interface DepartmentRoleOption {
  id: string;
  code: string;
  name: string;
}

export interface ParentDepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  workspaceId: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string | null;
  parent?: { id: string; name: string; code: string } | null;
  status?: string | null;
  members?: DepartmentMember[];
}

export interface UseDepartmentReturn {
  departments: Department[];
  memberOptions: DepartmentMemberOption[];
  roleOptions: DepartmentRoleOption[];
  parentOptions: ParentDepartmentOption[];
  isLoading: boolean;
  error: string | null;
  create: (name: string, code: string, description?: string, parentId?: string, status?: string) => Promise<void>;
  update: (
    id: string,
    data: { name?: string; code?: string; description?: string; parentId?: string | null; status?: string },
  ) => Promise<void>;
  delete: (id: string) => Promise<void>;
  addMember: (departmentId: string, userId: string, roleId: string) => Promise<void>;
  removeMember: (departmentId: string, userId: string) => Promise<void>;
  updateMemberRole: (departmentId: string, userId: string, roleId: string) => Promise<void>;
  searchMembers: (query: string) => Promise<DepartmentMemberOption[]>;
  refetch: () => Promise<void>;
}

export function useDepartment(): UseDepartmentReturn {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [memberOptions, setMemberOptions] = useState<DepartmentMemberOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<DepartmentRoleOption[]>([]);
  const [parentOptions, setParentOptions] = useState<ParentDepartmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const [departmentRes, memberRes, roleRes, parentRes] = await Promise.all([
        apiClient.get<{ data: Department[] }>(`/workspaces/${workspace.id}/departments`),
        apiClient.get<{ data: DepartmentMemberOptionApi[] }>(
          `/workspaces/${workspace.id}/departments/member-options`,
        ),
        apiClient.get<{ data: DepartmentRoleOption[] }>(
          `/workspaces/${workspace.id}/departments/role-options`,
        ),
        apiClient.get<{ data: ParentDepartmentOption[] }>(
          `/workspaces/${workspace.id}/departments/parent-options`,
        ),
      ]);

      const items = Array.isArray(departmentRes?.data)
        ? departmentRes.data
        : (departmentRes?.data?.data ?? []);
      const members = Array.isArray(memberRes?.data)
        ? memberRes.data
        : (memberRes?.data?.data ?? []);
      const roles = Array.isArray(roleRes?.data) ? roleRes.data : (roleRes?.data?.data ?? []);
      const parents = Array.isArray(parentRes?.data)
        ? parentRes.data
        : (parentRes?.data?.data ?? []);

      setMemberOptions(
        (members || []).map((member: DepartmentMemberOptionApi) => ({
          userId: member.userId,
          displayName: member.displayName || member.user?.fullName,
          phone: member.user?.phone,
          email: member.user?.email,
        })),
      );
      setRoleOptions(roles || []);
      setParentOptions(parents || []);
      setDepartments(items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('departments.message.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [workspace?.id]);

  const create = async (name: string, code: string, description?: string, parentId?: string, status?: string) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/departments`, {
        name,
        code,
        description,
        parentId,
        status,
      });
      toast.success(t('departments.message.addSuccess'));
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('departments.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const update = async (
    id: string,
    data: { name?: string; code?: string; description?: string; parentId?: string | null; status?: string },
  ) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/departments/${id}`, data);
      toast.success(t('departments.message.updateSuccess'));
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('departments.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/departments/${id}`);
      toast.success(t('departments.message.deleteSuccess'));
      await fetchDepartments();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.includes('DEPARTMENT_NOT_EMPTY')
            ? t('departments.message.notEmpty')
            : err.message
          : t('departments.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  const addMember = async (departmentId: string, userId: string, roleId: string) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/departments/${departmentId}/members`, {
        userId,
        roleId,
      });
      toast.success(t('departments.membersDialog.message.addSuccess'));
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('departments.membersDialog.message.addError');
      toast.error(message);
      throw err;
    }
  };

  const removeMember = async (departmentId: string, userId: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(
        `/workspaces/${workspace.id}/departments/${departmentId}/members/${userId}`,
      );
      toast.success(t('departments.membersDialog.message.deleteSuccess'));
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('departments.membersDialog.message.deleteError');
      toast.error(message);
      throw err;
    }
  };

  const updateMemberRole = async (departmentId: string, userId: string, roleId: string) => {
    if (!workspace) return;
    try {
      await apiClient.patch(
        `/workspaces/${workspace.id}/departments/${departmentId}/members/${userId}/role`,
        { roleId },
      );
      toast.success(t('departments.membersDialog.message.updateSuccess'));
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('departments.membersDialog.message.updateError');
      toast.error(message);
      throw err;
    }
  };

  const searchMembers = async (query: string): Promise<DepartmentMemberOption[]> => {
    if (!workspace || !query.trim()) return [];
    try {
      const res = await apiClient.get<{ data: (DepartmentMemberOption & { name?: string; employeeCode?: string })[] }>(
        `/workspaces/${workspace.id}/departments/member-search?q=${encodeURIComponent(query)}`,
      );
      const results = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
      return results.map((member) => ({
        userId: member.userId,
        displayName: member.displayName || member.name,
        employeeCode: member.employeeCode,
        phone: member.phone,
        email: member.email,
      }));
    } catch (err) {
      console.error('Member search error:', err);
      return [];
    }
  };

  return {
    departments,
    memberOptions,
    roleOptions,
    parentOptions,
    isLoading,
    error,
    create,
    update,
    delete: deleteItem,
    addMember,
    removeMember,
    updateMemberRole,
    searchMembers,
    refetch: fetchDepartments,
  };
}

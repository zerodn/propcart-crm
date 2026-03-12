import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';

type DepartmentMemberOptionApi = {
  userId: string;
  user?: {
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
  role?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface DepartmentMemberOption {
  userId: string;
  phone?: string;
  email?: string;
}

export interface DepartmentRoleOption {
  id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  workspaceId: string;
  code: string;
  name: string;
  description?: string;
  members?: DepartmentMember[];
}

export interface UseDepartmentReturn {
  departments: Department[];
  memberOptions: DepartmentMemberOption[];
  roleOptions: DepartmentRoleOption[];
  isLoading: boolean;
  error: string | null;
  create: (name: string, code: string, description?: string) => Promise<void>;
  update: (
    id: string,
    data: { name?: string; code?: string; description?: string },
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [memberOptions, setMemberOptions] = useState<DepartmentMemberOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<DepartmentRoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const [departmentRes, memberRes, roleRes] = await Promise.all([
        apiClient.get<{ data: Department[] }>(`/workspaces/${workspace.id}/departments`),
        apiClient.get<{ data: DepartmentMemberOptionApi[] }>(
          `/workspaces/${workspace.id}/departments/member-options`,
        ),
        apiClient.get<{ data: DepartmentRoleOption[] }>(
          `/workspaces/${workspace.id}/departments/role-options`,
        ),
      ]);

      const items = Array.isArray(departmentRes?.data)
        ? departmentRes.data
        : (departmentRes?.data?.data ?? []);
      const members = Array.isArray(memberRes?.data)
        ? memberRes.data
        : (memberRes?.data?.data ?? []);
      const roles = Array.isArray(roleRes?.data) ? roleRes.data : (roleRes?.data?.data ?? []);

      setMemberOptions(
        (members || []).map((member: DepartmentMemberOptionApi) => ({
          userId: member.userId,
          phone: member.user?.phone,
          email: member.user?.email,
        })),
      );
      setRoleOptions(roles || []);
      setDepartments(items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải phòng ban';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [workspace?.id]);

  const create = async (name: string, code: string, description?: string) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/departments`, {
        name,
        code,
        description,
      });
      toast.success('Thêm phòng ban thành công');
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể thêm phòng ban';
      toast.error(message);
      throw err;
    }
  };

  const update = async (
    id: string,
    data: { name?: string; code?: string; description?: string },
  ) => {
    if (!workspace) return;
    try {
      await apiClient.patch(`/workspaces/${workspace.id}/departments/${id}`, data);
      toast.success('Cập nhật phòng ban thành công');
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật phòng ban';
      toast.error(message);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(`/workspaces/${workspace.id}/departments/${id}`);
      toast.success('Xóa phòng ban thành công');
      await fetchDepartments();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.includes('DEPARTMENT_NOT_EMPTY')
            ? 'Không thể xóa phòng ban có nhân sự'
            : err.message
          : 'Không thể xóa phòng ban';
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
      toast.success('Thêm nhân sự vào phòng ban thành công');
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể thêm nhân sự';
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
      toast.success('Xóa nhân sự thành công');
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa nhân sự';
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
      toast.success('Cập nhật quyền thành công');
      await fetchDepartments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật quyền';
      toast.error(message);
      throw err;
    }
  };

  const searchMembers = async (query: string): Promise<DepartmentMemberOption[]> => {
    if (!workspace || !query.trim()) return [];
    try {
      const res = await apiClient.get<{ data: DepartmentMemberOption[] }>(
        `/workspaces/${workspace.id}/departments/member-search?q=${encodeURIComponent(query)}`,
      );
      const results = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
      return results.map((member: DepartmentMemberOption) => ({
        userId: member.userId,
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

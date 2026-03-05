import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuth } from './use-auth';

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UsePermissionsReturn {
  roles: RoleWithPermissions[];
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  assignPermission: (roleId: string, permissionId: string) => Promise<void>;
  removePermission: (roleId: string, permissionId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { workspace } = useAuth();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!workspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get<{ data: Role[] }>(`/workspaces/${workspace.id}/roles`),
        apiClient.get<{ data: Permission[] }>(`/workspaces/${workspace.id}/permissions`),
      ]);

      const rolesData = Array.isArray(rolesRes?.data)
        ? rolesRes.data
        : (rolesRes?.data?.data ?? []);
      const permsData = Array.isArray(permsRes?.data)
        ? permsRes.data
        : (permsRes?.data?.data ?? []);

      // TODO: Fetch role-permission associations from a dedicated endpoint
      // For now, assume empty permissions per role
      const rolesWithPerms: RoleWithPermissions[] = rolesData.map((role: Role) => ({
        ...role,
        permissions: [],
      }));

      setRoles(rolesWithPerms);
      setPermissions(permsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspace?.id]);

  const assignPermission = async (roleId: string, permissionId: string) => {
    if (!workspace) return;
    try {
      await apiClient.post(`/workspaces/${workspace.id}/permissions/roles/${roleId}`, {
        permissionId,
      });
      toast.success('Gán quyền thành công');
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể gán quyền';
      toast.error(message);
      throw err;
    }
  };

  const removePermission = async (roleId: string, permissionId: string) => {
    if (!workspace) return;
    try {
      await apiClient.delete(
        `/workspaces/${workspace.id}/permissions/roles/${roleId}/${permissionId}`,
      );
      toast.success('Xóa quyền thành công');
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa quyền';
      toast.error(message);
      throw err;
    }
  };

  return {
    roles,
    permissions,
    isLoading,
    error,
    assignPermission,
    removePermission,
    refetch: fetchData,
  };
}

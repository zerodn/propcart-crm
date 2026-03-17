'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  roleId: string;
  status: number;
  joinedAt: string;
  employeeCode?: string | null; // Mã nhân viên tự sinh
  displayName?: string | null; // Workspace-scoped display name
  workspaceEmail?: string | null; // Workspace-scoped email
  workspacePhone?: string | null; // Workspace-scoped phone
  avatarUrl?: string | null; // Workspace-scoped avatar
  gender?: string | null; // Giới tính
  dateOfBirth?: string | null; // Ngày sinh
  workspaceCity?: string | null; // Thành phố/Tỉnh
  workspaceAddress?: string | null; // Phường/Xã
  addressLine?: string | null; // Địa chỉ cụ thể
  contractType?: string | null; // Loại HĐLĐ
  attachmentUrl?: string | null; // Tệp đính kèm
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    fullName: string | null;
  };
  role: {
    id: string;
    code: string;
    name: string;
  };
}

export function useWorkspaceMembers(workspaceId?: string, search?: string) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      const url = `/workspaces/${workspaceId}/members${params.toString() ? `?${params.toString()}` : ''}`;
      const { data } = await apiClient.get(url);
      setMembers(data.data ?? []);
    } catch {
      setError('Không thể tải danh sách nhân sự');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [workspaceId, search]);

  return { members, isLoading, error, refetch };
}

export function useWorkspaceRoles(workspaceId?: string) {
  const [roles, setRoles] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!workspaceId) return;
      try {
        const { data } = await apiClient.get(`/workspaces/${workspaceId}/roles`);
        // Extract roles from response (handle both data.data and direct data array)
        const rolesList = Array.isArray(data) ? data : (data?.data ?? []);
        console.log('[useWorkspaceRoles] Fetched roles:', rolesList);
        setRoles(rolesList);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, [workspaceId]);

  return { roles, isLoading };
}

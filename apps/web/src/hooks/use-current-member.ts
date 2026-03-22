'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

export interface CurrentMemberInfo {
  id: string;
  userId: string;
  workspaceId: string;
  roleId: string;
  status: number;
  joinedAt: string;
  displayName: string | null;
  workspaceEmail: string | null;
  workspacePhone: string | null;
  avatarUrl: string | null;
  employeeCode: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  workspaceCity: string | null;
  workspaceAddress: string | null;
  addressLine: string | null;
  contractType: string | null;
  employmentStatus: string | null;
  attachmentUrl: string | null;
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

export function useCurrentMember(workspaceId?: string) {
  const [member, setMember] = useState<CurrentMemberInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setMember(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    apiClient
      .get(`/workspaces/${workspaceId}/members/me`)
      .then(({ data }) => {
        if (!cancelled) setMember(data.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setMember(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return { member, isLoading };
}

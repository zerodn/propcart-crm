import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import type { User } from '@/types';

export interface UpdateProfilePayload {
  fullName?: string;
  addressLine?: string;
  email?: string;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/me/profile');
      setProfile(data?.data ?? null);
    } catch {
      toast.error('Khong the tai thong tin ca nhan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    setIsSaving(true);
    try {
      const { data } = await apiClient.patch('/me/profile', payload);
      setProfile(data?.data ?? null);
      toast.success('Da cap nhat thong tin ca nhan');
      return data?.data ?? null;
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === 'EMAIL_ALREADY_EXISTS') {
        toast.error('Email nay da duoc su dung');
      } else {
        toast.error('Khong the cap nhat thong tin');
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const sendEmailVerification = useCallback(async () => {
    try {
      await apiClient.post('/me/profile/email/send-verification');
      toast.success('Da gui email xac thuc. Vui long kiem tra hop thu');
    } catch {
      toast.error('Khong the gui email xac thuc');
      throw new Error('send-verification-failed');
    }
  }, []);

  return {
    profile,
    isLoading,
    isSaving,
    refetch,
    updateProfile,
    sendEmailVerification,
  };
}

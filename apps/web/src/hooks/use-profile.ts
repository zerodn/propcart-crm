import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import type { User, UserDocument } from '@/types';

export const DOCUMENT_TYPE_OPTIONS = ['ALL', 'CCCD', 'HDLD', 'CHUNG_CHI', 'OTHER'] as const;
export type DocumentTypeOption = (typeof DOCUMENT_TYPE_OPTIONS)[number];
export type DocumentTypeValue = Exclude<DocumentTypeOption, 'ALL'>;

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
  avatarUrl?: string;
  gender?: string;
  dateOfBirth?: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDocumentType, setActiveDocumentType] = useState<DocumentTypeOption>('ALL');

  const fetchDocuments = useCallback(async (documentType: DocumentTypeOption) => {
    const query = documentType !== 'ALL' ? `?documentType=${documentType}` : '';
    const documentsRes = await apiClient.get(`/me/profile/documents${query}`);
    setDocuments(documentsRes.data?.data ?? []);
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes] = await Promise.all([
        apiClient.get('/me/profile'),
      ]);
      setProfile(profileRes.data?.data ?? null);
      await fetchDocuments(activeDocumentType);
    } catch {
      toast.error('Khong the tai thong tin ca nhan');
    } finally {
      setIsLoading(false);
    }
  }, [activeDocumentType, fetchDocuments]);

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
      const message = error?.response?.data?.message;
      
      console.error('Update profile error:', {
        code,
        message,
        status: error?.response?.status,
        data: error?.response?.data,
        payload,
      });
      
      if (code === 'EMAIL_ALREADY_EXISTS') {
        toast.error('Email nay da duoc su dung');
      } else if (message && Array.isArray(message)) {
        // Validation errors from class-validator
        toast.error(`Loi: ${message.join(', ')}`);
      } else {
        toast.error(message || 'Khong the cap nhat thong tin');
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

  const uploadDocument = useCallback(async (file: File, documentType: DocumentTypeValue) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    try {
      const { data } = await apiClient.post('/me/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const document = data?.data as UserDocument;
      await fetchDocuments(activeDocumentType);
      toast.success('Tai lieu da duoc tai len');
      return document;
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === 'FILE_TOO_LARGE') {
        toast.error('File qua lon (toi da 20MB)');
      } else if (code === 'FILE_TYPE_INVALID') {
        toast.error('Chi ho tro PDF, DOC, DOCX, PNG, JPG');
      } else if (code === 'DOCUMENT_UPLOAD_FAILED') {
        toast.error('Khong the ket noi MinIO de tai file len. Vui long kiem tra cau hinh MinIO');
      } else {
        toast.error('Khong the tai tai lieu len');
      }
      throw error;
    }
  }, [activeDocumentType, fetchDocuments]);

  const updateDocumentType = useCallback(
    async (documentId: string, documentType: DocumentTypeValue) => {
      try {
        await apiClient.patch(`/me/profile/documents/${documentId}/type`, { documentType });
        await fetchDocuments(activeDocumentType);
        toast.success('Da cap nhat loai tai lieu');
      } catch {
        toast.error('Khong the cap nhat loai tai lieu');
        throw new Error('update-document-type-failed');
      }
    },
    [activeDocumentType, fetchDocuments],
  );

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      await apiClient.delete(`/me/profile/documents/${documentId}`);
      await fetchDocuments(activeDocumentType);
      toast.success('Da xoa tai lieu');
    } catch {
      toast.error('Khong the xoa tai lieu');
      throw new Error('delete-document-failed');
    }
  }, [activeDocumentType, fetchDocuments]);

  const setDocumentTypeFilter = useCallback(
    async (documentType: DocumentTypeOption) => {
      setActiveDocumentType(documentType);
      try {
        await fetchDocuments(documentType);
      } catch {
        toast.error('Khong the loc tai lieu theo loai');
      }
    },
    [fetchDocuments],
  );

  const downloadDocument = useCallback(async (document: UserDocument) => {
    try {
      const response = await apiClient.get(document.downloadUrl, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = document.fileName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Khong the tai tai lieu xuong');
      throw new Error('download-document-failed');
    }
  }, []);

  const fetchDocumentBlob = useCallback(async (document: UserDocument) => {
    const response = await apiClient.get(document.downloadUrl, { responseType: 'blob' });
    return response.data as Blob;
  }, []);

  return {
    profile,
    documents,
    isLoading,
    isSaving,
    refetch,
    updateProfile,
    sendEmailVerification,
    uploadDocument,
    updateDocumentType,
    deleteDocument,
    downloadDocument,
    fetchDocumentBlob,
    activeDocumentType,
    setDocumentTypeFilter,
  };
}

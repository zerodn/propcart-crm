'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  UserPlus,
  Upload,
  FileText,
  Trash2,
  Eye,
  Download,
  X,
  Camera,
  User,
  Plus,
  Building2,
} from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import { DocumentListPanel } from '@/components/common/document-list-panel';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';

interface AttachmentDocument {
  id: string;
  fileName: string;
  documentType: 'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER';
  downloadUrl: string;
  createdAt?: string;
  fileSize?: number;
}

interface LocationItem {
  code: number;
  name: string;
}

interface MemberAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  availableRoles?: Array<{ id: string; code: string; name: string }> | null;
}

export function MemberAddDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  availableRoles = [],
}: MemberAddDialogProps) {
  // Basic info state
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [workspacePhone, setWorkspacePhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [contractType, setContractType] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [wardName, setWardName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Document state
  const [attachmentDocuments, setAttachmentDocuments] = useState<AttachmentDocument[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isLoadingAttachmentDocuments, setIsLoadingAttachmentDocuments] = useState(false);
  const [updatingAttachmentTypes, setUpdatingAttachmentTypes] = useState<Record<string, boolean>>({});
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<Set<string>>(new Set());
  const [downloadingDocIds, setDownloadingDocIds] = useState<Set<string>>(new Set());

  // Department state (pending assignments applied after member creation)
  type PendingDeptAssignment = {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    roleId: string;
    roleName: string;
  };
  const [allDepartments, setAllDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [deptRoleOptions, setDeptRoleOptions] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [pendingDepts, setPendingDepts] = useState<PendingDeptAssignment[]>([]);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptId, setNewDeptId] = useState('');
  const [newDeptRoleId, setNewDeptRoleId] = useState('');
  const [isDeptLoading, setIsDeptLoading] = useState(false);

  // Location & catalog state
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [wardLoading, setWardLoading] = useState(false);
  const [hdldOptions, setHdldOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<Array<{ value: string; label: string }>>([]);

  const { t } = useI18n();
  const rolesArray = Array.isArray(availableRoles) ? availableRoles : [];
  const availableDepartments = allDepartments.filter(
    (d) => !pendingDepts.some((a) => a.departmentId === d.id),
  );

  // Load provinces
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/?depth=1')
      .then((r) => r.json())
      .then((list: LocationItem[]) => setProvinces(list || []))
      .catch(() => setProvinces([]));
  }, []);

  // Load wards when province changes
  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      return;
    }
    setWardLoading(true);
    fetch(`https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((payload: { wards?: LocationItem[] }) => {
        setWards((payload.wards || []).map((w) => ({ code: w.code, name: w.name })));
      })
      .catch(() => setWards([]))
      .finally(() => setWardLoading(false));
  }, [provinceCode]);

  // Set default role when roles load
  useEffect(() => {
    if (rolesArray.length > 0 && !roleId) {
      const salesRole = rolesArray.find((r) => r.code === 'SALES');
      setRoleId(salesRole?.id || rolesArray[0].id);
    }
  }, [rolesArray]);

  // Load HDLD_TYPE and EMPLOYMENT_STATUS catalog options
  useEffect(() => {
    const loadCatalogOptions = async () => {
      try {
        const [hdldRes, empRes] = await Promise.all([
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=HDLD_TYPE`),
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=EMPLOYMENT_STATUS`),
        ]);

        const findValues = (res: { data: { data?: unknown[] } }, code: string) => {
          const catalogs = Array.isArray(res.data?.data) ? res.data.data : [];
          const catalog = catalogs.find((c: unknown) => (c as Record<string, unknown>).code === code);
          if (catalog && Array.isArray((catalog as Record<string, unknown>).values)) {
            return (catalog as { values: Array<{ value: string; label: string }> }).values.map(
              (v) => ({ value: v.value, label: v.label }),
            );
          }
          return [];
        };

        setHdldOptions(findValues(hdldRes, 'HDLD_TYPE'));
        setEmploymentStatusOptions(findValues(empRes, 'EMPLOYMENT_STATUS'));
      } catch {
        setHdldOptions([]);
        setEmploymentStatusOptions([]);
      }
    };
    if (workspaceId) loadCatalogOptions();
  }, [workspaceId]);

  // Load departments and role options
  useEffect(() => {
    if (!workspaceId) return;
    setIsDeptLoading(true);
    Promise.all([
      apiClient.get(`/workspaces/${workspaceId}/departments`),
      apiClient.get(`/workspaces/${workspaceId}/departments/role-options`),
    ])
      .then(([deptListRes, roleOptRes]) => {
        const depts = Array.isArray(deptListRes.data)
          ? deptListRes.data
          : Array.isArray(deptListRes.data?.data)
            ? deptListRes.data.data
            : [];
        setAllDepartments(
          depts.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            name: d.name as string,
            code: (d.code as string) || '',
          })),
        );
        const roleOpts = Array.isArray(roleOptRes.data)
          ? roleOptRes.data
          : Array.isArray(roleOptRes.data?.data)
            ? roleOptRes.data.data
            : [];
        setDeptRoleOptions(
          roleOpts.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            code: (r.code as string) || '',
          })),
        );
      })
      .catch(() => {
        setAllDepartments([]);
        setDeptRoleOptions([]);
      })
      .finally(() => setIsDeptLoading(false));
  }, [workspaceId]);

  // Reset form + load existing documents when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setDisplayName('');
      setWorkspaceEmail('');
      setWorkspacePhone('');
      setContractType('');
      setEmploymentStatus('');
      setProvinceCode('');
      setProvinceName('');
      setWardCode('');
      setWardName('');
      setAddressLine('');
      setAvatarUrl('');
      setAvatarFile(null);
      setAttachmentUrl('');
      setPendingDepts([]);
      setIsAddingDept(false);
      setNewDeptId('');
      setNewDeptRoleId('');
      if (rolesArray.length > 0) {
        const salesRole = rolesArray.find((r) => r.code === 'SALES');
        setRoleId(salesRole?.id || rolesArray[0].id);
      }

      // Load existing user documents
      const loadDocs = async () => {
        setIsLoadingAttachmentDocuments(true);
        try {
          const response = await apiClient.get('/me/profile/documents');
          const docs = Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response?.data)
              ? response.data
              : [];
          const normalizedDocs: AttachmentDocument[] = docs
            .filter((doc: Record<string, unknown>) => doc?.id && doc?.downloadUrl)
            .map((doc: Record<string, unknown>) => ({
              id: doc.id as string,
              fileName: (doc.fileName as string | undefined) || 'Tệp đính kèm',
              documentType: ((doc.documentType as string | undefined) || 'OTHER') as AttachmentDocument['documentType'],
              downloadUrl: doc.downloadUrl as string,
              createdAt: doc.createdAt as string,
              fileSize: doc.fileSize as number | undefined,
            }));
          setAttachmentDocuments(normalizedDocs);
        } catch {
          setAttachmentDocuments([]);
        } finally {
          setIsLoadingAttachmentDocuments(false);
        }
      };
      loadDocs();
    }
  }, [isOpen]);

  const handleProvinceChange = (code: string) => {
    const prov = provinces.find((p) => String(p.code) === code);
    setProvinceCode(code);
    setProvinceName(prov?.name || '');
    setWardCode('');
    setWardName('');
  };

  const handleWardChange = (code: string) => {
    const w = wards.find((w) => String(w.code) === code);
    setWardCode(code);
    setWardName(w?.name || '');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('memberEdit.validation.imageFormat'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('memberEdit.validation.imageTooLarge'));
      return;
    }
    setAvatarUrl(URL.createObjectURL(file));
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl('');
    setAvatarFile(null);
  };

  const handleUploadAttachment = async (file: File, documentType: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      const { data } = await apiClient.post('/me/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = data?.data;
      const downloadUrl = uploaded?.downloadUrl;
      const fileName = uploaded?.fileName || file.name;
      if (downloadUrl) {
        setAttachmentUrl(downloadUrl);
        if (uploaded?.id) {
          const newDoc: AttachmentDocument = {
            id: uploaded.id,
            fileName,
            documentType: (uploaded.documentType || documentType) as AttachmentDocument['documentType'],
            downloadUrl,
            createdAt: uploaded.createdAt,
            fileSize: uploaded.fileSize,
          };
          setAttachmentDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== uploaded.id)]);
        }
        toast.success(t('memberEdit.notification.fileUploaded'));
      } else {
        toast.error(t('memberEdit.error.attachmentFailed'));
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { code?: string } } };
      const code = apiError.response?.data?.code;
      if (code === 'FILE_TOO_LARGE') {
        toast.error(t('document.supportedFormats'));
      } else if (code === 'FILE_TYPE_INVALID') {
        toast.error(t('document.unsupportedFormat'));
      } else {
        toast.error(t('memberEdit.error.attachmentFailed'));
      }
    }
  };

  const handleRenameAttachment = async (documentId: string, fileName: string) => {
    try {
      await apiClient.patch(`/me/profile/documents/${documentId}/name`, { fileName });
      setAttachmentDocuments((prev) =>
        prev.map((d) => (d.id === documentId ? { ...d, fileName } : d)),
      );
      toast.success('Đã đổi tên tài liệu');
    } catch {
      toast.error('Không thể đổi tên tài liệu');
      throw new Error('rename-failed');
    }
  };

  const handleUpdateAttachmentType = async (
    documentId: string,
    newType: AttachmentDocument['documentType'],
  ) => {
    setUpdatingAttachmentTypes((prev) => ({ ...prev, [documentId]: true }));
    try {
      await apiClient.patch(`/me/profile/documents/${documentId}/type`, { documentType: newType });
      setAttachmentDocuments((prev) =>
        prev.map((doc) => (doc.id === documentId ? { ...doc, documentType: newType } : doc)),
      );
      toast.success('Đã cập nhật loại tài liệu');
    } catch {
      toast.error('Không thể cập nhật loại tài liệu');
    } finally {
      setUpdatingAttachmentTypes((prev) => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingAttachmentIds((prev) => new Set([...prev, documentId]));
    try {
      await apiClient.delete(`/me/profile/documents/${documentId}`);
      setAttachmentDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success('Đã xóa tài liệu');
    } catch {
      toast.error('Không thể xóa tài liệu');
    } finally {
      setDeletingAttachmentIds((prev) => {
        const updated = new Set(prev);
        updated.delete(documentId);
        return updated;
      });
    }
  };

  const handleDownloadDocument = async (doc: AttachmentDocument) => {
    try {
      setDownloadingDocIds((prev) => new Set([...prev, doc.id]));
      const response = await apiClient.get(doc.downloadUrl, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('memberEdit.notification.fileDownloaded'));
    } catch {
      toast.error(t('memberEdit.error.attachmentFailed'));
    } finally {
      setDownloadingDocIds((prev) => {
        const updated = new Set(prev);
        updated.delete(doc.id);
        return updated;
      });
    }
  };

  const handleAddDeptConfirm = () => {
    if (!newDeptId || !newDeptRoleId) return;
    const dept = allDepartments.find((d) => d.id === newDeptId);
    const role = deptRoleOptions.find((r) => r.id === newDeptRoleId);
    if (!dept || !role) return;
    setPendingDepts((prev) => [
      ...prev,
      {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        roleId: role.id,
        roleName: role.name,
      },
    ]);
    setIsAddingDept(false);
    setNewDeptId('');
    setNewDeptRoleId('');
  };

  const handleRemovePendingDept = (departmentId: string) => {
    setPendingDepts((prev) => prev.filter((d) => d.departmentId !== departmentId));
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error(t('memberAdd.validation.phoneRequired'));
      return;
    }
    if (!roleId) {
      toast.error(t('memberAdd.validation.roleRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Create member
      const res = await apiClient.post(`/workspaces/${workspaceId}/members`, {
        phone: phone.trim(),
        roleId,
        displayName: displayName.trim() || undefined,
        workspaceEmail: workspaceEmail.trim() || undefined,
        workspacePhone: workspacePhone.trim() || undefined,
        contractType: contractType || undefined,
        employmentStatus: employmentStatus || undefined,
        workspaceCity: provinceName || undefined,
        workspaceAddress: wardName || undefined,
        addressLine: addressLine.trim() || undefined,
      });
      const newMember = res.data?.data || res.data;
      const newMemberId: string | undefined = newMember?.id;
      const newUserId: string | undefined = newMember?.userId;

      // Step 2: Upload avatar
      if (avatarFile && newMemberId) {
        setIsUploadingAvatar(true);
        try {
          const formData = new FormData();
          formData.append('avatar', avatarFile);
          await apiClient.post(
            `/workspaces/${workspaceId}/members/${newMemberId}/upload-avatar`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );
        } catch {
          toast.error(t('memberEdit.error.uploadFailed'));
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      // Step 3: Assign pending departments
      if (pendingDepts.length > 0 && newUserId) {
        await Promise.allSettled(
          pendingDepts.map((d) =>
            apiClient.post(`/workspaces/${workspaceId}/departments/${d.departmentId}/members`, {
              userId: newUserId,
              roleId: d.roleId,
            }),
          ),
        );
      }

      toast.success(t('memberAdd.message.success'));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { code?: string; message?: string } } };
      const code = apiError.response?.data?.code;
      if (code === 'EMAIL_ALREADY_EXISTS') {
        toast.error(apiError.response?.data?.message || t('memberAdd.validation.emailUsed'));
      } else if (code === 'ALREADY_MEMBER') {
        toast.error(apiError.response?.data?.message || t('memberAdd.validation.alreadyMember'));
      } else {
        toast.error(apiError.response?.data?.message || t('memberAdd.message.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('memberAdd.dialog.title')}
      maxWidth="5xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="member-add-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {t('memberAdd.dialog.title')}
          </button>
        </>
      }
    >
      <form id="member-add-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Info note */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">{t('memberAdd.label.findUserByPhone')}</p>
        </div>

        <div className="space-y-[0.8rem]">
          <div className="border border-gray-200 rounded-xl p-4 space-y-[0.8rem]">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {t('memberEdit.label.workspaceInfoSection')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">{t('memberEdit.label.workspaceInfoNote')}</p>
            </div>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('memberEdit.label.avatarInWorkspace')}
                </label>
                <div className="flex gap-2">
                  <label
                    htmlFor="avatar-upload-add"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {avatarUrl ? t('memberEdit.label.changeAvatar') : t('memberEdit.label.uploadAvatar')}
                  </label>
                  <input
                    id="avatar-upload-add"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('memberEdit.label.removeAvatar')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('memberEdit.label.imageHint')}</p>
              </div>
            </div>

            {/* Basic info section */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('memberEdit.label.basicInfo')}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone (required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberAdd.label.phone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('memberAdd.label.phonePlaceholder')}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                    autoFocus
                    required
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberAdd.label.displayName')}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('memberAdd.label.displayNamePlaceholder')}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                {/* Workspace Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.workspaceEmail')}
                  </label>
                  <input
                    type="email"
                    value={workspaceEmail}
                    onChange={(e) => setWorkspaceEmail(e.target.value)}
                    placeholder={t('memberAdd.label.workspaceEmailPlaceholder')}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                {/* Workspace Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.workspacePhone')}
                  </label>
                  <input
                    type="tel"
                    value={workspacePhone}
                    onChange={(e) => setWorkspacePhone(e.target.value)}
                    placeholder={t('memberAdd.label.phonePlaceholder')}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                {/* Role (required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.roleInWorkspace')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    {rolesArray.length === 0 && (
                      <option value="">{t('memberAdd.label.loadingRoles')}</option>
                    )}
                    {rolesArray.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.employment')}
                  </label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    <option value="">-- {t('memberAdd.label.selectContractType')} --</option>
                    {hdldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('members.employmentStatus.label')}
                  </label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    <option value="">-- {t('members.employmentStatus.unknown')} --</option>
                    {employmentStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Personal info section */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('memberEdit.label.personalInfo')}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberAdd.label.province')}
                  </label>
                  <select
                    value={provinceCode}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    <option value="">{t('memberAdd.label.provincePlaceholder')}</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={String(p.code)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ward */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberAdd.label.ward')}
                  </label>
                  <select
                    value={wardCode}
                    onChange={(e) => handleWardChange(e.target.value)}
                    disabled={isSubmitting || !provinceCode || wardLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    <option value="">
                      {wardLoading ? t('common.loading') : t('memberAdd.label.wardPlaceholder')}
                    </option>
                    {wards.map((w) => (
                      <option key={w.code} value={String(w.code)}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('memberAdd.label.addressLine')}
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder={t('memberAdd.label.addressLinePlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Department assignments section */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Phòng ban
                  </h5>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Nhân sự có thể thuộc nhiều phòng ban với vai trò khác nhau
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingDept(true);
                    setNewDeptId(availableDepartments[0]?.id || '');
                    setNewDeptRoleId(deptRoleOptions[0]?.id || '');
                  }}
                  disabled={isAddingDept || availableDepartments.length === 0 || isDeptLoading}
                  title={
                    availableDepartments.length === 0 && !isAddingDept
                      ? 'Đã chọn tất cả phòng ban có sẵn'
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0B1F3A] bg-[#F5F7FA] border border-[#CFAF6E]/40 rounded-lg hover:bg-[#CFAF6E]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm phòng ban
                </button>
              </div>

              {isDeptLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingDepts.length === 0 && !isAddingDept && (
                    <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-3">
                      Chưa chọn phòng ban nào
                    </p>
                  )}
                  {pendingDepts.map((a) => (
                    <div
                      key={a.departmentId}
                      className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {a.departmentName}
                        </p>
                        {a.departmentCode && (
                          <p className="text-xs text-gray-500">{a.departmentCode}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-600">
                        {a.roleName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingDept(a.departmentId)}
                        className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {isAddingDept && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F7FA] border border-[#CFAF6E]/40 rounded-lg">
                      <Building2 className="h-4 w-4 text-[#CFAF6E] flex-shrink-0" />
                      <select
                        value={newDeptId}
                        onChange={(e) => setNewDeptId(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        {availableDepartments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={newDeptRoleId}
                        onChange={(e) => setNewDeptRoleId(e.target.value)}
                        className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                      >
                        <option value="">-- Chọn vai trò --</option>
                        {deptRoleOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddDeptConfirm}
                        disabled={!newDeptId || !newDeptRoleId}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-[#CFAF6E] rounded-md hover:bg-[#B89655] disabled:opacity-50 transition-colors"
                      >
                        Xác nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingDept(false);
                          setNewDeptId('');
                          setNewDeptRoleId('');
                        }}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Documents section */}
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('memberEdit.label.documents')}
                </h5>
                <p className="text-xs text-gray-500 mt-1">{t('memberEdit.label.documentsHint')}</p>
              </div>
              <DocumentListPanel
                documents={attachmentDocuments}
                isLoading={isLoadingAttachmentDocuments}
                disabled={isSubmitting}
                onUpload={handleUploadAttachment}
                onDelete={(docId) => handleDeleteDocument(docId)}
                deletingIds={deletingAttachmentIds}
                onUpdateType={(docId, type) =>
                  void handleUpdateAttachmentType(
                    docId,
                    type as AttachmentDocument['documentType'],
                  )
                }
                updatingTypeIds={updatingAttachmentTypes}
                onRename={handleRenameAttachment}
                onFetchPreview={async (doc) => {
                  const response = await apiClient.get(
                    (doc as AttachmentDocument).downloadUrl,
                    { responseType: 'blob' },
                  );
                  const blob = response.data as Blob;
                  return { url: URL.createObjectURL(blob), mimeType: blob.type || '' };
                }}
                onDownload={(doc) => void handleDownloadDocument(doc as AttachmentDocument)}
                downloadingIds={downloadingDocIds}
              />
            </div>
          </div>
        </div>
      </form>

    </BaseDialog>
  );
}

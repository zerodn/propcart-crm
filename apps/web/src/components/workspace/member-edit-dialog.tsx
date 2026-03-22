'use client';

import { useState, useEffect } from 'react';
import { Loader2, Upload, FileText, Trash2, Eye, Download, X, Camera, User, Plus, Building2 } from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
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

interface MemberEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  member: {
    id: string;
    userId: string;
    roleId: string;
    status: number;
    employeeCode?: string | null;
    displayName?: string | null;
    workspaceEmail?: string | null;
    workspacePhone?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    workspaceCity?: string | null;
    workspaceAddress?: string | null;
    addressLine?: string | null;
    contractType?: string | null;
    attachmentUrl?: string | null;
    employmentStatus?: string | null;
    avatarUrl?: string | null;
    user: {
      phone: string | null;
      email: string | null;
      fullName: string | null;
    };
    role: {
      id: string;
      code: string;
      name: string;
    };
  };
  availableRoles?: Array<{ id: string; code: string; name: string }> | null;
}

export function MemberEditDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  member,
  availableRoles = [],
}: MemberEditDialogProps) {
  const [roleId, setRoleId] = useState(member.roleId);
  const [status, setStatus] = useState(member.status);
  const [displayName, setDisplayName] = useState(member.displayName || member.user.fullName || '');
  const [contractType, setContractType] = useState(member.contractType || '');
  const [employmentStatus, setEmploymentStatus] = useState(member.employmentStatus || '');
  const [workspaceEmail, setWorkspaceEmail] = useState(
    member.workspaceEmail || member.user.email || '',
  );
  const [workspacePhone, setWorkspacePhone] = useState(
    member.workspacePhone || member.user.phone || '',
  );
  const [addressLine, setAddressLine] = useState(member.addressLine || '');
  const [locationData, setLocationData] = useState<LocationFormData>({
    provinceCode: member.workspaceCity || '',
    provinceName: member.workspaceCity || '',
    wardCode: '',
    wardName: member.workspaceAddress || '',
    gender: member.gender || '',
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
  });
  const [attachmentUrl, setAttachmentUrl] = useState(member.attachmentUrl || '');
  const [attachmentType, setAttachmentType] = useState<'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER'>(
    'OTHER',
  );
  const [hdldOptions, setHdldOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [accountStatusOptions, setAccountStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [attachmentDocuments, setAttachmentDocuments] = useState<AttachmentDocument[]>([]);
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoadingAttachmentDocuments, setIsLoadingAttachmentDocuments] = useState(false);
  const [updatingAttachmentTypes, setUpdatingAttachmentTypes] = useState<Record<string, boolean>>(
    {},
  );
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<Set<string>>(new Set());
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [downloadingDocIds, setDownloadingDocIds] = useState<Set<string>>(new Set());

  // Department assignment state
  type DeptAssignment = { departmentId: string; departmentName: string; departmentCode: string; roleId: string; roleCode: string; roleName: string };
  const [deptAssignments, setDeptAssignments] = useState<DeptAssignment[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(false);
  const [allDepartments, setAllDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [deptRoleOptions, setDeptRoleOptions] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptId, setNewDeptId] = useState('');
  const [newDeptRoleId, setNewDeptRoleId] = useState('');
  const [savingNewDept, setSavingNewDept] = useState(false);
  const [updatingDeptRole, setUpdatingDeptRole] = useState<Record<string, boolean>>({});
  const [removingDept, setRemovingDept] = useState<Record<string, boolean>>({});
  // Pending confirms: role change and remove
  const [pendingRoleChange, setPendingRoleChange] = useState<Record<string, string>>({}); // departmentId -> new roleId
  const [confirmingRemoveDept, setConfirmingRemoveDept] = useState<string | null>(null); // departmentId

  const rolesArray = Array.isArray(availableRoles) ? availableRoles : [];
  const { t } = useI18n();

  // Load HDLD_TYPE, EMPLOYMENT_STATUS, ACCOUNT_STATUS catalog options
  useEffect(() => {
    const loadCatalogOptions = async () => {
      try {
        const [hdldRes, empRes, accRes] = await Promise.all([
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=HDLD_TYPE`),
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=EMPLOYMENT_STATUS`),
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=ACCOUNT_STATUS`),
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
        setAccountStatusOptions(findValues(accRes, 'ACCOUNT_STATUS'));
      } catch {
        setHdldOptions([]);
        setEmploymentStatusOptions([]);
        setAccountStatusOptions([]);
      }
    };
    if (workspaceId) loadCatalogOptions();
  }, [workspaceId]);

  // Load department assignments + all departments + department role options
  const loadDepartmentData = async () => {
    if (!workspaceId || !member.id) return;
    setIsDeptLoading(true);
    try {
      const [assignRes, deptListRes, roleOptRes] = await Promise.all([
        apiClient.get(`/workspaces/${workspaceId}/members/${member.id}/departments`),
        apiClient.get(`/workspaces/${workspaceId}/departments`),
        apiClient.get(`/workspaces/${workspaceId}/departments/role-options`),
      ]);
      const assignments: DeptAssignment[] = Array.isArray(assignRes.data?.data) ? assignRes.data.data : [];
      setDeptAssignments(assignments);
      const depts = Array.isArray(deptListRes.data) ? deptListRes.data : (Array.isArray(deptListRes.data?.data) ? deptListRes.data.data : []);
      setAllDepartments(depts.map((d: Record<string, unknown>) => ({ id: d.id as string, name: d.name as string, code: (d.code as string) || '' })));
      const roleOpts = Array.isArray(roleOptRes.data) ? roleOptRes.data : (Array.isArray(roleOptRes.data?.data) ? roleOptRes.data.data : []);
      setDeptRoleOptions(roleOpts.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, code: (r.code as string) || '' })));
    } catch {
      setDeptAssignments([]);
    } finally {
      setIsDeptLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadDepartmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workspaceId, member.id]);

  // Departments not yet assigned to this member
  const availableDepartments = allDepartments.filter(
    (d) => !deptAssignments.some((a) => a.departmentId === d.id),
  );

  const handleAddDeptConfirm = async () => {
    if (!newDeptId || !newDeptRoleId) return;
    setSavingNewDept(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/departments/${newDeptId}/members`, {
        userId: member.userId,
        roleId: newDeptRoleId,
      });
      // Optimistically update deptAssignments immediately so availableDepartments recalculates
      const dept = allDepartments.find((d) => d.id === newDeptId);
      const role = deptRoleOptions.find((r) => r.id === newDeptRoleId);
      if (dept && role) {
        setDeptAssignments((prev) => [
          ...prev,
          { departmentId: dept.id, departmentName: dept.name, departmentCode: dept.code, roleId: role.id, roleCode: role.code, roleName: role.name },
        ]);
      }
      setIsAddingDept(false);
      setNewDeptId('');
      setNewDeptRoleId('');
      toast.success('Đã thêm vào phòng ban');
      // Reload in background to sync server state
      loadDepartmentData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; code?: string } } };
      const msg = apiErr.response?.data?.message || 'Không thể thêm vào phòng ban';
      toast.error(msg);
    } finally {
      setSavingNewDept(false);
    }
  };

  const handleUpdateDeptRole = async (departmentId: string, roleId: string) => {
    setPendingRoleChange((prev) => ({ ...prev, [departmentId]: '' }));
    setUpdatingDeptRole((prev) => ({ ...prev, [departmentId]: true }));
    try {
      await apiClient.patch(
        `/workspaces/${workspaceId}/departments/${departmentId}/members/${member.userId}/role`,
        { roleId },
      );
      setDeptAssignments((prev) =>
        prev.map((a) => {
          if (a.departmentId !== departmentId) return a;
          const role = deptRoleOptions.find((r) => r.id === roleId);
          return { ...a, roleId, roleCode: role?.code || '', roleName: role?.name || '' };
        }),
      );
      toast.success('Đã cập nhật vai trò — phiên đăng nhập của nhân sự đã được thu hồi');
    } catch {
      toast.error('Không thể cập nhật vai trò');
    } finally {
      setUpdatingDeptRole((prev) => ({ ...prev, [departmentId]: false }));
      setPendingRoleChange((prev) => { const n = { ...prev }; delete n[departmentId]; return n; });
    }
  };

  const handleRemoveFromDept = async (departmentId: string) => {
    setRemovingDept((prev) => ({ ...prev, [departmentId]: true }));
    setConfirmingRemoveDept(null);
    try {
      await apiClient.delete(
        `/workspaces/${workspaceId}/departments/${departmentId}/members/${member.userId}`,
      );
      setDeptAssignments((prev) => prev.filter((a) => a.departmentId !== departmentId));
      toast.success('Đã xóa khỏi phòng ban — phiên đăng nhập của nhân sự đã được thu hồi');
    } catch {
      toast.error('Không thể xóa khỏi phòng ban');
    } finally {
      setRemovingDept((prev) => ({ ...prev, [departmentId]: false }));
    }
  };

  useEffect(() => {
    console.log('[MemberEditDialog] availableRoles:', availableRoles);
    console.log('[MemberEditDialog] rolesArray:', rolesArray);
  }, [availableRoles]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (isOpen) {
      setRoleId(member.roleId);
      setStatus(member.status);
      setDisplayName(member.displayName || member.user.fullName || '');
      setContractType(member.contractType || '');
      setEmploymentStatus(member.employmentStatus || '');
      setWorkspaceEmail(member.workspaceEmail || member.user.email || '');
      setWorkspacePhone(member.workspacePhone || member.user.phone || '');
      setAddressLine(member.addressLine || '');
      setLocationData({
        provinceCode: member.workspaceCity || '',
        provinceName: member.workspaceCity || '',
        wardCode: '',
        wardName: member.workspaceAddress || '',
        gender: member.gender || '',
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
      });
      setAttachmentUrl(member.attachmentUrl || '');
      setAttachmentType('OTHER');
      setUpdatingAttachmentTypes({});

      const loadAttachmentDocuments = async () => {
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
              fileName: (doc.fileName as string | undefined) || 'Tep dinh kem',
              documentType: ((doc.documentType as string | undefined) ||
                'OTHER') as AttachmentDocument['documentType'],
              downloadUrl: doc.downloadUrl as string,
              createdAt: doc.createdAt as string,
              fileSize: doc.fileSize as number | undefined,
            }));
          setAttachmentDocuments(normalizedDocs);
        } catch {
          setAttachmentDocuments([]);
          toast.error('Khong the tai danh sach tai lieu');
        } finally {
          setIsLoadingAttachmentDocuments(false);
        }
      };

      loadAttachmentDocuments();
    }
  }, [isOpen, member]);

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', attachmentType);

      const { data } = await apiClient.post('/me/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploaded = data?.data;
      const downloadUrl = uploaded?.downloadUrl;
      const fileName = uploaded?.fileName || file.name;

      if (downloadUrl) {
        setAttachmentUrl(downloadUrl);
        if (uploaded?.id) {
          const newDocument: AttachmentDocument = {
            id: uploaded.id,
            fileName,
            documentType: (uploaded.documentType ||
              attachmentType) as AttachmentDocument['documentType'],
            downloadUrl,
            createdAt: uploaded.createdAt,
            fileSize: uploaded.fileSize,
          };
          setAttachmentDocuments((prev) => [
            newDocument,
            ...prev.filter((doc) => doc.id !== uploaded.id),
          ]);
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
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
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
      toast.success('Da cap nhat loai tai lieu');
    } catch {
      toast.error('Khong the cap nhat loai tai lieu');
    } finally {
      setUpdatingAttachmentTypes((prev) => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingAttachmentIds((prev) => new Set([...prev, documentId]));
    try {
      await apiClient.delete(`/me/profile/documents/${documentId}`);
      setAttachmentDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success('Da xoa tai lieu');
    } catch {
      toast.error('Khong the xoa tai lieu');
    } finally {
      setDeletingAttachmentIds((prev) => {
        const updated = new Set(prev);
        updated.delete(documentId);
        return updated;
      });
    }
  };

  const handleOpenPreview = async (doc: AttachmentDocument) => {
    try {
      setIsLoadingPreview(true);
      setPreviewingDocId(doc.id);
      setPreviewFileName(doc.fileName);

      // Use apiClient with blob response to properly route to backend API (port 3000)
      const response = await apiClient.get(doc.downloadUrl, { responseType: 'blob' });
      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      setPreviewDownloadUrl(blobUrl);
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Khong the mo file');
      setPreviewingDocId(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    if (previewDownloadUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewDownloadUrl);
    }
    setPreviewingDocId(null);
    setPreviewFileName(null);
    setPreviewDownloadUrl(null);
  };

  const handleDownloadDocument = async (doc: AttachmentDocument) => {
    try {
      setDownloadingDocIds((prev) => new Set([...prev, doc.id]));

      // Use apiClient with blob response to properly route to backend API (port 3000)
      const response = await apiClient.get(doc.downloadUrl, { responseType: 'blob' });
      const blob = response.data;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('memberEdit.notification.fileDownloaded'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('memberEdit.error.attachmentFailed'));
    } finally {
      setDownloadingDocIds((prev) => {
        const updated = new Set(prev);
        updated.delete(doc.id);
        return updated;
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
          toast.error(t('memberEdit.validation.imageFormat'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('memberEdit.validation.imageTooLarge'));
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrl);
    }
    setAvatarUrl('');
    setAvatarFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let uploadedAvatarUrl = avatarUrl;

      // Upload avatar if new file selected
      if (avatarFile) {
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        try {
          const { data } = await apiClient.post(
            `/workspaces/${workspaceId}/members/${member.id}/upload-avatar`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );
          uploadedAvatarUrl = data?.data?.avatarUrl || avatarUrl;
          toast.success(t('memberEdit.notification.fileUploaded'));
        } catch (uploadErr) {
          console.error('Avatar upload error:', uploadErr);
          toast.error(t('memberEdit.error.uploadFailed'));
          setIsUploadingAvatar(false);
          setIsSubmitting(false);
          return;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      await apiClient.patch(`/workspaces/${workspaceId}/members/${member.id}`, {
        roleId,
        status,
        displayName: displayName || null,
        workspaceEmail: workspaceEmail || null,
        workspacePhone: workspacePhone || null,
        avatarUrl: uploadedAvatarUrl || null,
        gender: locationData.gender || null,
        dateOfBirth: locationData.dateOfBirth
          ? new Date(locationData.dateOfBirth).toISOString()
          : null,
        workspaceCity: locationData.provinceName || null,
        workspaceAddress: locationData.wardName || null,
        addressLine: addressLine || null,
        contractType: contractType || null,
        attachmentUrl: attachmentUrl || null,
        employmentStatus: employmentStatus || null,
      });
          onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      console.error('Update member error:', err);
      const errorMessage =
        apiError.response?.data?.message || t('memberEdit.message.updateError');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('memberEdit.dialog.title')}
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
            form="member-edit-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.update')}
          </button>
        </>
      }
    >
      <form id="member-edit-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="p-4 bg-[#F5F7FA] border border-[#CFAF6E]/40 rounded-lg">
          <p className="text-xs font-medium text-[#0B1F3A] mb-1">{t('memberEdit.label.baseInfo')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
            <p>
              <span className="font-medium">{t('memberEdit.label.namePrefix')}</span> {member.user.fullName || t('memberEdit.label.notAvailable')}
            </p>
            <p>
              <span className="font-medium">Email:</span> {member.user.email || t('memberEdit.label.notAvailable')}
            </p>
            <p>
              <span className="font-medium">SĐT:</span> {member.user.phone || t('memberEdit.label.notAvailable')}
            </p>
          </div>
        </div>

        <div className="space-y-[0.8rem]">
          <div className="border border-gray-200 rounded-xl p-4 space-y-[0.8rem]">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{t('memberEdit.label.workspaceInfoSection')}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('memberEdit.label.workspaceInfoNote')}
              </p>
            </div>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="relative group">
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
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {avatarUrl ? t('memberEdit.label.changeAvatar') : t('memberEdit.label.uploadAvatar')}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isSubmitting || isUploadingAvatar}
                    className="hidden"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isSubmitting || isUploadingAvatar}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.displayName')}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={member.user.fullName || 'Nhập tên hiển thị'}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.employeeCode')}
                  </label>
                  <input
                    type="text"
                    value={member.employeeCode || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder={t('memberEdit.label.employeeCodePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.workspaceEmail')}
                  </label>
                  <input
                    type="email"
                    value={workspaceEmail}
                    onChange={(e) => setWorkspaceEmail(e.target.value)}
                    placeholder={member.user.email || 'Nhập email'}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.workspacePhone')}
                  </label>
                  <input
                    type="tel"
                    value={workspacePhone}
                    onChange={(e) => setWorkspacePhone(e.target.value)}
                    placeholder={member.user.phone || 'Nhập số điện thoại'}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.roleInWorkspace')}
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    {rolesArray.length === 0 && <option value="">{t('memberAdd.label.loadingRoles')}</option>}
                    {rolesArray.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                    {employmentStatusOptions.length > 0
                      ? employmentStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))
                      : [
                          { value: 'PROBATION', key: 'PROBATION' },
                          { value: 'WORKING', key: 'WORKING' },
                          { value: 'ON_LEAVE', key: 'ON_LEAVE' },
                          { value: 'RESIGNED', key: 'RESIGNED' },
                          { value: 'RETIRED', key: 'RETIRED' },
                          { value: 'FIRED', key: 'FIRED' },
                        ].map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(`members.employmentStatus.${opt.key}` as Parameters<typeof t>[0])}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.statusLabel')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 bg-white"
                  >
                    {accountStatusOptions.length > 0
                      ? accountStatusOptions.map((opt) => (
                          <option key={opt.value} value={Number(opt.value)}>
                            {opt.label}
                          </option>
                        ))
                      : [
                          { value: 1, label: t('members.systemStatus.active') },
                          { value: 2, label: t('members.systemStatus.banned') },
                          { value: 0, label: t('members.systemStatus.inactive') },
                        ].map((opt) => (
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
              <PersonalInfoForm
                data={locationData}
                onChange={setLocationData}
                isDisabled={isSubmitting}
                showGenderAndDOB={true}
                hideHeader={true}
                genderDobInline={true}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('memberEdit.label.addressLine')}</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Số nhà, tên đường..."
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
                  <p className="text-xs text-gray-500 mt-0.5">Nhân sự có thể thuộc nhiều phòng ban với vai trò khác nhau</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setIsAddingDept(true); setNewDeptId(availableDepartments[0]?.id || ''); setNewDeptRoleId(deptRoleOptions[0]?.id || ''); }}
                    disabled={isAddingDept || availableDepartments.length === 0 || isDeptLoading}
                    title={availableDepartments.length === 0 && !isAddingDept ? 'Đã gán tất cả phòng ban có sẵn' : undefined}
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
                  {deptAssignments.length === 0 && !isAddingDept && (
                    <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-3">Chưa thuộc phòng ban nào</p>
                  )}
                  {deptAssignments.map((a) => {
                    const isPendingRole = a.departmentId in pendingRoleChange;
                    const pendingRoleId = pendingRoleChange[a.departmentId] ?? a.roleId;
                    const isConfirmingRemove = confirmingRemoveDept === a.departmentId;
                    const isBusy = !!updatingDeptRole[a.departmentId] || !!removingDept[a.departmentId];

                    if (isConfirmingRemove) {
                      return (
                        <div key={a.departmentId} className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg space-y-2">
                          <p className="text-xs font-medium text-red-700">
                            Xóa <strong>{a.departmentName}</strong>? Hành động này sẽ thu hồi tất cả phiên đăng nhập của nhân sự.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromDept(a.departmentId)}
                              disabled={!!removingDept[a.departmentId]}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {removingDept[a.departmentId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              Xác nhận xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingRemoveDept(null)}
                              disabled={!!removingDept[a.departmentId]}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={a.departmentId} className="space-y-0">
                        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{a.departmentName}</p>
                            {a.departmentCode && <p className="text-xs text-gray-500">{a.departmentCode}</p>}
                          </div>
                          <select
                            value={isPendingRole ? pendingRoleId : a.roleId}
                            onChange={(e) => setPendingRoleChange((prev) => ({ ...prev, [a.departmentId]: e.target.value }))}
                            disabled={isBusy}
                            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                          >
                            {deptRoleOptions.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          {updatingDeptRole[a.departmentId] && <Loader2 className="h-4 w-4 animate-spin text-[#CFAF6E] flex-shrink-0" />}
                          <button
                            type="button"
                            onClick={() => { setConfirmingRemoveDept(a.departmentId); setPendingRoleChange((prev) => { const n = { ...prev }; delete n[a.departmentId]; return n; }); }}
                            disabled={isBusy}
                            className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {isPendingRole && pendingRoleId !== a.roleId && (
                          <div className="mx-3 px-3 py-2 bg-amber-50 border border-amber-200 border-t-0 rounded-b-lg">
                            <p className="text-xs text-amber-700 mb-1.5">
                              Đổi vai trò sẽ thu hồi phiên đăng nhập hiện tại của nhân sự tại phòng ban này.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateDeptRole(a.departmentId, pendingRoleId)}
                                disabled={!!updatingDeptRole[a.departmentId]}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
                              >
                                {updatingDeptRole[a.departmentId] ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Xác nhận đổi vai trò
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingRoleChange((prev) => { const n = { ...prev }; delete n[a.departmentId]; return n; })}
                                disabled={!!updatingDeptRole[a.departmentId]}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isAddingDept && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F7FA] border border-[#CFAF6E]/40 rounded-lg">
                      <Building2 className="h-4 w-4 text-[#CFAF6E] flex-shrink-0" />
                      <select
                        value={newDeptId}
                        onChange={(e) => setNewDeptId(e.target.value)}
                        disabled={savingNewDept}
                        className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        {availableDepartments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <select
                        value={newDeptRoleId}
                        onChange={(e) => setNewDeptRoleId(e.target.value)}
                        disabled={savingNewDept}
                        className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                      >
                        <option value="">-- Chọn vai trò --</option>
                        {deptRoleOptions.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddDeptConfirm}
                        disabled={savingNewDept || !newDeptId || !newDeptRoleId}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-[#CFAF6E] rounded-md hover:bg-[#B89655] disabled:opacity-50 transition-colors"
                      >
                        {savingNewDept ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Xác nhận'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingDept(false); setNewDeptId(''); setNewDeptRoleId(''); }}
                        disabled={savingNewDept}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
                <p className="text-xs text-gray-500 mt-1">
                  {t('memberEdit.label.documentsHint')}
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={attachmentType}
                    onChange={(e) =>
                      setAttachmentType(e.target.value as 'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER')
                    }
                    disabled={isSubmitting || isUploadingAttachment}
                    className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                  >
                    <option value="CCCD">{t('memberEdit.docType.CCCD')}</option>
                    <option value="HDLD">{t('memberEdit.docType.HDLD')}</option>
                    <option value="CHUNG_CHI">{t('memberEdit.docType.CHUNG_CHI')}</option>
                    <option value="OTHER">{t('memberEdit.docType.OTHER')}</option>
                  </select>

                  <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] cursor-pointer disabled:opacity-50">
                    {isUploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {t('memberEdit.label.uploadDocument')}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleUploadAttachment}
                      disabled={isSubmitting || isUploadingAttachment}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  {isLoadingAttachmentDocuments ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dang tai danh sach tai lieu...
                    </div>
                  ) : attachmentDocuments.length > 0 ? (
                    attachmentDocuments.map((doc) => {
                      const isUpdatingType = !!updatingAttachmentTypes[doc.id];
                      const isDeleting = deletingAttachmentIds.has(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                        >
                          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {doc.fileName}{' '}
                              <span className="text-xs text-gray-500">
                                ({formatFileSize(doc.fileSize)})
                              </span>
                            </p>
                          </div>
                          <select
                            value={doc.documentType}
                            onChange={(e) =>
                              handleUpdateAttachmentType(
                                doc.id,
                                e.target.value as AttachmentDocument['documentType'],
                              )
                            }
                            disabled={isSubmitting || isUpdatingType || isDeleting}
                            className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs disabled:opacity-60"
                          >
                            <option value="CCCD">CCCD</option>
                            <option value="HDLD">HDLD</option>
                            <option value="CHUNG_CHI">Chung chi</option>
                            <option value="OTHER">Khac</option>
                          </select>
                          {isUpdatingType && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#CFAF6E] flex-shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(doc)}
                            disabled={isSubmitting || isDeleting}
                            className="flex-shrink-0 p-1 rounded hover:bg-[#F5F7FA] text-gray-400 hover:text-[#CFAF6E] disabled:opacity-50"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            disabled={isSubmitting || isDeleting || downloadingDocIds.has(doc.id)}
                            className="flex-shrink-0 p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50"
                          >
                            {downloadingDocIds.has(doc.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={isSubmitting || isDeleting}
                            className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-3">
                      Chua co tep dinh kem nao.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {previewingDocId && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={handleClosePreview}
          ></div>
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-2/5 bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{previewFileName}</h3>
              <button
                onClick={handleClosePreview}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-[#CFAF6E]" />
                    <p className="text-sm text-gray-500">Dang tai file...</p>
                  </div>
                </div>
              ) : previewDownloadUrl ? (
                <iframe
                  src={previewDownloadUrl}
                  className="w-full h-full rounded-lg border border-gray-200"
                  title="Document Preview"
                  onError={() => {
                    toast.error('Khong the hien thi file');
                    handleClosePreview();
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500">Khong the tai file</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </BaseDialog>
  );
}

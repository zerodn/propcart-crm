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
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
import { DocumentListPanel } from '@/components/common/document-list-panel';
import { BaseImagePreviewDialog } from '@/components/common/base-image-preview-dialog';
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

export interface MemberForDialog {
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
}

interface MemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  /** If provided → edit mode. If null/undefined → add mode. */
  member?: MemberForDialog | null;
  availableRoles?: Array<{ id: string; code: string; name: string }> | null;
}

export function MemberDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  member = null,
  availableRoles = [],
}: MemberDialogProps) {
  const isEditMode = !!member;
  const { t } = useI18n();
  const rolesArray = Array.isArray(availableRoles) ? availableRoles : [];

  // ── Shared form state ──
  const [phone, setPhone] = useState(''); // add mode only
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [contractType, setContractType] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [workspacePhone, setWorkspacePhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locationData, setLocationData] = useState<LocationFormData>({
    provinceCode: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
    gender: '',
    dateOfBirth: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Avatar state ──
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  // ── Document state ──
  const [attachmentType, setAttachmentType] = useState<'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER'>(
    'OTHER',
  );
  const [attachmentDocuments, setAttachmentDocuments] = useState<AttachmentDocument[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isLoadingAttachmentDocuments, setIsLoadingAttachmentDocuments] = useState(false);
  const [updatingAttachmentTypes, setUpdatingAttachmentTypes] = useState<
    Record<string, boolean>
  >({});
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<Set<string>>(new Set());
  const [downloadingDocIds, setDownloadingDocIds] = useState<Set<string>>(new Set());

  // ── Department state ──
  type DeptAssignment = {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    roleId: string;
    roleCode: string;
    roleName: string;
  };
  type PendingDept = {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    roleId: string;
    roleName: string;
  };

  const [deptAssignments, setDeptAssignments] = useState<DeptAssignment[]>([]);
  const [pendingDepts, setPendingDepts] = useState<PendingDept[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(false);
  const [allDepartments, setAllDepartments] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [deptRoleOptions, setDeptRoleOptions] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptId, setNewDeptId] = useState('');
  const [newDeptRoleId, setNewDeptRoleId] = useState('');
  const [savingNewDept, setSavingNewDept] = useState(false);
  const [updatingDeptRole, setUpdatingDeptRole] = useState<Record<string, boolean>>({});
  const [removingDept, setRemovingDept] = useState<Record<string, boolean>>({});
  const [pendingRoleChange, setPendingRoleChange] = useState<Record<string, string>>({});
  const [confirmingRemoveDept, setConfirmingRemoveDept] = useState<string | null>(null);

  // ── Catalog option state ──
  const [hdldOptions, setHdldOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [accountStatusOptions, setAccountStatusOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // ── Derived ──
  const activeDepts = isEditMode ? deptAssignments : pendingDepts;
  const availableDepartments = allDepartments.filter(
    (d) => !activeDepts.some((a) => a.departmentId === d.id),
  );

  // ── Load catalog options ──
  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const [hdldRes, empRes, accRes] = await Promise.all([
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=HDLD_TYPE`),
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=EMPLOYMENT_STATUS`),
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=ACCOUNT_STATUS`),
        ]);
        const findValues = (res: { data: { data?: unknown[] } }, code: string) => {
          const catalogs = Array.isArray(res.data?.data) ? res.data.data : [];
          const catalog = catalogs.find(
            (c: unknown) => (c as Record<string, unknown>).code === code,
          );
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
    load();
  }, [workspaceId]);

  // ── Load department data (called on open and after mutations) ──
  const loadDepartmentData = async () => {
    if (!workspaceId) return;
    setIsDeptLoading(true);
    try {
      const requests: Promise<{ data: unknown }>[] = [
        ...(isEditMode && member
          ? [apiClient.get(`/workspaces/${workspaceId}/members/${member.id}/departments`)]
          : []),
        apiClient.get(`/workspaces/${workspaceId}/departments`),
        apiClient.get(`/workspaces/${workspaceId}/departments/role-options`),
      ];
      const results = await Promise.all(requests);
      const deptListRes = isEditMode ? results[1] : results[0];
      const roleOptRes = isEditMode ? results[2] : results[1];

      if (isEditMode) {
        const assignRes = results[0];
        const assignments: DeptAssignment[] = Array.isArray(
          (assignRes.data as { data?: unknown }).data,
        )
          ? (assignRes.data as { data: DeptAssignment[] }).data
          : [];
        setDeptAssignments(assignments);
      }

      const depts = Array.isArray(deptListRes.data)
        ? (deptListRes.data as unknown[])
        : Array.isArray((deptListRes.data as { data?: unknown[] }).data)
          ? ((deptListRes.data as { data: unknown[] }).data as unknown[])
          : [];
      setAllDepartments(
        depts.map((d) => ({
          id: (d as Record<string, unknown>).id as string,
          name: (d as Record<string, unknown>).name as string,
          code: ((d as Record<string, unknown>).code as string) || '',
        })),
      );

      const roleOpts = Array.isArray(roleOptRes.data)
        ? (roleOptRes.data as unknown[])
        : Array.isArray((roleOptRes.data as { data?: unknown[] }).data)
          ? ((roleOptRes.data as { data: unknown[] }).data as unknown[])
          : [];
      setDeptRoleOptions(
        roleOpts.map((r) => ({
          id: (r as Record<string, unknown>).id as string,
          name: (r as Record<string, unknown>).name as string,
          code: ((r as Record<string, unknown>).code as string) || '',
        })),
      );
    } catch {
      setDeptAssignments([]);
    } finally {
      setIsDeptLoading(false);
    }
  };

  // ── Reset & load on open ──
  useEffect(() => {
    if (!isOpen) return;

    setPhone('');
    setRoleId(
      member?.roleId ||
        rolesArray.find((r) => r.code === 'SALES')?.id ||
        rolesArray[0]?.id ||
        '',
    );
    setStatus(member?.status ?? 1);
    setDisplayName(member ? member.displayName || member.user.fullName || '' : '');
    setContractType(member?.contractType || '');
    setEmploymentStatus(member?.employmentStatus || '');
    setWorkspaceEmail(member ? member.workspaceEmail || member.user.email || '' : '');
    setWorkspacePhone(member ? member.workspacePhone || member.user.phone || '' : '');
    setAddressLine(member?.addressLine || '');
    setLocationData({
      provinceCode: member?.workspaceCity || '',
      provinceName: member?.workspaceCity || '',
      wardCode: '',
      wardName: member?.workspaceAddress || '',
      gender: member?.gender || '',
      dateOfBirth: member?.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
    });
    setAvatarUrl(member?.avatarUrl || '');
    setAvatarFile(null);
    setAttachmentUrl(member?.attachmentUrl || '');
    setUpdatingAttachmentTypes({});
    setDeptAssignments([]);
    setPendingDepts([]);
    setIsAddingDept(false);
    setNewDeptId('');
    setNewDeptRoleId('');
    setPendingRoleChange({});
    setConfirmingRemoveDept(null);

    // Load documents
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
            documentType: ((doc.documentType as string | undefined) ||
              'OTHER') as AttachmentDocument['documentType'],
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
    loadDepartmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, member]);

  // Set default role when roles load (add mode)
  useEffect(() => {
    if (!isEditMode && rolesArray.length > 0 && !roleId) {
      const salesRole = rolesArray.find((r) => r.code === 'SALES');
      setRoleId(salesRole?.id || rolesArray[0].id);
    }
  }, [rolesArray, isEditMode]);

  // ── Handlers ──

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
            documentType: (uploaded.documentType ||
              documentType) as AttachmentDocument['documentType'],
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

  // ── Department handlers ──

  const handleAddDeptConfirm = async () => {
    if (!newDeptId || !newDeptRoleId) return;
    const dept = allDepartments.find((d) => d.id === newDeptId);
    const role = deptRoleOptions.find((r) => r.id === newDeptRoleId);
    if (!dept || !role) return;

    if (isEditMode && member) {
      // Live API call
      setSavingNewDept(true);
      try {
        await apiClient.post(
          `/workspaces/${workspaceId}/departments/${newDeptId}/members`,
          { userId: member.userId, roleId: newDeptRoleId },
        );
        setDeptAssignments((prev) => [
          ...prev,
          {
            departmentId: dept.id,
            departmentName: dept.name,
            departmentCode: dept.code,
            roleId: role.id,
            roleCode: role.code,
            roleName: role.name,
          },
        ]);
        setIsAddingDept(false);
        setNewDeptId('');
        setNewDeptRoleId('');
        toast.success('Đã thêm vào phòng ban');
        loadDepartmentData();
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } } };
        toast.error(apiErr.response?.data?.message || 'Không thể thêm vào phòng ban');
      } finally {
        setSavingNewDept(false);
      }
    } else {
      // Pending (add mode)
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
    }
  };

  const handleUpdateDeptRole = async (departmentId: string, newRoleId: string) => {
    if (!member) return;
    setUpdatingDeptRole((prev) => ({ ...prev, [departmentId]: true }));
    try {
      await apiClient.patch(
        `/workspaces/${workspaceId}/departments/${departmentId}/members/${member.userId}/role`,
        { roleId: newRoleId },
      );
      setDeptAssignments((prev) =>
        prev.map((a) => {
          if (a.departmentId !== departmentId) return a;
          const role = deptRoleOptions.find((r) => r.id === newRoleId);
          return { ...a, roleId: newRoleId, roleCode: role?.code || '', roleName: role?.name || '' };
        }),
      );
      toast.success('Đã cập nhật vai trò — phiên đăng nhập của nhân sự đã được thu hồi');
    } catch {
      toast.error('Không thể cập nhật vai trò');
    } finally {
      setUpdatingDeptRole((prev) => ({ ...prev, [departmentId]: false }));
      setPendingRoleChange((prev) => {
        const n = { ...prev };
        delete n[departmentId];
        return n;
      });
    }
  };

  const handleRemoveFromDept = async (departmentId: string) => {
    if (!member) return;
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

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !phone.trim()) {
      toast.error(t('memberAdd.validation.phoneRequired'));
      return;
    }
    if (!roleId) {
      toast.error(t('memberAdd.validation.roleRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && member) {
        // ── Edit flow ──
        let uploadedAvatarUrl = avatarUrl;
        if (avatarFile) {
          setIsUploadingAvatar(true);
          try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);
            const { data } = await apiClient.post(
              `/workspaces/${workspaceId}/members/${member.id}/upload-avatar`,
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            uploadedAvatarUrl = data?.data?.avatarUrl || avatarUrl;
            toast.success(t('memberEdit.notification.fileUploaded'));
          } catch {
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
      } else {
        // ── Add flow ──
        const res = await apiClient.post(`/workspaces/${workspaceId}/members`, {
          phone: phone.trim(),
          roleId,
          displayName: displayName.trim() || undefined,
          workspaceEmail: workspaceEmail.trim() || undefined,
          workspacePhone: workspacePhone.trim() || undefined,
          contractType: contractType || undefined,
          employmentStatus: employmentStatus || undefined,
          workspaceCity: locationData.provinceName || undefined,
          workspaceAddress: locationData.wardName || undefined,
          addressLine: addressLine.trim() || undefined,
        });
        const newMember = res.data?.data || res.data;
        const newMemberId: string | undefined = newMember?.id;
        const newUserId: string | undefined = newMember?.userId;

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

        if (pendingDepts.length > 0 && newUserId) {
          await Promise.allSettled(
            pendingDepts.map((d) =>
              apiClient.post(
                `/workspaces/${workspaceId}/departments/${d.departmentId}/members`,
                { userId: newUserId, roleId: d.roleId },
              ),
            ),
          );
        }

        toast.success(t('memberAdd.message.success'));
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { code?: string; message?: string } } };
      if (isEditMode) {
        toast.error(apiError.response?.data?.message || t('memberEdit.message.updateError'));
      } else {
        const code = apiError.response?.data?.code;
        if (code === 'EMAIL_ALREADY_EXISTS') {
          toast.error(apiError.response?.data?.message || t('memberAdd.validation.emailUsed'));
        } else if (code === 'ALREADY_MEMBER') {
          toast.error(apiError.response?.data?.message || t('memberAdd.validation.alreadyMember'));
        } else {
          toast.error(apiError.response?.data?.message || t('memberAdd.message.error'));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── JSX ──
  return (
    <>
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('memberEdit.dialog.title') : t('memberAdd.dialog.title')}
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
            form="member-dialog-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditMode ? null : (
              <UserPlus className="h-4 w-4" />
            )}
            {isEditMode ? t('common.update') : t('memberAdd.dialog.title')}
          </button>
        </>
      }
    >
      <form id="member-dialog-form" onSubmit={handleSubmit} className="space-y-5">
        {/* ── Header: base account info (edit) or phone-lookup note (add) ── */}
        {isEditMode && member ? (
          <div className="p-4 bg-[#F5F7FA] border border-[#CFAF6E]/40 rounded-lg">
            <p className="text-xs font-medium text-[#0B1F3A] mb-1">
              {t('memberEdit.label.baseInfo')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
              <p>
                <span className="font-medium">{t('memberEdit.label.namePrefix')}</span>{' '}
                {member.user.fullName || t('memberEdit.label.notAvailable')}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {member.user.email || t('memberEdit.label.notAvailable')}
              </p>
              <p>
                <span className="font-medium">SĐT:</span>{' '}
                {member.user.phone || t('memberEdit.label.notAvailable')}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">{t('memberAdd.label.findUserByPhone')}</p>
          </div>
        )}

        <div className="space-y-[0.8rem]">
          <div className="border border-gray-200 rounded-xl p-4 space-y-[0.8rem]">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {t('memberEdit.label.workspaceInfoSection')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('memberEdit.label.workspaceInfoNote')}
              </p>
            </div>

            {/* ── Avatar ── */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="relative">
                <div
                  className={`w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center${avatarUrl ? ' cursor-pointer hover:ring-2 hover:ring-[#CFAF6E] transition-all' : ''}`}
                  onClick={() => avatarUrl && setAvatarPreviewOpen(true)}
                >
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
                    htmlFor="member-dialog-avatar"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {avatarUrl ? t('memberEdit.label.changeAvatar') : t('memberEdit.label.uploadAvatar')}
                  </label>
                  <input
                    id="member-dialog-avatar"
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

            {/* ── Basic info ── */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('memberEdit.label.basicInfo')}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone – add mode only */}
                {!isEditMode && (
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
                )}

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.displayName')}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={
                      isEditMode
                        ? member?.user.fullName || 'Nhập tên hiển thị'
                        : t('memberAdd.label.displayNamePlaceholder')
                    }
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                {/* Employee Code – edit mode only (read-only) */}
                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('memberEdit.label.employeeCode')}
                    </label>
                    <input
                      type="text"
                      value={member?.employeeCode || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder={t('memberEdit.label.employeeCodePlaceholder')}
                    />
                  </div>
                )}

                {/* Workspace Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.workspaceEmail')}
                  </label>
                  <input
                    type="email"
                    value={workspaceEmail}
                    onChange={(e) => setWorkspaceEmail(e.target.value)}
                    placeholder={
                      isEditMode ? member?.user.email || 'Nhập email' : t('memberAdd.label.workspaceEmailPlaceholder')
                    }
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
                    placeholder={
                      isEditMode ? member?.user.phone || 'Nhập số điện thoại' : t('memberAdd.label.phonePlaceholder')
                    }
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('memberEdit.label.roleInWorkspace')}{' '}
                    {!isEditMode && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    disabled={isSubmitting}
                    required={!isEditMode}
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
                            {t(
                              `members.employmentStatus.${opt.key}` as Parameters<typeof t>[0],
                            )}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Account Status – edit mode only */}
                {isEditMode && (
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
                )}
              </div>
            </div>

            {/* ── Personal info ── */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('memberEdit.label.addressLine')}
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder={
                    isEditMode ? 'Số nhà, tên đường...' : t('memberAdd.label.addressLinePlaceholder')
                  }
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
                />
              </div>
            </div>

            {/* ── Department assignments ── */}
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
                      ? 'Đã gán tất cả phòng ban có sẵn'
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
                  {activeDepts.length === 0 && !isAddingDept && (
                    <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-3">
                      {isEditMode ? 'Chưa thuộc phòng ban nào' : 'Chưa chọn phòng ban nào'}
                    </p>
                  )}

                  {/* Edit mode: live assignments with confirm dialogs */}
                  {isEditMode &&
                    deptAssignments.map((a) => {
                      const isPendingRole = a.departmentId in pendingRoleChange;
                      const pendingRoleId = pendingRoleChange[a.departmentId] ?? a.roleId;
                      const isConfirmingRemove = confirmingRemoveDept === a.departmentId;
                      const isBusy =
                        !!updatingDeptRole[a.departmentId] || !!removingDept[a.departmentId];

                      if (isConfirmingRemove) {
                        return (
                          <div
                            key={a.departmentId}
                            className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg space-y-2"
                          >
                            <p className="text-xs font-medium text-red-700">
                              Xóa <strong>{a.departmentName}</strong>? Hành động này sẽ thu hồi
                              tất cả phiên đăng nhập của nhân sự.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromDept(a.departmentId)}
                                disabled={!!removingDept[a.departmentId]}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {removingDept[a.departmentId] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
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
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {a.departmentName}
                              </p>
                              {a.departmentCode && (
                                <p className="text-xs text-gray-500">{a.departmentCode}</p>
                              )}
                            </div>
                            <select
                              value={isPendingRole ? pendingRoleId : a.roleId}
                              onChange={(e) =>
                                setPendingRoleChange((prev) => ({
                                  ...prev,
                                  [a.departmentId]: e.target.value,
                                }))
                              }
                              disabled={isBusy}
                              className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                            >
                              {deptRoleOptions.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            {updatingDeptRole[a.departmentId] && (
                              <Loader2 className="h-4 w-4 animate-spin text-[#CFAF6E] flex-shrink-0" />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingRemoveDept(a.departmentId);
                                setPendingRoleChange((prev) => {
                                  const n = { ...prev };
                                  delete n[a.departmentId];
                                  return n;
                                });
                              }}
                              disabled={isBusy}
                              className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {isPendingRole && pendingRoleId !== a.roleId && (
                            <div className="mx-3 px-3 py-2 bg-amber-50 border border-amber-200 border-t-0 rounded-b-lg">
                              <p className="text-xs text-amber-700 mb-1.5">
                                Đổi vai trò sẽ thu hồi phiên đăng nhập hiện tại của nhân sự tại
                                phòng ban này.
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDeptRole(a.departmentId, pendingRoleId)
                                  }
                                  disabled={!!updatingDeptRole[a.departmentId]}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                >
                                  {updatingDeptRole[a.departmentId] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : null}
                                  Xác nhận đổi vai trò
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingRoleChange((prev) => {
                                      const n = { ...prev };
                                      delete n[a.departmentId];
                                      return n;
                                    })
                                  }
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

                  {/* Add mode: pending list */}
                  {!isEditMode &&
                    pendingDepts.map((a) => (
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
                          onClick={() =>
                            setPendingDepts((prev) =>
                              prev.filter((d) => d.departmentId !== a.departmentId),
                            )
                          }
                          className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                  {/* Add-dept row */}
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
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
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
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddDeptConfirm}
                        disabled={savingNewDept || !newDeptId || !newDeptRoleId}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-[#CFAF6E] rounded-md hover:bg-[#B89655] disabled:opacity-50 transition-colors"
                      >
                        {savingNewDept ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Xác nhận'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingDept(false);
                          setNewDeptId('');
                          setNewDeptRoleId('');
                        }}
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

            {/* ── Documents ── */}
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

      <BaseImagePreviewDialog
        isOpen={avatarPreviewOpen}
        items={avatarUrl ? [{ src: avatarUrl, title: t('memberEdit.label.avatarInWorkspace'), downloadFileName: 'avatar' }] : []}
        currentIndex={avatarUrl ? 0 : null}
        onClose={() => setAvatarPreviewOpen(false)}
      />
    </>
  );
}

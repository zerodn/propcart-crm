'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  MailCheck,
  Save,
  Upload,
  Trash2,
  FileText,
  Download,
  Camera,
  X,
  Building2,
  User,
  Pencil,
} from 'lucide-react';
import { DocumentTypeOption, DocumentTypeValue, useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { BaseImagePreviewDialog } from '@/components/common/base-image-preview-dialog';
import { DocumentPreviewDialog } from '@/components/common/document-preview-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
import { ProfileSkeleton } from '@/components/common/skeleton';
import { WorkspaceProfileTab } from '@/components/profile/workspace-profile-tab';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UserDocument } from '@/types';

interface FormState {
  fullName: string;
  email: string;
  fullAddress: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  fullAddress: '',
};

export default function ProfilePage() {
  const { t } = useI18n();
  const { refreshProfile, updateWorkspaceName } = useAuth();
  const { workspaces, refetch: refetchWorkspaces } = useWorkspaces();
  const [activeTab, setActiveTab] = useState('personal');

  usePageSetup({
    title: t('profile.title'),
    subtitle: t('profile.subtitle'),
  });
  const {
    profile,
    documents,
    isLoading,
    isSaving,
    updateProfile,
    sendEmailVerification,
    uploadDocument,
    updateDocumentType,
    deleteDocument,
    downloadDocument,
    fetchDocumentBlob,
    activeDocumentType,
    setDocumentTypeFilter,
  } = useProfile();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [locationData, setLocationData] = useState<LocationFormData>({
    provinceCode: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
    gender: '',
    dateOfBirth: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] =
    useState<Exclude<DocumentTypeOption, 'ALL'>>('OTHER');
  const [updatingTypeDocumentId, setUpdatingTypeDocumentId] = useState<string | null>(null);
  const [previewingDocument, setPreviewingDocument] = useState<UserDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<UserDocument | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [workspaceNames, setWorkspaceNames] = useState<Record<string, string>>({});
  const [savingWorkspaceId, setSavingWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaces.length === 0) return;
    setWorkspaceNames((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => {
        if (!(ws.id in next)) next[ws.id] = ws.name;
      });
      return next;
    });
  }, [workspaces]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      fullAddress: profile.addressLine ?? '',
    });
    setLocationData({
      provinceCode: profile.provinceCode ?? '',
      provinceName: profile.provinceName ?? '',
      wardCode: profile.wardCode ?? '',
      wardName: profile.wardName ?? '',
      gender: profile.gender ?? '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
    });
    setAvatarUrl(profile.avatarUrl ?? '');
  }, [profile]);

  const isEmailVerified = Boolean(profile?.emailVerifiedAt);
  const canVerifyEmail = Boolean(form.email.trim()) && !isEmailVerified;
  const displayName = profile?.fullName ?? profile?.phone ?? profile?.email ?? 'Người dùng';
  const initials = displayName.slice(0, 2).toUpperCase() || 'PC';

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('profile.avatar.fileTypesSupported'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.avatar.maxSize'));
      return;
    }
    const previewUrlLocal = URL.createObjectURL(file);
    setAvatarUrl(previewUrlLocal);
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post('/me/profile/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = data?.data?.downloadUrl;
      if (uploadedUrl) {
        await updateProfile({ avatarUrl: uploadedUrl });
        setAvatarUrl(uploadedUrl);
        toast.success(t('profile.avatar.updateSuccess'));
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { code?: string } } };
      const code = apiError.response?.data?.code;
      if (code === 'FILE_TOO_LARGE') {
        toast.error(t('profile.avatar.tooLargeError'));
      } else {
        toast.error(t('profile.avatar.uploadError'));
      }
      URL.revokeObjectURL(previewUrlLocal);
      setAvatarUrl(profile?.avatarUrl ?? '');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl('');
  };

  const handleDeleteDocument = (doc: UserDocument) => {
    setDocumentToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    setIsDeletingDocument(true);
    try {
      await deleteDocument(documentToDelete.id);
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const handleSaveWorkspaceName = async (wsId: string) => {
    const name = (workspaceNames[wsId] ?? '').trim();
    if (!name) return;
    setSavingWorkspaceId(wsId);
    try {
      await apiClient.patch(`/workspaces/${wsId}`, { name });
      updateWorkspaceName(wsId, name);
      void refetchWorkspaces();
      toast.success(t('profile.workspaceSettings.saveSuccess'));
    } catch {
      toast.error(t('profile.workspaceSettings.saveError'));
    } finally {
      setSavingWorkspaceId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitize = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
    await updateProfile({
      fullName: sanitize(form.fullName),
      email: sanitize(form.email),
      addressLine: sanitize(form.fullAddress),
      provinceCode: sanitize(locationData.provinceCode),
      provinceName: sanitize(locationData.provinceName),
      districtCode: undefined,
      districtName: undefined,
      wardCode: sanitize(locationData.wardCode),
      wardName: sanitize(locationData.wardName),
      avatarUrl: sanitize(avatarUrl),
      gender: sanitize(locationData.gender),
      dateOfBirth: sanitize(locationData.dateOfBirth),
    });
    await refreshProfile();
  };

  const handleSendVerify = async () => {
    if (!canVerifyEmail) return;
    setSendingVerify(true);
    try {
      if (form.email.trim() !== (profile?.email ?? '')) {
        await updateProfile({ email: form.email.trim() });
        await refreshProfile();
      }
      await sendEmailVerification();
    } finally {
      setSendingVerify(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDocument(true);
    try {
      await uploadDocument(file, uploadDocumentType);
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  };

  const DOCUMENT_TYPE_LABELS: Record<DocumentTypeOption, string> = {
    ALL: t('common.all'),
    CCCD: t('profile.documents.types.CCCD'),
    HDLD: t('profile.documents.types.HDLD'),
    CHUNG_CHI: t('profile.documents.types.CHUNG_CHI'),
    OTHER: t('profile.documents.types.OTHER'),
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const closePreviewDialog = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewMimeType('');
    setPreviewingDocument(null);
    setPreviewLoading(false);
  };

  const openPreviewDialog = async (doc: UserDocument) => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewingDocument(doc);
    setPreviewLoading(true);
    try {
      const blob = await fetchDocumentBlob(doc);
      setPreviewMimeType(blob.type || doc.fileType);
      setPreviewUrl(window.URL.createObjectURL(blob));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDocumentTypeChange = async (docId: string, newType: string) => {
    setUpdatingTypeDocumentId(docId);
    try {
      await updateDocumentType(docId, newType as DocumentTypeValue);
    } finally {
      setUpdatingTypeDocumentId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (isLoading) return <ProfileSkeleton />;

  const isPreviewImage =
    !previewLoading && previewMimeType.startsWith('image/') && Boolean(previewUrl);

  return (
    <div className="space-y-[0.8rem]">
      {/* ─── Tab bar ─── */}
      <div className="glass-content-card rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto">
        {/* Personal tab */}
        <button
          onClick={() => setActiveTab('personal')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === 'personal'
              ? 'bg-[#0B1F3A] text-white'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          <User className="h-3.5 w-3.5" />
          {t('profile.tabs.personal')}
        </button>

        {/* Workspace tabs */}
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => setActiveTab(ws.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === ws.id
                ? 'bg-[#CFAF6E] text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {ws.type === 'COMPANY' ? (
              <Building2 className="h-3.5 w-3.5" />
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
            {ws.name}
          </button>
        ))}
      </div>

      {/* ─── Personal tab content ─── */}
      {activeTab === 'personal' && (
        <div className="space-y-[0.8rem]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[0.8rem]">
          {/* Left: Form thông tin cá nhân */}
          <form
            onSubmit={handleSave}
            className="glass-content-card rounded-xl p-6 space-y-4"
          >
            {/* Avatar */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('profile.section.avatar')}
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-[#CFAF6E]/15 text-[#0B1F3A] rounded-full flex items-center justify-center text-2xl font-semibold overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] cursor-pointer">
                    <Camera className="h-4 w-4" />
                    {t('profile.avatar.upload')}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleAvatarChange}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      {t('profile.avatar.remove')}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('profile.avatar.validationMsg')}</p>
            </div>

            {/* Phone (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.label.phone')}
              </label>
              <input
                value={profile?.phone ?? ''}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm"
              />
            </div>

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.label.name')}
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder={t('profile.form.namePlaceholder')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
              />
            </div>

            {/* Email with verify */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.label.email')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t('profile.form.emailPlaceholder')}
                  className="w-full px-3 py-2 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {isEmailVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="email-verified" />
                  ) : (
                    <button
                      type="button"
                      aria-label="send-email-verification"
                      title={t('profile.sendVerifyEmail')}
                      disabled={!canVerifyEmail || sendingVerify}
                      onClick={handleSendVerify}
                      className="p-1 rounded hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sendingVerify ? (
                        <Loader2 className="h-5 w-5 text-[#CFAF6E] animate-spin" />
                      ) : (
                        <MailCheck className="h-5 w-5 text-[#CFAF6E]" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.label.address')}
              </label>
              <input
                value={form.fullAddress}
                onChange={(e) => setForm((p) => ({ ...p, fullAddress: e.target.value }))}
                placeholder={t('profile.form.addressPlaceholder')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
              />
            </div>

            {/* Location & Personal Info */}
            <PersonalInfoForm
              data={locationData}
              onChange={setLocationData}
              showGenderAndDOB={true}
              genderDobInline={true}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('profile.action.save')}
              </button>
            </div>
          </form>

          {/* Right: Documents */}
          <div className="glass-content-card rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t('profile.section.documents')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('profile.documents.uploadHint')}</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={uploadDocumentType}
                onChange={(e) =>
                  setUploadDocumentType(e.target.value as Exclude<DocumentTypeOption, 'ALL'>)
                }
                className="flex-1 px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-sm"
              >
                <option value="CCCD">
                  {t('profile.documents.typePrefix')}
                  {t('profile.documents.types.CCCD')}
                </option>
                <option value="HDLD">
                  {t('profile.documents.typePrefix')}
                  {t('profile.documents.types.HDLD')}
                </option>
                <option value="CHUNG_CHI">
                  {t('profile.documents.typePrefix')}
                  {t('profile.documents.types.CHUNG_CHI')}
                </option>
                <option value="OTHER">
                  {t('profile.documents.typePrefix')}
                  {t('profile.documents.types.OTHER')}
                </option>
              </select>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] cursor-pointer whitespace-nowrap">
                {uploadingDocument ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {t('profile.documents.uploadNew')}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleUploadDocument}
                  disabled={uploadingDocument}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">
                {t('profile.documents.filterByType')}
              </label>
              <select
                value={activeDocumentType}
                onChange={(e) => setDocumentTypeFilter(e.target.value as DocumentTypeOption)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-sm"
              >
                <option value="ALL">{t('common.all')}</option>
                <option value="CCCD">{t('profile.documents.types.CCCD')}</option>
                <option value="HDLD">{t('profile.documents.types.HDLD')}</option>
                <option value="CHUNG_CHI">{t('profile.documents.types.CHUNG_CHI')}</option>
                <option value="OTHER">{t('profile.documents.types.OTHER')}</option>
              </select>
            </div>

            {documents.length === 0 ? (
              <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                {t('profile.documents.noDocuments')}
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-3 border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openPreviewDialog(doc)}
                          className="text-sm font-medium text-[#CFAF6E] hover:underline truncate block text-left w-full"
                        >
                          {doc.fileName}
                        </button>
                        <p className="text-xs text-gray-500 break-words">
                          {DOCUMENT_TYPE_LABELS[doc.documentType]} •{' '}
                          {formatFileSize(doc.fileSize)} •{' '}
                          {new Date(doc.createdAt).toLocaleString('vi-VN')}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            value={doc.documentType}
                            onChange={(e) => handleDocumentTypeChange(doc.id, e.target.value)}
                            disabled={updatingTypeDocumentId === doc.id}
                            className="px-2 py-1 rounded-md border border-gray-300 bg-white text-xs flex-shrink-0"
                            aria-label="document-type"
                          >
                            <option value="CCCD">{t('profile.documents.types.CCCD')}</option>
                            <option value="HDLD">{t('profile.documents.types.HDLD')}</option>
                            <option value="CHUNG_CHI">
                              {t('profile.documents.types.CHUNG_CHI')}
                            </option>
                            <option value="OTHER">{t('profile.documents.types.OTHER')}</option>
                          </select>
                          {updatingTypeDocumentId === doc.id && (
                            <Loader2
                              className="h-3 w-3 animate-spin text-gray-500"
                              aria-label="document-type-updating"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className="p-1.5 rounded-lg text-[#CFAF6E] hover:bg-[#F5F7FA]"
                        aria-label="download-document"
                        title={t('document.download')}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="delete-document"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

          {/* Workspace name settings — only for workspaces user owns */}
          {workspaces.filter((ws) => ws.role === 'OWNER').length > 0 && (
            <div className="glass-content-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Pencil className="h-4 w-4 text-[#CFAF6E]" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('profile.workspaceSettings.title')}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {t('profile.workspaceSettings.description')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspaces
                  .filter((ws) => ws.role === 'OWNER')
                  .map((ws) => (
                    <div key={ws.id}>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {ws.type === 'COMPANY' ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {t('workspace.company')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t('workspace.personal')}
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={workspaceNames[ws.id] ?? ''}
                          onChange={(e) =>
                            setWorkspaceNames((prev) => ({ ...prev, [ws.id]: e.target.value }))
                          }
                          placeholder={t('profile.workspaceSettings.placeholder')}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                          maxLength={100}
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveWorkspaceName(ws.id)}
                          disabled={savingWorkspaceId === ws.id || !(workspaceNames[ws.id] ?? '').trim()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {savingWorkspaceId === ws.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {t('profile.workspaceSettings.save')}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Workspace tabs content ─── */}
      {workspaces.map(
        (ws) =>
          activeTab === ws.id && (
            <WorkspaceProfileTab
              key={ws.id}
              workspaceId={ws.id}
              workspaceName={ws.name}
              workspaceType={ws.type}
            />
          ),
      )}

      {/* ─── Dialogs ─── */}
      <BaseImagePreviewDialog
        isOpen={Boolean(previewingDocument) && isPreviewImage}
        items={
          previewingDocument && previewUrl
            ? [
                {
                  src: previewUrl,
                  title: previewingDocument.fileName || 'Tai lieu',
                  downloadFileName: previewingDocument.fileName || 'tai-lieu',
                },
              ]
            : []
        }
        currentIndex={previewingDocument && isPreviewImage ? 0 : null}
        onClose={closePreviewDialog}
        onDownload={() => {
          if (!previewingDocument) return;
          void downloadDocument(previewingDocument);
        }}
      />

      <DocumentPreviewDialog
        isOpen={Boolean(previewingDocument) && !isPreviewImage}
        isLoading={previewLoading}
        fileName={previewingDocument?.fileName || 'Tai lieu'}
        mimeType={previewMimeType}
        previewUrl={previewUrl}
        onClose={closePreviewDialog}
        onDownload={() => {
          if (!previewingDocument) return;
          void downloadDocument(previewingDocument);
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('profile.documents.deleteTitle')}
        message={t('profile.documents.deleteConfirmWithFile', {
          fileName: documentToDelete?.fileName ?? '',
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous
        isLoading={isDeletingDocument}
        onConfirm={handleConfirmDeleteDocument}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDocumentToDelete(null);
        }}
      />
    </div>
  );
}

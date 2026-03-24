'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  MailCheck,
  Save,
  Trash2,
  Camera,
  Building2,
  User,
  ImageIcon,
} from 'lucide-react';
import { DocumentListPanel } from '@/components/common/document-list-panel';
import { BaseImagePreviewDialog } from '@/components/common/base-image-preview-dialog';
import { DocumentTypeValue, useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
import { ProfileSkeleton } from '@/components/common/skeleton';
import { WorkspaceProfileTab } from '@/components/profile/workspace-profile-tab';
import { WorkspaceSearchSection } from '@/components/workspace/workspace-search-section';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UserDocument } from '@/types';

interface FormState {
  fullName: string;
  email: string;
  fullAddress: string;
  phone: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  fullAddress: '',
  phone: '',
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
    renameDocument,
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
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [updatingTypeDocumentId, setUpdatingTypeDocumentId] = useState<string | null>(null);
  const [workspaceNames, setWorkspaceNames] = useState<Record<string, string>>({});
  const [workspaceCodes, setWorkspaceCodes] = useState<Record<string, string>>({});
  const [workspaceAddresses, setWorkspaceAddresses] = useState<Record<string, string>>({});
  const [workspaceLogos, setWorkspaceLogos] = useState<Record<string, string>>({});
  const [workspaceIsPublic, setWorkspaceIsPublic] = useState<Record<string, boolean>>({});
  const [workspaceRequireKyc, setWorkspaceRequireKyc] = useState<Record<string, boolean>>({});
  const [savingWorkspaceId, setSavingWorkspaceId] = useState<string | null>(null);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);
  const [logoPreviewWsId, setLogoPreviewWsId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaces.length === 0) return;
    setWorkspaceNames((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => { if (!(ws.id in next)) next[ws.id] = ws.name; });
      return next;
    });
    setWorkspaceCodes((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => { if (!(ws.id in next)) next[ws.id] = ws.code ?? ''; });
      return next;
    });
    setWorkspaceAddresses((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => { if (!(ws.id in next)) next[ws.id] = ws.address ?? ''; });
      return next;
    });
    setWorkspaceLogos((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => { if (!(ws.id in next)) next[ws.id] = ws.logoUrl ?? ''; });
      return next;
    });
    setWorkspaceIsPublic((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => { if (!(ws.id in next)) next[ws.id] = ws.isPublic ?? false; });
      return next;
    });
    setWorkspaceRequireKyc((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => { if (!(ws.id in next)) next[ws.id] = ws.requireKyc ?? false; });
      return next;
    });
  }, [workspaces]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      fullAddress: profile.addressLine ?? '',
      phone: profile.phone ?? '',
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

  const handleDeleteDocument = async (docId: string) => {
    await deleteDocument(docId);
  };

  const handleRenameDocument = async (docId: string, fileName: string) => {
    await renameDocument(docId, fileName);
  };

  const handleSaveWorkspaceInfo = async (wsId: string) => {
    const name = (workspaceNames[wsId] ?? '').trim();
    if (!name) return;
    setSavingWorkspaceId(wsId);
    try {
      await apiClient.patch(`/workspaces/${wsId}`, {
        name,
        code: (workspaceCodes[wsId] ?? '').trim() || undefined,
        address: (workspaceAddresses[wsId] ?? '').trim() || undefined,
        isPublic: workspaceIsPublic[wsId] ?? false,
        requireKyc: workspaceRequireKyc[wsId] ?? false,
      });
      updateWorkspaceName(wsId, name);
      void refetchWorkspaces();
      toast.success(t('profile.workspaceSettings.saveSuccess'));
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { code?: string } } };
      if (apiError.response?.data?.code === 'WORKSPACE_CODE_TAKEN') {
        toast.error(t('profile.workspaceSettings.codeTaken'));
      } else {
        toast.error(t('profile.workspaceSettings.saveError'));
      }
    } finally {
      setSavingWorkspaceId(null);
    }
  };

  const handleLogoUpload = async (wsId: string, file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) { toast.error(t('profile.avatar.fileTypesSupported')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('profile.avatar.maxSize')); return; }
    setUploadingLogoId(wsId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post(`/workspaces/${wsId}/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = data?.data?.logoUrl;
      if (logoUrl) {
        setWorkspaceLogos((prev) => ({ ...prev, [wsId]: logoUrl }));
        void refetchWorkspaces();
        toast.success(t('profile.workspaceSettings.logoSuccess'));
      }
    } catch {
      toast.error(t('profile.workspaceSettings.logoError'));
    } finally {
      setUploadingLogoId(null);
    }
  };

  const canLinkPhone = !profile?.phone;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitize = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
    await updateProfile({
      ...(canLinkPhone && form.phone.trim() ? { phone: form.phone.trim() } : {}),
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

  const handleDocumentTypeChange = async (docId: string, newType: string) => {
    setUpdatingTypeDocumentId(docId);
    try {
      await updateDocumentType(docId, newType as DocumentTypeValue);
    } finally {
      setUpdatingTypeDocumentId(null);
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="glass-content-card rounded-xl">
      {/* ─── Tab navigation ─── */}
      <div className="flex items-center gap-0 px-2 pt-1 border-b border-gray-200 overflow-x-auto">
        {/* Personal tab */}
        <button
          onClick={() => setActiveTab('personal')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px',
            activeTab === 'personal'
              ? 'border-[#0B1F3A] text-[#0B1F3A]'
              : 'border-transparent text-gray-500 hover:text-gray-700',
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
              'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px',
              activeTab === ws.id
                ? 'border-[#CFAF6E] text-[#CFAF6E]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
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
        <div className="p-5 space-y-[0.8rem]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[0.8rem]">
          {/* Left: Form thông tin cá nhân */}
          <form
            onSubmit={handleSave}
            className="border border-gray-200 dark:border-white/[0.15] bg-white/70 dark:bg-white/[0.07] rounded-xl p-6 space-y-6"
          >
            {/* ── Avatar ── */}
            <div className="flex items-center gap-5 pb-6 border-b border-gray-200">
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    'w-20 h-20 bg-[#CFAF6E]/15 text-[#0B1F3A] rounded-full flex items-center justify-center text-xl font-semibold overflow-hidden',
                    avatarUrl && 'cursor-pointer ring-2 ring-transparent hover:ring-[#CFAF6E] transition-all',
                  )}
                  onClick={() => avatarUrl && setAvatarPreviewOpen(true)}
                  title={avatarUrl ? t('common.preview') : undefined}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-2">{t('profile.section.avatar')}</p>
                <div className="flex gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Camera className="h-4 w-4" />
                    {avatarUrl ? t('memberEdit.label.changeAvatar') : t('memberEdit.label.uploadAvatar')}
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('memberEdit.label.removeAvatar')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{t('profile.avatar.validationMsg')}</p>
              </div>
            </div>

            {/* ── Thông tin cơ bản ── */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('profile.section.basicInfo')}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone — read-only for phone accounts; editable for Google/Apple users to link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('profile.label.phone')}
                    {canLinkPhone && (
                      <span className="ml-2 text-xs text-[#CFAF6E] font-normal">
                        {t('profile.phone.linkHint') || 'Nhập để liên kết đăng nhập bằng SĐT'}
                      </span>
                    )}
                  </label>
                  {canLinkPhone ? (
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="VD: 0905xxxxxx"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                    />
                  ) : (
                    <input
                      value={profile?.phone ?? ''}
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm"
                    />
                  )}
                </div>

                {/* Full name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('profile.label.email')}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder={t('profile.form.emailPlaceholder')}
                      disabled={isEmailVerified}
                      className={cn(
                        'w-full px-3 py-2 pr-12 rounded-lg border text-sm',
                        isEmailVerified
                          ? 'border-gray-200 bg-gray-50 text-gray-500'
                          : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]',
                      )}
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

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('personalInfoForm.gender')}
                  </label>
                  <select
                    value={locationData.gender || ''}
                    onChange={(e) => setLocationData((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] bg-white"
                  >
                    <option value="">{t('personalInfoForm.genderPlaceholder')}</option>
                    <option value="MALE">{t('personalInfoForm.genderMale')}</option>
                    <option value="FEMALE">{t('personalInfoForm.genderFemale')}</option>
                    <option value="OTHER">{t('personalInfoForm.genderOther')}</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('personalInfoForm.dateOfBirth')}
                  </label>
                  <input
                    type="date"
                    value={locationData.dateOfBirth || ''}
                    onChange={(e) => setLocationData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
                  />
                </div>
              </div>
            </div>

            {/* ── Địa chỉ ── */}
            <div className="space-y-4">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('profile.section.address')}
              </h5>
              <PersonalInfoForm
                data={locationData}
                onChange={setLocationData}
                showGenderAndDOB={false}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('profile.label.address')}
                </label>
                <input
                  value={form.fullAddress}
                  onChange={(e) => setForm((p) => ({ ...p, fullAddress: e.target.value }))}
                  placeholder={t('profile.form.addressPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                />
              </div>
            </div>

            {/* Save */}
            <div className="pt-2 flex justify-end border-t border-gray-200">
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
          <div className="border border-gray-200 dark:border-white/[0.15] bg-white/70 dark:bg-white/[0.07] rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t('profile.section.documents')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('profile.documents.uploadHint')}</p>
            </div>
            <DocumentListPanel
              documents={documents}
              onUpload={async (file, type) => {
                await uploadDocument(file, type as DocumentTypeValue);
              }}
              onDelete={handleDeleteDocument}
              onUpdateType={handleDocumentTypeChange}
              onRename={handleRenameDocument}
              onFetchPreview={async (doc) => {
                const blob = await fetchDocumentBlob(doc as UserDocument);
                return { url: URL.createObjectURL(blob), mimeType: blob.type || (doc.fileType ?? '') };
              }}
              onDownload={(doc) => void downloadDocument(doc as UserDocument)}
              updatingTypeIds={updatingTypeDocumentId ? { [updatingTypeDocumentId]: true } : {}}
            />
          </div>
        </div>

          {/* Workspace search & join section */}
          <div className="border border-gray-200 dark:border-white/[0.15] bg-white/70 dark:bg-white/[0.07] rounded-xl p-6">
            <WorkspaceSearchSection
              userFullName={profile?.fullName ?? null}
              userPhone={profile?.phone ?? null}
              existingWorkspaceIds={workspaces.map((ws) => ws.id)}
              userAddressLine={profile?.addressLine ?? null}
              userProvinceCode={profile?.provinceCode ?? ''}
              userProvinceName={profile?.provinceName ?? ''}
              userWardCode={profile?.wardCode ?? ''}
              userWardName={profile?.wardName ?? ''}
            />
          </div>

          {/* Workspace info settings — only for workspaces user owns */}
          {workspaces.filter((ws) => ws.role === 'OWNER').length > 0 && (
            <div className="border border-gray-200 dark:border-white/[0.15] bg-white/70 dark:bg-white/[0.07] rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-[#CFAF6E]" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('profile.workspaceSettings.title')}
                </h3>
              </div>
              <p className="text-xs text-gray-500 -mt-4">
                {t('profile.workspaceSettings.description')}
              </p>

              <div className="space-y-8">
                {workspaces
                  .filter((ws) => ws.role === 'OWNER')
                  .map((ws) => (
                    <div key={ws.id} className="border border-gray-200 rounded-xl p-5 space-y-5">
                      {/* Workspace type badge — only shown for COMPANY */}
                      {ws.type === 'COMPANY' && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#CFAF6E]" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {t('workspace.company')}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Logo */}
                        <div className="md:col-span-2 flex items-center gap-4">
                          <div
                            className={`w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0 ${workspaceLogos[ws.id] ? 'cursor-pointer hover:ring-2 hover:ring-[#CFAF6E] transition-all' : ''}`}
                            onClick={() => workspaceLogos[ws.id] && setLogoPreviewWsId(ws.id)}
                            role={workspaceLogos[ws.id] ? 'button' : undefined}
                            aria-label={workspaceLogos[ws.id] ? t('profile.workspaceSettings.logo') : undefined}
                          >
                            {workspaceLogos[ws.id] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={workspaceLogos[ws.id]}
                                alt={ws.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1.5">
                              {t('profile.workspaceSettings.logo')}
                            </p>
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                              {uploadingLogoId === ws.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                              {t('profile.workspaceSettings.uploadLogo')}
                              <input
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/jpg,image/png"
                                disabled={uploadingLogoId === ws.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleLogoUpload(ws.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <p className="text-xs text-gray-400 mt-1">{t('profile.avatar.validationMsg')}</p>
                          </div>
                        </div>

                        {/* Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('profile.workspaceSettings.nameLabel')}
                            <span className="text-red-500 ml-0.5">*</span>
                          </label>
                          <input
                            value={workspaceNames[ws.id] ?? ''}
                            onChange={(e) =>
                              setWorkspaceNames((prev) => ({ ...prev, [ws.id]: e.target.value }))
                            }
                            placeholder={t('profile.workspaceSettings.namePlaceholder')}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                            maxLength={100}
                          />
                        </div>

                        {/* Code */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('profile.workspaceSettings.codeLabel')}
                          </label>
                          <input
                            value={workspaceCodes[ws.id] ?? ''}
                            onChange={(e) =>
                              setWorkspaceCodes((prev) => ({
                                ...prev,
                                [ws.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                              }))
                            }
                            placeholder={t('profile.workspaceSettings.codePlaceholder')}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm font-mono uppercase"
                            maxLength={50}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            {t('profile.workspaceSettings.codeHint')}
                          </p>
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('profile.workspaceSettings.addressLabel')}
                          </label>
                          <input
                            value={workspaceAddresses[ws.id] ?? ''}
                            onChange={(e) =>
                              setWorkspaceAddresses((prev) => ({ ...prev, [ws.id]: e.target.value }))
                            }
                            placeholder={t('profile.workspaceSettings.addressPlaceholder')}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                            maxLength={500}
                          />
                        </div>

                        {/* isPublic checkbox */}
                        <div className="md:col-span-2 flex items-start gap-3 pt-1">
                          <input
                            type="checkbox"
                            id={`ws-public-${ws.id}`}
                            checked={workspaceIsPublic[ws.id] ?? false}
                            onChange={(e) =>
                              setWorkspaceIsPublic((prev) => ({ ...prev, [ws.id]: e.target.checked }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#CFAF6E] cursor-pointer"
                          />
                          <label htmlFor={`ws-public-${ws.id}`} className="cursor-pointer">
                            <span className="text-sm font-medium text-gray-700">
                              {t('profile.workspaceSettings.isPublicLabel')}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t('profile.workspaceSettings.isPublicHint')}
                            </p>
                          </label>
                        </div>

                        {/* requireKyc checkbox */}
                        <div className="md:col-span-2 flex items-start gap-3 pt-1">
                          <input
                            type="checkbox"
                            id={`ws-kyc-${ws.id}`}
                            checked={workspaceRequireKyc[ws.id] ?? false}
                            onChange={(e) =>
                              setWorkspaceRequireKyc((prev) => ({ ...prev, [ws.id]: e.target.checked }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#CFAF6E] cursor-pointer"
                          />
                          <label htmlFor={`ws-kyc-${ws.id}`} className="cursor-pointer">
                            <span className="text-sm font-medium text-gray-700">
                              {t('profile.workspaceSettings.requireKycLabel')}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t('profile.workspaceSettings.requireKycHint')}
                            </p>
                          </label>
                        </div>
                      </div>

                      {/* Save button */}
                      <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => void handleSaveWorkspaceInfo(ws.id)}
                          disabled={savingWorkspaceId === ws.id || !(workspaceNames[ws.id] ?? '').trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div key={ws.id} className="p-5 space-y-[0.8rem]">
              <WorkspaceProfileTab
                workspaceId={ws.id}
                workspaceName={ws.name}
                workspaceType={ws.type}
              />
            </div>
          ),
      )}

      <BaseImagePreviewDialog
        isOpen={avatarPreviewOpen}
        items={avatarUrl ? [{ src: avatarUrl, title: displayName, downloadFileName: 'avatar' }] : []}
        currentIndex={avatarUrl ? 0 : null}
        onClose={() => setAvatarPreviewOpen(false)}
      />

      <BaseImagePreviewDialog
        isOpen={logoPreviewWsId !== null}
        items={
          logoPreviewWsId && workspaceLogos[logoPreviewWsId]
            ? [{ src: workspaceLogos[logoPreviewWsId], title: workspaces.find((w) => w.id === logoPreviewWsId)?.name ?? 'Logo', downloadFileName: 'workspace-logo' }]
            : []
        }
        currentIndex={logoPreviewWsId && workspaceLogos[logoPreviewWsId] ? 0 : null}
        onClose={() => setLogoPreviewWsId(null)}
      />
    </div>
  );
}

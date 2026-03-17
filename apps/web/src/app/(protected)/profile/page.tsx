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
} from 'lucide-react';
import { DocumentTypeOption, DocumentTypeValue, useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { BaseImagePreviewDialog } from '@/components/common/base-image-preview-dialog';
import { DocumentPreviewDialog } from '@/components/common/document-preview-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
import { ProfileSkeleton } from '@/components/common/skeleton';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
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
  const { refreshProfile } = useAuth();

  usePageSetup({
    title: 'Hồ sơ cá nhân',
    subtitle: 'Cập nhật thông tin của bạn và xác thực email',
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

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      fullAddress: profile.addressLine ?? '',
    });
    const locationUpdate = {
      provinceCode: profile.provinceCode ?? '',
      provinceName: profile.provinceName ?? '',
      wardCode: profile.wardCode ?? '',
      wardName: profile.wardName ?? '',
      gender: profile.gender ?? '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
    };
    console.log('[ProfilePage] Loading profile location data:', locationUpdate);
    setLocationData(locationUpdate);
    setAvatarUrl(profile.avatarUrl ?? '');
  }, [profile]);

  const isEmailVerified = Boolean(profile?.emailVerifiedAt);
  const canVerifyEmail = Boolean(form.email.trim()) && !isEmailVerified;

  const displayName = profile?.fullName ?? profile?.phone ?? profile?.email ?? 'Người dùng';
  const initials = displayName.slice(0, 2).toUpperCase() || 'PC';

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Chỉ hỗ trợ file ảnh JPG, PNG');
      return;
    }

    // Validate file size (max 5MB for avatar)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh đại diện tối đa 5MB');
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    // Upload immediately
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post('/me/profile/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = data?.data?.downloadUrl;
      if (uploadedUrl) {
        // Save avatar URL to database immediately
        await updateProfile({ avatarUrl: uploadedUrl });
        setAvatarUrl(uploadedUrl);
        toast.success('Đã cập nhật ảnh đại diện');
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { code?: string } } };
      const code = apiError.response?.data?.code;
      if (code === 'FILE_TOO_LARGE') {
        toast.error('Ảnh quá lớn (tối đa 5MB)');
      } else {
        toast.error('Không thể tải ảnh lên');
      }
      URL.revokeObjectURL(previewUrl);
      setAvatarUrl(profile?.avatarUrl ?? '');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrl);
    }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize payload - convert empty strings to undefined to avoid validation errors
    const sanitizeValue = (value: string | undefined) => {
      return value && value.trim() ? value.trim() : undefined;
    };

    await updateProfile({
      fullName: sanitizeValue(form.fullName),
      email: sanitizeValue(form.email),
      addressLine: sanitizeValue(form.fullAddress),
      provinceCode: sanitizeValue(locationData.provinceCode),
      provinceName: sanitizeValue(locationData.provinceName),
      districtCode: undefined, // Not used in PersonalInfoForm
      districtName: undefined, // Not used in PersonalInfoForm
      wardCode: sanitizeValue(locationData.wardCode),
      wardName: sanitizeValue(locationData.wardName),
      avatarUrl: sanitizeValue(avatarUrl),
      gender: sanitizeValue(locationData.gender),
      dateOfBirth: sanitizeValue(locationData.dateOfBirth),
    });

    await refreshProfile();
  };

  const handleSendVerify = async () => {
    if (!canVerifyEmail) return;
    setSendingVerify(true);
    try {
      // If email was typed but not saved yet, save it first so backend can find it
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
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewMimeType('');
    setPreviewingDocument(null);
    setPreviewLoading(false);
  };

  const openPreviewDialog = async (doc: UserDocument) => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

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
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const isPreviewImage =
    !previewLoading && previewMimeType.startsWith('image/') && Boolean(previewUrl);

  return (
    <div className="max-w-7xl space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cột trái: Form thông tin cá nhân */}
        <form
          onSubmit={handleSave}
          className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
        >
          {/* Avatar Upload Section */}
          <div className="pb-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Ảnh đại diện</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-semibold overflow-hidden">
                  {avatarUrl ? (
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
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer">
                  <Camera className="h-4 w-4" />
                  Tải ảnh lên
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
                    Xóa ảnh
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Chỉ hỗ trợ JPG, PNG. Tối đa 5MB.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              value={profile?.phone ?? ''}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Nhập tên của bạn"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Nhập email"
                className="w-full px-3 py-2 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isEmailVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="email-verified" />
                ) : (
                  <button
                    type="button"
                    aria-label="send-email-verification"
                    title="Gửi xác thực email"
                    disabled={!canVerifyEmail || sendingVerify}
                    onClick={handleSendVerify}
                    className="p-1 rounded hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sendingVerify ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <MailCheck className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
            <input
              value={form.fullAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, fullAddress: e.target.value }))}
              placeholder="VD: 123 Nguyễn Văn Linh"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Location & Personal Info Form */}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu thông tin
            </button>
          </div>
        </form>

        {/* Cột phải: Tài liệu liên quan */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Tài liệu liên quan</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Hỗ trợ PDF, DOC, DOCX, PNG, JPG (tối đa 20MB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={uploadDocumentType}
              onChange={(e) =>
                setUploadDocumentType(e.target.value as Exclude<DocumentTypeOption, 'ALL'>)
              }
              className="flex-1 px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-sm"
            >
              <option value="CCCD">Loại: CCCD</option>
              <option value="HDLD">Loại: HDLD</option>
              <option value="CHUNG_CHI">Loại: Chứng chỉ</option>
              <option value="OTHER">Loại: Khác</option>
            </select>

            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer whitespace-nowrap">
              {uploadingDocument ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Tải lên
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
            <label className="text-xs font-medium text-gray-600">Lọc theo loại</label>
            <select
              value={activeDocumentType}
              onChange={(e) => setDocumentTypeFilter(e.target.value as DocumentTypeOption)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-sm"
            >
              <option value="ALL">Tất cả</option>
              <option value="CCCD">CCCD</option>
              <option value="HDLD">HDLD</option>
              <option value="CHUNG_CHI">Chứng chỉ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          {documents.length === 0 ? (
            <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              Chưa có tài liệu nào được tải lên.
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
                        className="text-sm font-medium text-blue-600 hover:underline truncate block text-left w-full"
                      >
                        {doc.fileName}
                      </button>
                      <p className="text-xs text-gray-500 break-words">
                        {DOCUMENT_TYPE_LABELS[doc.documentType]} • {formatFileSize(doc.fileSize)} •{' '}
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
                          <option value="CCCD">CCCD</option>
                          <option value="HDLD">HDLD</option>
                          <option value="CHUNG_CHI">Chứng chỉ</option>
                          <option value="OTHER">Khác</option>
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
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                      aria-label="download-document"
                      title="Tải xuống"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      aria-label="delete-document"
                      title="Xóa"
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
        title="Xóa tài liệu"
        message={`Bạn có chắc chắn muốn xóa tài liệu "${documentToDelete?.fileName}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
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

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailCheck, Save, Upload, Trash2, FileText, Download } from 'lucide-react';
import { DocumentTypeOption, DocumentTypeValue, useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { DocumentPreviewDialog } from '@/components/common/document-preview-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import type { UserDocument } from '@/types';

interface LocationItem {
  code: number;
  name: string;
}

interface ProvinceV2Item {
  code: number;
  name: string;
}

interface ProvinceV2Detail {
  code: number;
  name: string;
  wards: Array<{
    code: number;
    name: string;
  }>;
}

interface FormState {
  fullName: string;
  email: string;
  fullAddress: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  fullAddress: '',
  provinceCode: '',
  provinceName: '',
  wardCode: '',
  wardName: '',
};

export default function ProfilePage() {
  const { t } = useI18n();
  const { refreshProfile } = useAuth();
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
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState<Exclude<DocumentTypeOption, 'ALL'>>('OTHER');
  const [updatingTypeDocumentId, setUpdatingTypeDocumentId] = useState<string | null>(null);
  const [previewingDocument, setPreviewingDocument] = useState<UserDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<UserDocument | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  const loadProvinceWards = async (provinceCode: string) => {
    const response = await fetch(
      `https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`,
    );
    const payload = (await response.json()) as ProvinceV2Detail;
    return (payload.wards || []).map((item) => ({ code: item.code, name: item.name }));
  };

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      fullAddress: profile.addressLine ?? '',
      provinceCode: profile.provinceCode ?? '',
      provinceName: profile.provinceName ?? '',
      wardCode: profile.wardCode ?? '',
      wardName: profile.wardName ?? '',
    });
  }, [profile]);

  useEffect(() => {
    const loadLocations = async () => {
      setLocationLoading(true);
      try {
        const response = await fetch('https://provinces.open-api.vn/api/v2/');
        const payload = (await response.json()) as ProvinceV2Item[];
        setProvinces(
          (payload || []).map((item) => ({
            code: item.code,
            name: item.name,
          })),
        );
      } finally {
        setLocationLoading(false);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    if (!form.provinceCode) {
      setWards([]);
      return;
    }

    const run = async () => {
      setWardLoading(true);
      try {
        const wardItems = await loadProvinceWards(form.provinceCode);
        setWards(wardItems);
      } catch {
        setWards([]);
      } finally {
        setWardLoading(false);
      }
    };

    run();
  }, [form.provinceCode]);

  const isEmailVerified = Boolean(profile?.emailVerifiedAt);
  const canVerifyEmail = Boolean(form.email.trim()) && !isEmailVerified;

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

  const handleProvinceChange = (code: string) => {
    const province = provinces.find((item) => String(item.code) === code);
    setForm((prev) => ({
      ...prev,
      provinceCode: code,
      provinceName: province?.name ?? '',
      wardCode: '',
      wardName: '',
    }));
  };

  const handleWardChange = (code: string) => {
    const ward = wards.find((item) => String(item.code) === code);
    setForm((prev) => ({
      ...prev,
      wardCode: code,
      wardName: ward?.name ?? '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateProfile({
      fullName: form.fullName,
      email: form.email,
      addressLine: form.fullAddress,
      provinceCode: form.provinceCode,
      provinceName: form.provinceName,
      wardCode: form.wardCode,
      wardName: form.wardName,
    });

    await refreshProfile();
  };

  const handleSendVerify = async () => {
    if (!canVerifyEmail) return;
    setSendingVerify(true);
    try {
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
    return <div className="text-sm text-gray-500">Dang tai profile...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ho so ca nhan</h1>
        <p className="text-sm text-gray-500 mt-1">Cap nhat thong tin cua ban va xac thuc email</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">So dien thoai</label>
          <input
            value={profile?.phone ?? ''}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ten</label>
          <input
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Nhap ten cua ban"
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
              placeholder="Nhap email"
              className="w-full px-3 py-2 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {isEmailVerified ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="email-verified" />
              ) : (
                <button
                  type="button"
                  aria-label="send-email-verification"
                  title="Gui xac thuc email"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Dia chi day du</label>
          <input
            value={form.fullAddress}
            onChange={(e) => setForm((prev) => ({ ...prev, fullAddress: e.target.value }))}
            placeholder="VD: 123 Nguyen Van Linh, Phuong Ngu Hanh Son, Thanh pho Da Nang"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tinh/Thanh pho</label>
            <select
              value={form.provinceCode}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={locationLoading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Chon tinh/thanh</option>
              {provinces.map((item) => (
                <option key={item.code} value={String(item.code)}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phuong/Xa</label>
            <select
              value={form.wardCode}
              onChange={(e) => handleWardChange(e.target.value)}
              disabled={!form.provinceCode || locationLoading || wardLoading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Chon phuong/xa</option>
              {wards.map((item) => (
                <option key={item.code} value={String(item.code)}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dia chi</label>
          <input
            value={form.wardName}
            onChange={(e) => setForm((prev) => ({ ...prev, wardName: e.target.value, wardCode: '' }))}
            placeholder="Neu can, nhap tay ten phuong/xa"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Luu thong tin
          </button>
        </div>

        <div className="pt-6 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Tai lieu lien quan</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ho tro PDF, DOC, DOCX, PNG, JPG (toi da 20MB)</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={uploadDocumentType}
                onChange={(e) => setUploadDocumentType(e.target.value as Exclude<DocumentTypeOption, 'ALL'>)}
                className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-sm"
              >
                <option value="CCCD">Loai: CCCD</option>
                <option value="HDLD">Loai: HDLD</option>
                <option value="CHUNG_CHI">Loai: Chung chi</option>
                <option value="OTHER">Loai: Khac</option>
              </select>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer">
                {uploadingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Tai len
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleUploadDocument}
                  disabled={uploadingDocument}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Loc theo loai</label>
            <select
              value={activeDocumentType}
              onChange={(e) => setDocumentTypeFilter(e.target.value as DocumentTypeOption)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-sm"
            >
              <option value="ALL">Tat ca</option>
              <option value="CCCD">CCCD</option>
              <option value="HDLD">HDLD</option>
              <option value="CHUNG_CHI">Chung chi</option>
              <option value="OTHER">Khac</option>
            </select>
          </div>

          {documents.length === 0 ? (
            <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
              Chua co tai lieu nao duoc tai len.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openPreviewDialog(doc)}
                        className="text-sm font-medium text-blue-600 hover:underline truncate block text-left"
                      >
                        {doc.fileName}
                      </button>
                      <p className="text-xs text-gray-500">
                        {DOCUMENT_TYPE_LABELS[doc.documentType]} • {formatFileSize(doc.fileSize)} •{' '}
                        {new Date(doc.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={doc.documentType}
                      onChange={(e) => handleDocumentTypeChange(doc.id, e.target.value)}
                      disabled={updatingTypeDocumentId === doc.id}
                      className="px-2 py-1.5 rounded-md border border-gray-300 bg-white text-xs"
                      aria-label="document-type"
                    >
                      <option value="CCCD">CCCD</option>
                      <option value="HDLD">HDLD</option>
                      <option value="CHUNG_CHI">Chung chi</option>
                      <option value="OTHER">Khac</option>
                    </select>
                    {updatingTypeDocumentId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" aria-label="document-type-updating" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => downloadDocument(doc)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                      aria-label="download-document"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      aria-label="delete-document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <DocumentPreviewDialog
        isOpen={Boolean(previewingDocument)}
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

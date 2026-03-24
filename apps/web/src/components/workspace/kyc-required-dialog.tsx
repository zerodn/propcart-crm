'use client';

import { useState, useRef, useCallback } from 'react';
import { Shield, Upload, CheckCircle2, Clock, XCircle, ImageIcon, Camera, Loader2, LogOut } from 'lucide-react';
import { BaseDialog } from '@/components/common/base-dialog';
import { useI18n } from '@/providers/i18n-provider';
import { useAuth } from '@/providers/auth-provider';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

type KycStatus = 'NONE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;

interface KycRequiredDialogProps {
  workspaceId: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string | null;
  onKycSubmitted: () => void;
  /** When provided, dialog is closeable (non-blocking usage e.g. from profile page) */
  onClose?: () => void;
}

interface UploadedFile {
  id: string;
  previewUrl: string;
  fileName: string;
}

function UploadSlot({
  label,
  file,
  uploading,
  onFileSelected,
  onRemove,
  iconNode,
  instruction,
}: {
  label: string;
  file: UploadedFile | null;
  uploading: boolean;
  onFileSelected: (f: File) => void;
  onRemove: () => void;
  /** Override icon shown in the empty-state placeholder */
  iconNode?: React.ReactNode;
  /** Descriptive guidance shown in the empty-state placeholder */
  instruction?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) onFileSelected(picked);
    // reset so same file can be reselected
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#0B1F3A]">{label}</span>
      {file ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#CFAF6E] bg-gray-50 h-44 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.previewUrl}
            alt={file.fileName}
            className="object-contain h-full w-full p-1"
          />
          {!uploading && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow text-red-500 transition-colors"
              aria-label="Xoá ảnh"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-[#CFAF6E]" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-44 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#CFAF6E] bg-gray-50 hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#CFAF6E] disabled:opacity-50 disabled:cursor-not-allowed px-3"
          aria-label={label}
        >
          {iconNode ?? <ImageIcon className="h-8 w-8" />}
          {instruction ? (
            <span className="text-xs text-center leading-relaxed max-w-[220px]">{instruction}</span>
          ) : (
            <span className="text-sm font-medium">{t('kyc.uploadHint')}</span>
          )}
          <span className="text-xs opacity-60">JPG, PNG ≤ 5MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        aria-label={label}
      />
    </div>
  );
}

export function KycRequiredDialog({
  workspaceId,
  kycStatus,
  kycRejectionReason,
  onKycSubmitted,
  onClose,
}: KycRequiredDialogProps) {
  const { t } = useI18n();
  const { logout } = useAuth();

  const [frontFile, setFrontFile] = useState<UploadedFile | null>(null);
  const [backFile, setBackFile] = useState<UploadedFile | null>(null);
  const [selfieFile, setSelfieFile] = useState<UploadedFile | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOpen = kycStatus === 'NONE' || kycStatus === 'SUBMITTED' || kycStatus === 'REJECTED';

  const uploadFile = useCallback(async (file: File, workspaceIdParam: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('documentType', 'CCCD');
    // Use workspaceId to scope the document
    if (workspaceIdParam) {
      formData.append('workspaceId', workspaceIdParam);
    }
    const { data } = await apiClient.post('/me/profile/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.data?.id as string;
  }, []);

  const handleFrontSelected = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setUploadingFront(true);
      try {
        const id = await uploadFile(file, workspaceId);
        setFrontFile({ id, previewUrl, fileName: file.name });
      } catch {
        toast.error(t('kyc.uploadError'));
        URL.revokeObjectURL(previewUrl);
      } finally {
        setUploadingFront(false);
      }
    },
    [uploadFile, workspaceId, t],
  );

  const handleBackSelected = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setUploadingBack(true);
      try {
        const id = await uploadFile(file, workspaceId);
        setBackFile({ id, previewUrl, fileName: file.name });
      } catch {
        toast.error(t('kyc.uploadError'));
        URL.revokeObjectURL(previewUrl);
      } finally {
        setUploadingBack(false);
      }
    },
    [uploadFile, workspaceId, t],
  );

  const handleRemoveFront = useCallback(() => {
    if (frontFile) URL.revokeObjectURL(frontFile.previewUrl);
    setFrontFile(null);
  }, [frontFile]);

  const handleRemoveBack = useCallback(() => {
    if (backFile) URL.revokeObjectURL(backFile.previewUrl);
    setBackFile(null);
  }, [backFile]);

  const handleSelfieSelected = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setUploadingSelfie(true);
      try {
        const id = await uploadFile(file, workspaceId);
        setSelfieFile({ id, previewUrl, fileName: file.name });
      } catch {
        toast.error(t('kyc.uploadError'));
        URL.revokeObjectURL(previewUrl);
      } finally {
        setUploadingSelfie(false);
      }
    },
    [uploadFile, workspaceId, t],
  );

  const handleRemoveSelfie = useCallback(() => {
    if (selfieFile) URL.revokeObjectURL(selfieFile.previewUrl);
    setSelfieFile(null);
  }, [selfieFile]);

  const handleSubmit = async () => {
    if (!frontFile) {
      toast.error(t('kyc.requireCccdFront'));
      return;
    }
    if (!backFile) {
      toast.error(t('kyc.requireCccdBack'));
      return;
    }
    if (!selfieFile) {
      toast.error(t('kyc.requireSelfie'));
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/me/kyc/submit`);
      toast.success(t('kyc.submitSuccess'));
      onKycSubmitted();
    } catch {
      toast.error(t('kyc.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!frontFile && !!backFile && !!selfieFile && !uploadingFront && !uploadingBack && !uploadingSelfie && !submitting;

  // ─── Pending State ──────────────────────────────────────────────────────────

  if (kycStatus === 'SUBMITTED') {
    return (
      <BaseDialog
        isOpen={isOpen}
        onClose={onClose ?? (() => {})}
        disableClose={!onClose}
        maxWidth="md"
        title={t('kyc.pendingTitle')}
      >
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0B1F3A] mb-2">{t('kyc.pendingTitle')}</h3>
            <p className="text-sm text-[#4B5563]">{t('kyc.pendingSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </BaseDialog>
    );
  }

  // ─── Upload Form (NONE / REJECTED) ─────────────────────────────────────────

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose ?? (() => {})}
      disableClose={!onClose}
      maxWidth="lg"
      title={t('kyc.title')}
      headerContent={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B1F3A] flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-[#CFAF6E]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0B1F3A]">{t('kyc.title')}</h2>
            <p className="text-xs text-[#9CA3AF] leading-tight">{t('kyc.subtitle')}</p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 text-sm text-[#4B5563] hover:text-red-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#CFAF6E] hover:bg-[#B89655] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('kyc.submitting')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {kycStatus === 'REJECTED' ? t('kyc.reuploadBtn') : t('kyc.submitBtn')}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Subtitle */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-medium">{t('kyc.uploadTitle')}</p>
          <p className="text-xs text-blue-600 mt-1">{t('kyc.uploadSubtitle')}</p>
        </div>

        {/* Rejection reason */}
        {kycStatus === 'REJECTED' && kycRejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">{t('kyc.rejectedTitle')}</p>
              <p className="text-xs text-red-600">
                {t('kyc.rejectionReason')}: {kycRejectionReason}
              </p>
            </div>
          </div>
        )}

        {/* CCCD Upload Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UploadSlot
            label={t('kyc.cccdFront')}
            file={frontFile}
            uploading={uploadingFront}
            onFileSelected={handleFrontSelected}
            onRemove={handleRemoveFront}
          />
          <UploadSlot
            label={t('kyc.cccdBack')}
            file={backFile}
            uploading={uploadingBack}
            onFileSelected={handleBackSelected}
            onRemove={handleRemoveBack}
          />
        </div>

        {/* Selfie with ID — full width */}
        <div className="border-t border-gray-100 pt-4">
          <UploadSlot
            label={t('kyc.selfieWithId')}
            file={selfieFile}
            uploading={uploadingSelfie}
            onFileSelected={handleSelfieSelected}
            onRemove={handleRemoveSelfie}
            iconNode={<Camera className="h-8 w-8" />}
            instruction={t('kyc.selfieWithIdHint')}
          />
        </div>

        {/* Upload progress indicators */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            {frontFile ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : uploadingFront ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span className={frontFile ? 'text-green-600' : 'text-gray-400'}>
              {t('kyc.cccdFront')} {frontFile ? `— ${frontFile.fileName}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {backFile ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : uploadingBack ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span className={backFile ? 'text-green-600' : 'text-gray-400'}>
              {t('kyc.cccdBack')} {backFile ? `— ${backFile.fileName}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {selfieFile ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : uploadingSelfie ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span className={selfieFile ? 'text-green-600' : 'text-gray-400'}>
              {t('kyc.selfieWithId')} {selfieFile ? `— ${selfieFile.fileName}` : ''}
            </span>
          </div>
        </div>
      </div>
    </BaseDialog>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Shield, Upload, CheckCircle2, Clock, XCircle, ImageIcon,
  Camera, Loader2, LogOut, Building2, User, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { useI18n } from '@/providers/i18n-provider';
import { ROLE_LABELS } from '@/types';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

type KycStatus = 'NONE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;

interface KycBlockingPageProps {
  workspaceId: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string | null;
  onKycSubmitted: () => void;
}

interface UploadedFile {
  id: string;
  previewUrl: string;
  fileName: string;
}

// ─── Upload Slot ──────────────────────────────────────────────────────────────

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
  iconNode?: React.ReactNode;
  instruction?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) onFileSelected(picked);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#0B1F3A]">{label}</span>
      {file ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#CFAF6E] bg-gray-50 h-44 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.previewUrl} alt={file.fileName} className="object-contain h-full w-full p-1" />
          {!uploading && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow text-red-500 transition-colors"
              aria-label={t('common.delete')}
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

// ─── Workspace Switcher (mini) ────────────────────────────────────────────────

function WorkspaceSwitcherMini() {
  const { workspace, switchWorkspace, logout } = useAuth();
  const { workspaces } = useWorkspaces();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside to close
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      {/* Workspace dropdown */}
      <div className="relative" ref={ref} onBlur={handleBlur}>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-[#0B1F3A] transition-colors shadow-sm"
        >
          <Building2 className="h-4 w-4 text-[#CFAF6E]" />
          <span className="max-w-[200px] truncate">{workspace?.name}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1">
            <p className="text-xs font-medium text-gray-400 px-3 py-2 uppercase tracking-wider">
              {t('kyc.switchWorkspace')}
            </p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  if (ws.id !== workspace?.id) switchWorkspace(ws.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${ws.id === workspace?.id ? 'bg-[#F5F7FA]' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {ws.type === 'COMPANY' ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-[#0B1F3A] truncate">{ws.name}</p>
                  <p className="text-xs text-gray-400">{ROLE_LABELS[ws.role] ?? ws.role}</p>
                </div>
                {ws.id === workspace?.id && (
                  <span className="text-xs text-[#CFAF6E] flex-shrink-0">{t('common.current')}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {t('sidebar.logout')}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KycBlockingPage({
  workspaceId,
  kycStatus,
  kycRejectionReason,
  onKycSubmitted,
}: KycBlockingPageProps) {
  const { t } = useI18n();

  const [frontFile, setFrontFile] = useState<UploadedFile | null>(null);
  const [backFile, setBackFile] = useState<UploadedFile | null>(null);
  const [selfieFile, setSelfieFile] = useState<UploadedFile | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadFile = useCallback(async (file: File, wsId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('documentType', 'CCCD');
    if (wsId) formData.append('workspaceId', wsId);
    const { data } = await apiClient.post('/me/profile/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.data?.id as string;
  }, []);

  const makeHandler = (
    setter: (f: UploadedFile | null) => void,
    setLoading: (v: boolean) => void,
  ) =>
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setLoading(true);
      try {
        const id = await uploadFile(file, workspaceId);
        setter({ id, previewUrl, fileName: file.name });
      } catch {
        toast.error(t('kyc.uploadError'));
        URL.revokeObjectURL(previewUrl);
      } finally {
        setLoading(false);
      }
    };

  const handleFrontSelected = useCallback(makeHandler(setFrontFile, setUploadingFront), [uploadFile, workspaceId, t]);
  const handleBackSelected = useCallback(makeHandler(setBackFile, setUploadingBack), [uploadFile, workspaceId, t]);
  const handleSelfieSelected = useCallback(makeHandler(setSelfieFile, setUploadingSelfie), [uploadFile, workspaceId, t]);

  const makeRemover = (file: UploadedFile | null, setter: (f: UploadedFile | null) => void) => () => {
    if (file) URL.revokeObjectURL(file.previewUrl);
    setter(null);
  };

  const handleSubmit = async () => {
    if (!frontFile) { toast.error(t('kyc.requireCccdFront')); return; }
    if (!backFile) { toast.error(t('kyc.requireCccdBack')); return; }
    if (!selfieFile) { toast.error(t('kyc.requireSelfie')); return; }
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

  const canSubmit = !!frontFile && !!backFile && !!selfieFile
    && !uploadingFront && !uploadingBack && !uploadingSelfie && !submitting;

  // ─── Pending State ──────────────────────────────────────────────────────────

  if (kycStatus === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
        {/* Top bar */}
        <div className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-center">
          <WorkspaceSwitcherMini />
        </div>
        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0B1F3A] mb-2">{t('kyc.pendingTitle')}</h3>
                <p className="text-sm text-[#4B5563]">{t('kyc.pendingSubtitle')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Upload Form (NONE / REJECTED) ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Top bar */}
      <div className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-center">
        <WorkspaceSwitcherMini />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-100">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A] flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-[#CFAF6E]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0B1F3A]">{t('kyc.title')}</h2>
              <p className="text-xs text-[#9CA3AF] leading-tight">{t('kyc.subtitle')}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Info */}
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
                  <p className="text-xs text-red-600">{t('kyc.rejectionReason')}: {kycRejectionReason}</p>
                </div>
              </div>
            )}

            {/* CCCD front + back */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UploadSlot
                label={t('kyc.cccdFront')}
                file={frontFile}
                uploading={uploadingFront}
                onFileSelected={handleFrontSelected}
                onRemove={makeRemover(frontFile, setFrontFile)}
              />
              <UploadSlot
                label={t('kyc.cccdBack')}
                file={backFile}
                uploading={uploadingBack}
                onFileSelected={handleBackSelected}
                onRemove={makeRemover(backFile, setBackFile)}
              />
            </div>

            {/* Selfie with ID */}
            <div className="border-t border-gray-100 pt-4">
              <UploadSlot
                label={t('kyc.selfieWithId')}
                file={selfieFile}
                uploading={uploadingSelfie}
                onFileSelected={handleSelfieSelected}
                onRemove={makeRemover(selfieFile, setSelfieFile)}
                iconNode={<Camera className="h-8 w-8" />}
                instruction={t('kyc.selfieWithIdHint')}
              />
            </div>

            {/* Progress indicators */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs">
                {frontFile ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : uploadingFront ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : <Upload className="h-3.5 w-3.5 text-gray-400" />}
                <span className={frontFile ? 'text-green-600' : 'text-gray-400'}>{t('kyc.cccdFront')} {frontFile ? `— ${frontFile.fileName}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {backFile ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : uploadingBack ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : <Upload className="h-3.5 w-3.5 text-gray-400" />}
                <span className={backFile ? 'text-green-600' : 'text-gray-400'}>{t('kyc.cccdBack')} {backFile ? `— ${backFile.fileName}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {selfieFile ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : uploadingSelfie ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : <Camera className="h-3.5 w-3.5 text-gray-400" />}
                <span className={selfieFile ? 'text-green-600' : 'text-gray-400'}>{t('kyc.selfieWithId')} {selfieFile ? `— ${selfieFile.fileName}` : ''}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CFAF6E] hover:bg-[#B89655] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
}

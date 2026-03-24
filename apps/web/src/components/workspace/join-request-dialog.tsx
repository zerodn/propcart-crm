'use client';

import { useState, useRef, useCallback } from 'react';
import { Loader2, User, Phone, Send, ImageIcon, MapPin, FileText } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { BaseDialog } from '@/components/common/base-dialog';
import { DocumentListPanel, type DocumentItem } from '@/components/common/document-list-panel';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type { WorkspaceSearchResult } from '@/types';

interface JoinRequestDialogProps {
  workspace: WorkspaceSearchResult;
  userFullName: string | null;
  userPhone: string | null;
  userAddressLine?: string | null;
  userProvinceCode?: string;
  userProvinceName?: string;
  userWardCode?: string;
  userWardName?: string;
  initialMessage?: string | null;
  previousDocCount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinRequestDialog({
  workspace,
  userFullName,
  userPhone,
  userAddressLine,
  userProvinceCode,
  userProvinceName,
  userWardCode,
  userWardName,
  initialMessage,
  previousDocCount,
  onClose,
  onSuccess,
}: JoinRequestDialogProps) {
  const { t } = useI18n();

  const [message, setMessage] = useState(initialMessage ?? '');
  const [addressLine, setAddressLine] = useState(userAddressLine ?? '');
  const [locationData, setLocationData] = useState<LocationFormData>({
    provinceCode: userProvinceCode ?? '',
    provinceName: userProvinceName ?? '',
    wardCode: userWardCode ?? '',
    wardName: userWardName ?? '',
  });

  // Pending documents — stored locally, uploaded after request ID is obtained
  const [pendingDocs, setPendingDocs] = useState<DocumentItem[]>([]);
  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // ─── DocumentListPanel handlers ──────────────────────────────────────────────

  const handleUpload = useCallback(async (file: File, documentType: string) => {
    const tempId = crypto.randomUUID();
    pendingFilesRef.current.set(tempId, file);
    setPendingDocs((prev) => [
      ...prev,
      {
        id: tempId,
        fileName: file.name,
        documentType,
        fileSize: file.size,
        downloadUrl: '',
        fileType: file.type,
      },
    ]);
  }, []);

  const handleDelete = useCallback(async (docId: string) => {
    pendingFilesRef.current.delete(docId);
    setPendingDocs((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  const handleRename = useCallback(async (docId: string, newName: string) => {
    setPendingDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, fileName: newName } : d)),
    );
  }, []);

  const handleUpdateType = useCallback((docId: string, newType: string) => {
    setPendingDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, documentType: newType } : d)),
    );
  }, []);

  const handleFetchPreview = useCallback(async (doc: DocumentItem) => {
    const file = pendingFilesRef.current.get(doc.id);
    if (!file) return { url: '', mimeType: '' };
    const url = URL.createObjectURL(file);
    return { url, mimeType: file.type };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownload = useCallback((_doc: DocumentItem) => {
    // Pending files cannot be downloaded before they are uploaded
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: res } = await apiClient.post(`/workspaces/${workspace.id}/join-requests`, {
        message: message.trim() || undefined,
        provinceCode: locationData.provinceCode || undefined,
        provinceName: locationData.provinceName || undefined,
        wardCode: locationData.wardCode || undefined,
        wardName: locationData.wardName || undefined,
        addressLine: addressLine.trim() || undefined,
      });
      const requestId = res?.data?.id as string;

      if (pendingDocs.length > 0 && requestId) {
        setUploadingFiles(true);
        for (const doc of pendingDocs) {
          const file = pendingFilesRef.current.get(doc.id);
          if (!file) continue;
          const formData = new FormData();
          formData.append('file', file, doc.fileName);
          try {
            await apiClient.post(
              `/workspaces/${workspace.id}/join-requests/${requestId}/documents`,
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' } },
            );
          } catch {
            toast.error(`${t('workspace.joinRequest.uploadFileError')}: ${doc.fileName}`);
          }
        }
        setUploadingFiles(false);
      }

      toast.success(t('workspace.joinRequest.submitSuccess'));
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { code?: string } } };
      const code = apiErr.response?.data?.code;
      if (code === 'ALREADY_MEMBER') {
        toast.error(t('workspace.joinRequest.errorAlreadyMember'));
      } else if (code === 'REQUEST_ALREADY_PENDING') {
        toast.error(t('workspace.joinRequest.errorAlreadyPending'));
      } else if (code === 'WORKSPACE_NOT_PUBLIC') {
        toast.error(t('workspace.joinRequest.errorNotPublic'));
      } else {
        toast.error(t('workspace.joinRequest.submitError'));
      }
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const isSubmitting = submitting || uploadingFiles;

  const header = (
    <div className="flex items-center gap-3">
      {workspace.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={workspace.logoUrl}
          alt={workspace.name}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[#CFAF6E]/15 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-5 w-5 text-[#CFAF6E]" />
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold text-[#0B1F3A]">
          {t('workspace.joinRequest.dialogTitle')}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">{workspace.name}</p>
      </div>
    </div>
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {t('workspace.joinRequest.cancelBtn')}
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {uploadingFiles
              ? t('workspace.joinRequest.uploadingLabel')
              : t('workspace.joinRequest.submittingLabel')}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t('workspace.joinRequest.submitBtn')}
          </>
        )}
      </button>
    </>
  );

  return (
    <BaseDialog
      isOpen
      onClose={onClose}
      maxWidth="3xl"
      headerContent={header}
      footer={footer}
      disableClose={isSubmitting}
    >
      <div className="space-y-5">
          {/* Description */}
          <p className="text-xs text-gray-500">{t('workspace.joinRequest.dialogDescription')}</p>

          {/* Pre-filled user info */}
          <div className="rounded-xl bg-[#F5F7FA] p-4 space-y-2">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('workspace.joinRequest.fullNameLabel')}</p>
                <p className="text-sm font-medium text-gray-800">
                  {userFullName || <span className="italic text-gray-400">Chưa cập nhật</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('workspace.joinRequest.phoneLabel')}</p>
                <p className="text-sm font-medium text-gray-800">
                  {userPhone || <span className="italic text-gray-400">Chưa cập nhật</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('workspace.joinRequest.messageLabel')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('workspace.joinRequest.messagePlaceholder')}
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/1000</p>
          </div>

          {/* Province / Ward / Address */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="h-4 w-4 text-[#CFAF6E]" />
              <h4 className="text-sm font-semibold text-gray-700">
                {t('workspace.joinRequest.locationTitle')}
              </h4>
            </div>
            <div className="space-y-3">
              <PersonalInfoForm data={locationData} onChange={setLocationData} hideHeader />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('workspace.joinRequest.addressLabel')}
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder={t('workspace.joinRequest.addressPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('workspace.joinRequest.documentsLabel')}
            </label>
            {previousDocCount != null && previousDocCount > 0 && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{t('workspace.joinRequest.previousDocsNote', { count: previousDocCount })}</span>
              </div>
            )}
            <DocumentListPanel
              documents={pendingDocs}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onUpdateType={handleUpdateType}
              onRename={handleRename}
              onFetchPreview={handleFetchPreview}
              onDownload={handleDownload}
              uploadLabel={t('workspace.joinRequest.addDocument')}
              emptyLabel={t('workspace.joinRequest.documentsEmptyHint')}
            />
            <p className="text-xs text-gray-400 mt-2">{t('workspace.joinRequest.documentsHint')}</p>
          </div>
        </div>
    </BaseDialog>
  );
}


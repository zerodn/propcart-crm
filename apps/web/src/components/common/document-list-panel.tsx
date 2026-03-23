'use client';

import { useState, useRef } from 'react';
import {
  FileText,
  Loader2,
  Upload,
  Download,
  Eye,
  Trash2,
  Pencil,
  X as XIcon,
} from 'lucide-react';
import { useCatalog } from '@/hooks/use-catalog';
import { useI18n } from '@/providers/i18n-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseSlideOver } from '@/components/common/base-slide-over';

export interface DocumentItem {
  id: string;
  fileName: string;
  documentType: string;
  fileSize?: number;
  downloadUrl: string;
  createdAt?: string;
  fileType?: string;
}

const FALLBACK_TYPES = [
  { value: 'CCCD', label: 'CCCD/CMND' },
  { value: 'HDLD', label: 'Hợp đồng lao động' },
  { value: 'CHUNG_CHI', label: 'Chứng chỉ' },
  { value: 'OTHER', label: 'Khác' },
];

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DocumentListPanelProps {
  documents: DocumentItem[];
  isLoading?: boolean;
  isUploading?: boolean;
  disabled?: boolean;
  onUpload: (file: File, documentType: string) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
  deletingIds?: Set<string>;
  onUpdateType: (docId: string, newType: string) => void;
  updatingTypeIds?: Record<string, boolean>;
  onRename: (docId: string, newName: string) => Promise<void>;
  onFetchPreview?: (doc: DocumentItem) => Promise<{ url: string; mimeType: string }>;
  onDownload: (doc: DocumentItem) => void;
  downloadingIds?: Set<string>;
  showFilter?: boolean;
  activeFilter?: string;
  onFilterChange?: (type: string) => void;
  uploadLabel?: string;
  emptyLabel?: string;
}

export function DocumentListPanel({
  documents,
  isLoading,
  isUploading,
  disabled,
  onUpload,
  onDelete,
  deletingIds,
  onUpdateType,
  updatingTypeIds,
  onRename,
  onFetchPreview,
  onDownload,
  downloadingIds,
  showFilter,
  activeFilter,
  onFilterChange,
  uploadLabel,
  emptyLabel,
}: DocumentListPanelProps) {
  const { t } = useI18n();
  const { items: catalogItems } = useCatalog('DOCUMENT_TYPE');
  const typeOptions =
    catalogItems[0]?.values && catalogItems[0].values.length > 0
      ? catalogItems[0].values
      : FALLBACK_TYPES;

  const [uploadType, setUploadType] = useState('OTHER');
  const [internalUploading, setInternalUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenamingInFlight, setIsRenamingInFlight] = useState(false);

  const [pendingDeleteDoc, setPendingDeleteDoc] = useState<DocumentItem | null>(null);
  const [isDeletingInFlight, setIsDeletingInFlight] = useState(false);

  const [previewingDoc, setPreviewingDoc] = useState<DocumentItem | null>(null);
  const [previewSlideUrl, setPreviewSlideUrl] = useState('');
  const [previewSlideMimeType, setPreviewSlideMimeType] = useState('');
  const [previewSlideLoading, setPreviewSlideLoading] = useState(false);

  const closePreview = () => {
    if (previewSlideUrl.startsWith('blob:')) URL.revokeObjectURL(previewSlideUrl);
    setPreviewingDoc(null);
    setPreviewSlideUrl('');
    setPreviewSlideMimeType('');
    setPreviewSlideLoading(false);
  };

  const handlePreviewClick = async (doc: DocumentItem) => {
    if (!onFetchPreview) return;
    if (previewSlideUrl.startsWith('blob:')) URL.revokeObjectURL(previewSlideUrl);
    setPreviewingDoc(doc);
    setPreviewSlideUrl('');
    setPreviewSlideLoading(true);
    try {
      const { url, mimeType } = await onFetchPreview(doc);
      setPreviewSlideUrl(url);
      setPreviewSlideMimeType(mimeType);
    } catch {
      setPreviewingDoc(null);
    } finally {
      setPreviewSlideLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInternalUploading(true);
    try {
      await onUpload(file, uploadType);
    } finally {
      setInternalUploading(false);
      e.target.value = '';
    }
  };

  const startRename = (doc: DocumentItem) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.fileName);
  };

  const cancelRename = () => {
    setRenamingDocId(null);
    setRenameValue('');
  };

  const commitRename = async (docId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || isRenamingInFlight) return;
    const doc = documents.find((d) => d.id === docId);
    if (doc && trimmed === doc.fileName) {
      cancelRename();
      return;
    }
    setIsRenamingInFlight(true);
    try {
      await onRename(docId, trimmed);
      setRenamingDocId(null);
      setRenameValue('');
    } catch {
      // error toast handled by parent
    } finally {
      setIsRenamingInFlight(false);
    }
  };

  const handleDeleteClick = (doc: DocumentItem) => {
    setPendingDeleteDoc(doc);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteDoc) return;
    setIsDeletingInFlight(true);
    try {
      await onDelete(pendingDeleteDoc.id);
      setPendingDeleteDoc(null);
    } finally {
      setIsDeletingInFlight(false);
    }
  };

  const isUploadingNow = isUploading || internalUploading;

  return (
    <>
    <div className="space-y-3">
      {/* Upload row */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value)}
          disabled={disabled || isUploadingNow}
          className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-60"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label
          className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#CFAF6E] text-white text-sm font-medium hover:bg-[#B89655] transition-colors ${
            disabled || isUploadingNow ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {isUploadingNow ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploadLabel ?? t('memberEdit.label.uploadDocument')}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            disabled={disabled || isUploadingNow}
          />
        </label>
      </div>

      {/* Filter row (profile only) */}
      {showFilter && onFilterChange && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
            {t('profile.documents.filterByType')}
          </label>
          <select
            value={activeFilter ?? 'ALL'}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-sm"
          >
            <option value="ALL">{t('common.all')}</option>
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Documents list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-lg p-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading')}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-3 text-center">
          {emptyLabel ?? t('profile.documents.noDocuments')}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isUpdatingType = !!updatingTypeIds?.[doc.id];
            const isDeleting = deletingIds?.has(doc.id) ?? false;
            const isDownloading = downloadingIds?.has(doc.id) ?? false;
            const isRenaming = renamingDocId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />

                {/* Filename / rename input */}
                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitRename(doc.id);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        onBlur={() => void commitRename(doc.id)}
                        autoFocus
                        className="flex-1 min-w-0 px-2 py-0.5 text-sm rounded border border-[#CFAF6E] focus:outline-none focus:ring-1 focus:ring-[#CFAF6E]"
                        disabled={isRenamingInFlight}
                        placeholder={t('profile.documents.renamePlaceholder')}
                        aria-label="rename-input"
                      />
                      {isRenamingInFlight ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#CFAF6E] flex-shrink-0" />
                      ) : (
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-0.5 rounded text-gray-400 hover:text-gray-600 flex-shrink-0"
                          aria-label="cancel-rename"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 min-w-0 group">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.fileName}
                        {doc.fileSize ? (
                          <span className="text-xs text-gray-500 ml-1">
                            ({formatFileSize(doc.fileSize)})
                          </span>
                        ) : null}
                      </p>
                      <button
                        type="button"
                        onClick={() => startRename(doc)}
                        disabled={disabled || isDeleting}
                        className="flex-shrink-0 p-0.5 rounded text-gray-300 hover:text-[#CFAF6E] opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity"
                        aria-label="rename-document"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Type selector */}
                <select
                  value={doc.documentType}
                  onChange={(e) => onUpdateType(doc.id, e.target.value)}
                  disabled={disabled || isUpdatingType || isDeleting}
                  className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs disabled:opacity-60 flex-shrink-0"
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {isUpdatingType && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#CFAF6E] flex-shrink-0" />
                )}

                {/* Preview */}
                {onFetchPreview && (
                  <button
                    type="button"
                    onClick={() => void handlePreviewClick(doc)}
                    disabled={isDeleting}
                    className="flex-shrink-0 p-1 rounded hover:bg-[#F5F7FA] text-gray-400 hover:text-[#CFAF6E] disabled:opacity-50"
                    aria-label="preview-document"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}

                {/* Download */}
                <button
                  type="button"
                  onClick={() => onDownload(doc)}
                  disabled={isDeleting || isDownloading}
                  className="flex-shrink-0 p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50"
                  aria-label="download-document"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteClick(doc)}
                  disabled={isDeleting || disabled}
                  className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  aria-label="delete-document"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteDoc)}
        title={t('profile.documents.deleteTitle')}
        message={t('profile.documents.deleteConfirmWithFile', {
          fileName: pendingDeleteDoc?.fileName ?? '',
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous
        isLoading={isDeletingInFlight}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteDoc(null)}
      />

      <BaseSlideOver
        isOpen={Boolean(previewingDoc)}
        onClose={closePreview}
        title={previewingDoc?.fileName ?? ''}
        width="md"
      >
        {previewSlideLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#CFAF6E]" />
            {t('document.loading')}
          </div>
        ) : previewSlideUrl && previewSlideMimeType.startsWith('image/') ? (
          <div className="flex items-center justify-center">
            <img
              src={previewSlideUrl}
              alt={previewingDoc?.fileName}
              className="max-w-full rounded-lg"
            />
          </div>
        ) : previewSlideUrl && previewSlideMimeType === 'application/pdf' ? (
          <iframe
            src={previewSlideUrl}
            title={previewingDoc?.fileName ?? 'Preview'}
            className="w-full border-0 rounded-lg"
            style={{ height: 'calc(100vh - 80px)' }}
          />
        ) : previewSlideUrl ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">{t('document.notSupported')}</p>
            <p className="text-xs text-gray-500">{t('document.downloadHint')}</p>
          </div>
        ) : null}
      </BaseSlideOver>
    </>
  );
}

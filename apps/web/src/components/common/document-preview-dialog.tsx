'use client';

import { useEffect } from 'react';
import { Download, Loader2, X } from 'lucide-react';

interface DocumentPreviewDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  fileName: string;
  mimeType: string;
  previewUrl: string;
  onClose: () => void;
  onDownload: () => void;
}

export function DocumentPreviewDialog({
  isOpen,
  isLoading,
  fileName,
  mimeType,
  previewUrl,
  onClose,
  onDownload,
}: DocumentPreviewDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="document-preview-dialog">
      <div className="mx-auto h-full w-full max-w-5xl rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{fileName}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              Tai xuong
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="close-document-preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 p-3">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Dang tai tai lieu...
            </div>
          ) : previewUrl && isPdf ? (
            <iframe title={fileName} src={previewUrl} className="h-full w-full rounded-lg bg-white" />
          ) : previewUrl && isImage ? (
            <div className="flex h-full items-center justify-center">
              <img src={previewUrl} alt={fileName} className="max-h-full max-w-full rounded-lg object-contain" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-600">
              Khong ho tro xem truc tiep loai file nay. Vui long tai xuong de xem.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

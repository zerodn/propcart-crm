'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, X } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';

interface DocumentPreviewDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  fileName: string;
  mimeType: string;
  previewUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  currentNumber?: number;
  totalCount?: number;
}

export function DocumentPreviewDialog({
  isOpen,
  isLoading,
  fileName,
  mimeType,
  previewUrl,
  onClose,
  onDownload,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  currentNumber,
  totalCount,
}: DocumentPreviewDialogProps) {  const { t } = useI18n();  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPdf = mimeType === 'application/pdf';

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/75 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="document-preview-dialog"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 bg-white">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-gray-900">{fileName}</p>
            {typeof currentNumber === 'number' &&
              typeof totalCount === 'number' &&
              totalCount > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  {currentNumber} / {totalCount}
                </p>
              )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="close-document-preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-100 px-4 pb-4 pt-24 min-h-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('document.loading')}
            </div>
          ) : previewUrl && isPdf ? (
            <iframe
              title={fileName}
              src={previewUrl}
              className="h-full w-full rounded-lg bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-600">
              <div>
                <p className="font-medium">{t('document.notSupported')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('document.downloadHint')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="previous-document"
              title={t('common.pagePrev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="next-document"
              title={t('common.pageNext')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            aria-label="download-document"
            title={t('document.download')}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

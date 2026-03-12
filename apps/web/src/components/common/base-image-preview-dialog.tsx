'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCw, ZoomIn, ZoomOut, X } from 'lucide-react';

export interface BaseImagePreviewItem {
  src: string;
  title: string;
  downloadFileName?: string;
}

interface BaseImagePreviewDialogProps {
  isOpen: boolean;
  items: BaseImagePreviewItem[];
  currentIndex: number | null;
  onClose: () => void;
  onChangeIndex?: (nextIndex: number) => void;
  onDownload?: (item: BaseImagePreviewItem) => void;
}

export function BaseImagePreviewDialog({
  isOpen,
  items,
  currentIndex,
  onClose,
  onChangeIndex,
  onDownload,
}: BaseImagePreviewDialogProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const safeIndex = currentIndex ?? 0;
  const currentItem = items[safeIndex];
  const canNavigate = items.length > 1 && typeof onChangeIndex === 'function';

  const imageStyle = useMemo(
    () => ({ transform: `scale(${zoom}) rotate(${rotation}deg)` }),
    [rotation, zoom],
  );

  useEffect(() => {
    if (!isOpen) return;
    setRotation(0);
    setZoom(1);
  }, [isOpen, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onClose();
        return;
      }

      if (!canNavigate) return;

      if (event.key === 'ArrowLeft') {
        event.stopImmediatePropagation();
        onChangeIndex?.((safeIndex - 1 + items.length) % items.length);
      }

      if (event.key === 'ArrowRight') {
        event.stopImmediatePropagation();
        onChangeIndex?.((safeIndex + 1) % items.length);
      }
    };

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [canNavigate, isOpen, items.length, onChangeIndex, onClose, safeIndex]);

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-gray-900">{currentItem.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {safeIndex + 1} / {items.length}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Đóng xem ảnh"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-full items-center justify-center overflow-auto px-6 pb-24 pt-24">
          <img
            src={currentItem.src}
            alt={currentItem.title}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={imageStyle}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            {canNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onChangeIndex?.((safeIndex - 1 + items.length) % items.length)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                  aria-label="Ảnh trước"
                  title="Ảnh trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onChangeIndex?.((safeIndex + 1) % items.length)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                  aria-label="Ảnh sau"
                  title="Ảnh sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              aria-label="Thu nhỏ"
              title="Thu nhỏ"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              aria-label="Đặt zoom về 100 phần trăm"
              title="100%"
            >
              100%
            </button>

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              aria-label="Phóng to"
              title="Phóng to"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setRotation((prev) => prev + 90)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              aria-label="Xoay phải"
              title="Xoay phải"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDownload?.(currentItem)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            aria-label="Tải xuống"
            title="Tải xuống"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ImageViewerItem {
  src: string;
  title?: string;
}

interface ImageViewerProps {
  isOpen: boolean;
  items: ImageViewerItem[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex?: (index: number) => void;
}

export function ImageViewer({
  isOpen,
  items,
  currentIndex,
  onClose,
  onChangeIndex,
}: ImageViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    setRotation(0);
    setZoom(1);
  }, [isOpen, currentIndex]);

  const item = items[currentIndex];
  const canNav = items.length > 1 && typeof onChangeIndex === 'function';

  const imageStyle = useMemo(
    () => ({ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease' }),
    [rotation, zoom],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); return; }
      if (!canNav) return;
      if (e.key === 'ArrowLeft') { e.stopImmediatePropagation(); onChangeIndex?.((currentIndex - 1 + items.length) % items.length); }
      if (e.key === 'ArrowRight') { e.stopImmediatePropagation(); onChangeIndex?.((currentIndex + 1) % items.length); }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [isOpen, canNav, currentIndex, items.length, onChangeIndex, onClose]);

  if (!mounted || !isOpen || !item) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100002] flex flex-col bg-black/92" onClick={onClose}>
      {/* Top toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/70 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: zoom/rotate controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Thu nhỏ"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Phóng to"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Xoay"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => { setZoom(1); setRotation(0); }}
            className="px-2.5 py-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition text-xs font-medium"
          >
            1:1
          </button>
        </div>

        {/* Center: title */}
        {item.title && (
          <p className="text-white/80 text-sm font-medium truncate max-w-xs px-4">{item.title}</p>
        )}

        {/* Right: counter + download + close */}
        <div className="flex items-center gap-1">
          {items.length > 1 && (
            <span className="text-white/60 text-xs mr-2">{currentIndex + 1} / {items.length}</span>
          )}
          <a
            href={item.src}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Tải về"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {canNav && (
          <button
            onClick={() => onChangeIndex?.((currentIndex - 1 + items.length) % items.length)}
            className="absolute left-3 z-10 p-2.5 bg-black/40 hover:bg-black/70 text-white rounded-full transition"
            aria-label="Ảnh trước"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <img
          src={item.src}
          alt={item.title || ''}
          className="max-w-full max-h-full object-contain select-none"
          style={imageStyle}
          draggable={false}
        />

        {canNav && (
          <button
            onClick={() => onChangeIndex?.((currentIndex + 1) % items.length)}
            className="absolute right-3 z-10 p-2.5 bg-black/40 hover:bg-black/70 text-white rounded-full transition"
            aria-label="Ảnh tiếp"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnails strip */}
      {items.length > 1 && (
        <div
          className="shrink-0 bg-black/70 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 justify-center overflow-x-auto">
            {items.map((img, i) => (
              <button
                key={i}
                onClick={() => onChangeIndex?.(i)}
                className={`flex-shrink-0 w-16 h-11 rounded overflow-hidden border-2 transition ${
                  i === currentIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90'
                }`}
              >
                <img src={img.src} alt={`${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Module-level stack for topmost ESC handling (mirrors BaseSlideOver)
const openPanels: symbol[] = [];

const WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-[560px]',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export interface SlidePanelProps {
  /** Controls visibility. Matches BaseSlideOver `isOpen` convention. */
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Size key matching BaseSlideOver `width` options. Default: `lg`. */
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  zIndex?: number;
  disableClose?: boolean;
  closeOnOverlayClick?: boolean;
  /** Replaces the title element. Matches BaseSlideOver `headerContent`. */
  headerContent?: ReactNode;
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 'lg',
  zIndex = 99998,
  disableClose = false,
  closeOnOverlayClick = true,
  headerContent,
}: SlidePanelProps) {
  const idRef = useRef<symbol>(Symbol());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const id = idRef.current;

    if (!isOpen) {
      const idx = openPanels.indexOf(id);
      if (idx !== -1) openPanels.splice(idx, 1);
      if (openPanels.length === 0) document.body.style.overflow = 'unset';
      return;
    }

    openPanels.push(id);
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || disableClose) return;
      if (openPanels[openPanels.length - 1] !== id) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      onClose();
    };

    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('keydown', handleEscape, true);
      const idx = openPanels.indexOf(id);
      if (idx !== -1) openPanels.splice(idx, 1);
      if (openPanels.length === 0) document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, disableClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex justify-end bg-black/40 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay click area */}
      <div
        className="flex-1"
        onClick={() => { if (!disableClose && closeOnOverlayClick) onClose(); }}
      />

      <div
        className={`h-full w-full ${WIDTH_CLASSES[width] ?? 'max-w-[560px]'} bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          {headerContent ?? <h4 className="text-base font-semibold text-gray-900">{title}</h4>}
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 border-t border-gray-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

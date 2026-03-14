'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MAX_WIDTHS: Record<string, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  '7xl': 'sm:max-w-7xl',
};

export interface DialogProps {
  /** Controls visibility. Matches BaseDialog `isOpen` convention. */
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  /** Replaces the title h2 element (left side of header). Matches BaseDialog `headerContent`. */
  headerContent?: ReactNode;
  footer?: ReactNode;
  /** Disable close button and ESC key. Matches BaseDialog `disableClose`. */
  disableClose?: boolean;
  /** Hide header completely. Matches BaseDialog `hideHeader`. */
  hideHeader?: boolean;
  /** z-index as a number (portal simplification over BaseDialog's zIndexClassName). */
  zIndex?: number;
  /** Override body container classes. Defaults to `flex-1 overflow-y-auto`. */
  bodyClassName?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  headerContent,
  footer,
  disableClose = false,
  hideHeader = false,
  zIndex = 99999,
  bodyClassName,
}: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) onClose();
    };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, disableClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      style={{ zIndex }}
      onClick={(e) => { if (e.target === backdropRef.current && !disableClose) onClose(); }}
    >
      <div
        className={`relative w-full ${MAX_WIDTHS[maxWidth] ?? ''} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}
        role="dialog"
        aria-modal="true"
      >
        {!hideHeader && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
            {headerContent ?? <h2 className="text-base font-bold text-gray-900">{title}</h2>}
            {!disableClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                aria-label="Đóng"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className={bodyClassName ?? 'flex-1 overflow-y-auto'}>
          {children}
        </div>

        {footer && (
          <div className="px-5 py-3 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './base-slide-over.css';

// Module-level stack to track open slide overs in order (last = topmost)
const openSlideOvers: symbol[] = [];

interface BaseSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  zIndexClassName?: string;
  disableClose?: boolean;
  closeOnOverlayClick?: boolean;
  headerContent?: ReactNode;
}

const widthClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-[560px]',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export function BaseSlideOver({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 'lg',
  zIndexClassName = 'z-[10000]',
  disableClose = false,
  closeOnOverlayClick = true,
  headerContent,
}: BaseSlideOverProps) {
  const idRef = useRef<symbol>(Symbol());

  useEffect(() => {
    const id = idRef.current;

    if (!isOpen) {
      const idx = openSlideOvers.indexOf(id);
      if (idx !== -1) {
        openSlideOvers.splice(idx, 1);
      }
      if (openSlideOvers.length === 0) {
        document.body.style.overflow = 'unset';
      }
      return;
    }

    openSlideOvers.push(id);
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || disableClose) return;
      // Only the topmost slide over handles ESC
      if (openSlideOvers[openSlideOvers.length - 1] !== id) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      onClose();
    };

    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('keydown', handleEscape, true);
      const idx = openSlideOvers.indexOf(id);
      if (idx !== -1) {
        openSlideOvers.splice(idx, 1);
      }
      if (openSlideOvers.length === 0) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen, onClose, disableClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className={`fixed inset-0 ${zIndexClassName} flex justify-end bg-black/55 animate-fade-in`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex-1"
        onClick={() => {
          if (!disableClose && closeOnOverlayClick) {
            onClose();
          }
        }}
      />

      <div
        className={`h-full w-full ${widthClasses[width]} overflow-hidden bg-white shadow-2xl animate-slide-in-right`}
        data-slideover-panel
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
            {headerContent || <h4 className="text-base font-semibold text-gray-900">{title}</h4>}
            {!disableClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

          {footer && <div className="shrink-0 border-t border-gray-200 px-5 py-4">{footer}</div>}
        </div>
      </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(content, document.body);
  }

  return null;
}

'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  headerContent?: ReactNode; // Custom header content (overrides default title)
  disableClose?: boolean; // Disable close button and ESC key
  hideHeader?: boolean; // Hide header completely
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function BaseDialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  headerContent,
  disableClose = false,
  hideHeader = false,
}: BaseDialogProps) {
  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !disableClose) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, disableClose]);

  if (!isOpen) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" style={{ margin: 0, padding: '1rem' }}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed */}
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            {headerContent || <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {!disableClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Đóng"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        {/* Footer - Fixed (optional) */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render at body level
  if (typeof window !== 'undefined') {
    return createPortal(dialogContent, document.body);
  }

  return null;
}

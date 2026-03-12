'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { BaseDialog } from './base-dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="sm"
      disableClose={isLoading}
      headerContent={
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isDangerous ? 'bg-red-100' : 'bg-blue-100'
            }`}
          >
            <AlertCircle className={`h-5 w-5 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      }
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="text-gray-600">{message}</div>
    </BaseDialog>
  );
}

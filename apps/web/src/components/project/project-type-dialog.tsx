'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ProjectTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'LOW_RISE' | 'HIGH_RISE') => void;
}

export function ProjectTypeDialog({ isOpen, onClose, onConfirm }: ProjectTypeDialogProps) {
  const [selected, setSelected] = useState<'LOW_RISE' | 'HIGH_RISE'>('LOW_RISE');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selected);
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
      style={{ margin: 0 }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Loại dự án</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Dự án thấp tầng */}
            <button
              type="button"
              onClick={() => setSelected('LOW_RISE')}
              className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-left ${
                selected === 'LOW_RISE'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-amber-300 bg-white'
              }`}
            >
              {selected === 'LOW_RISE' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {selected !== 'LOW_RISE' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {/* House illustration */}
              <div className="w-20 h-20 flex items-center justify-center">
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
                  <rect x="10" y="35" width="60" height="38" rx="3" fill="#FCD34D" />
                  <polygon points="5,38 40,8 75,38" fill="#F59E0B" />
                  <rect x="27" y="50" width="12" height="23" rx="1" fill="#92400E" />
                  <rect x="45" y="48" width="14" height="12" rx="1" fill="#BFDBFE" />
                  <rect x="16" y="48" width="10" height="10" rx="1" fill="#BFDBFE" />
                  <circle cx="58" cy="26" r="10" fill="#FEF3C7" opacity="0.6" />
                  <path d="M52 30c0-6 8-12 14-6" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm text-center">Dự án thấp tầng</p>
                <p className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                  Dự án gồm các sản phẩm nhà ở liền thổ, có chiều cao giới hạn: biệt thự, nhà phố
                  liền kề, shophouse,...
                </p>
              </div>
            </button>

            {/* Dự án cao tầng */}
            <button
              type="button"
              onClick={() => setSelected('HIGH_RISE')}
              className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-left ${
                selected === 'HIGH_RISE'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-amber-300 bg-white'
              }`}
            >
              {selected === 'HIGH_RISE' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {selected !== 'HIGH_RISE' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {/* Building illustration */}
              <div className="w-20 h-20 flex items-center justify-center">
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
                  <rect x="18" y="15" width="44" height="58" rx="2" fill="#93C5FD" />
                  <rect x="18" y="15" width="44" height="8" rx="2" fill="#60A5FA" />
                  {[25, 35, 45, 55].map((y) => (
                    <g key={y}>
                      <rect x="24" y={y} width="8" height="7" rx="1" fill="#DBEAFE" />
                      <rect x="36" y={y} width="8" height="7" rx="1" fill="#DBEAFE" />
                      <rect x="48" y={y} width="8" height="7" rx="1" fill="#DBEAFE" />
                    </g>
                  ))}
                  <rect x="30" y="60" width="14" height="13" fill="#1D4ED8" opacity="0.5" />
                  <rect x="10" y="40" width="10" height="33" rx="1" fill="#BFDBFE" />
                  {[44, 51, 58, 65].map((y) => (
                    <rect key={y} x="12" y={y} width="6" height="4" rx="0.5" fill="#DBEAFE" />
                  ))}
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm text-center">Dự án cao tầng</p>
                <p className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                  Dự án nhà chung cư, căn hộ, văn phòng, hoặc khách sạn có số tầng lớn: căn hộ chung
                  cư, khách sạn, officetel,...
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

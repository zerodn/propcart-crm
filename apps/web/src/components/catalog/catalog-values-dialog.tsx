'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

interface Value {
  value: string;
  label: string;
}

interface CatalogValuesDialogProps {
  isOpen: boolean;
  catalogName: string;
  values: Value[];
  isLoading?: boolean;
  onSave: (values: Value[]) => Promise<void>;
  onClose: () => void;
}

export function CatalogValuesDialog({
  isOpen,
  catalogName,
  values: initialValues,
  isLoading = false,
  onSave,
  onClose,
}: CatalogValuesDialogProps) {
  const [values, setValues] = useState<Value[]>(initialValues);
  const [saving, setSaving] = useState(false);

  // Sync values when dialog opens or initialValues change
  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addValue = () => setValues((v) => [...v, { value: '', label: '' }]);
  const updateValue = (idx: number, field: 'value' | 'label', val: string) =>
    setValues((v) => v.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  const removeValue = (idx: number) => setValues((v) => v.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Quản lý dữ liệu: {catalogName}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {values.map((v, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={v.value}
                onChange={(e) => updateValue(idx, 'value', e.target.value)}
                placeholder="Value (VD: ADMIN)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={v.label}
                onChange={(e) => updateValue(idx, 'label', e.target.value)}
                placeholder="Label (VD: Quản trị viên)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeValue(idx)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Add button */}
          <button
            onClick={addValue}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Thêm giá trị
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

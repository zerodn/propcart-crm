'use client';

import { useState } from 'react';
import { Loader2, X, Plus, Trash2 } from 'lucide-react';
import { CATALOG_TYPES } from '@/types';

interface CatalogFormProps {
  onSubmit: (
    type: string,
    code: string,
    name: string,
    parentId?: string | null,
    values?: Array<{ value: string; label: string }>,
  ) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  initialData?: {
    type: string;
    code: string;
    name: string;
    parentId?: string | null;
    values?: Array<{ value: string; label: string }>;
  };
  parentOptions?: Array<{ id: string; name: string }>;
  formId?: string;
}

export function CatalogForm({
  onSubmit,
  isLoading = false,
  onCancel,
  initialData,
  parentOptions = [],
  formId = 'catalog-form',
}: CatalogFormProps) {
  const isEditing = Boolean(initialData);
  const [type, setType] = useState(initialData?.type || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [parentId, setParentId] = useState<string | null | undefined>(initialData?.parentId ?? null);
  const [values, setValues] = useState<Array<{ value: string; label: string }>>(initialData?.values || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!type.trim()) newErrors.type = 'Vui lòng chọn loại danh mục';
    if (!code.trim()) newErrors.code = 'Vui lòng nhập mã danh mục';
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên danh mục';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(type, code, name, parentId ?? null, values.length ? values : undefined);
    } catch {
      // Error is already handled by hook
    }
  };

  const addValue = () => setValues((v) => [...v, { value: '', label: '' }]);
  const updateValue = (idx: number, field: 'value' | 'label', val: string) =>
    setValues((v) => v.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  const removeValue = (idx: number) => setValues((v) => v.filter((_, i) => i !== idx));

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900">
          Loại danh mục *
          {isEditing && <span className="text-xs text-gray-500 ml-1">(không thể thay đổi)</span>}
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setErrors({ ...errors, type: '' });
          }}
          disabled={isLoading || isEditing}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Chọn loại danh mục</option>
          {Object.entries(CATALOG_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">Mã danh mục *</label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErrors({ ...errors, code: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="VD: APARTMENT, HOUSE"
        />
        {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">Tên danh mục *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({ ...errors, name: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="VD: Căn hộ, Nhà riêng"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">
          Danh mục cha (tùy chọn)
          {isEditing && <span className="text-xs text-gray-500 ml-1">(không thể thay đổi)</span>}
        </label>
        <select
          value={parentId ?? ''}
          onChange={(e) => setParentId(e.target.value || null)}
          disabled={isLoading || isEditing}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Không có</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">Danh sách giá trị con</label>
        <div className="space-y-2 mt-2">
          {values.map((v, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={v.value}
                onChange={(e) => updateValue(idx, 'value', e.target.value)}
                placeholder="value (VD: ADMIN)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={v.label}
                onChange={(e) => updateValue(idx, 'label', e.target.value)}
                placeholder="label (VD: Quản trị viên)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
              />
              <button type="button" onClick={() => removeValue(idx)} className="p-2 text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addValue} className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600">
            <Plus className="h-4 w-4" /> Thêm giá trị
          </button>
        </div>
      </div>
    </form>
  );
}

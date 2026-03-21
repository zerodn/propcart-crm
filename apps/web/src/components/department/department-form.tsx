'use client';

import { useState } from 'react';
import { useI18n } from '@/providers/i18n-provider';
import type { ParentDepartmentOption } from '@/hooks/use-department';

interface DepartmentFormProps {
  onSubmit: (name: string, code: string, description?: string, parentId?: string, status?: string) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  parentOptions?: ParentDepartmentOption[];
  statusOptions?: { value: string; label: string; color?: string }[];
  initialData?: {
    name: string;
    code: string;
    description?: string;
    id?: string;
    parentId?: string | null;
    status?: string | null;
  };
  formId?: string;
}

export function DepartmentForm({
  onSubmit,
  isLoading = false,
  onCancel: _onCancel,
  parentOptions = [],
  statusOptions = [],
  initialData,
  formId = 'department-form',
}: DepartmentFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [parentId, setParentId] = useState(initialData?.parentId || '');
  const [status, setStatus] = useState(initialData?.status || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useI18n();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('departments.validation.nameRequired');
    if (!code.trim()) newErrors.code = t('departments.validation.codeRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(name, code, description || undefined, parentId || undefined, status || undefined);
    } catch {
      // Error is already handled by hook
    }
  };

  const filteredParentOptions = initialData?.id
    ? parentOptions.filter((option) => option.id !== initialData.id)
    : parentOptions;

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900">{t('departments.form.nameLabel')} *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({ ...errors, name: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
          placeholder={t('departments.form.namePlaceholder')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('departments.form.codeLabel')} *</label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setErrors({ ...errors, code: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
          placeholder={t('departments.form.codePlaceholder')}
        />
        {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('departments.form.parentLabel')}</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
        >
          <option value="">{t('departments.form.parentPlaceholder')}</option>
          {filteredParentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('departments.form.statusLabel')}</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
        >
          <option value="">{t('departments.form.statusPlaceholder')}</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('departments.description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
          placeholder={t('departments.form.descriptionPlaceholder')}
          rows={3}
        />
      </div>
    </form>
  );
}

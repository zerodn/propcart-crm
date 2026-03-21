'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CATALOG_TYPES } from '@/types';
import { useI18n } from '@/providers/i18n-provider';

interface CatalogFormProps {
  onSubmit: (
    type: string,
    code: string,
    name: string,
    parentId?: string | null,
    values?: Array<{ value: string; label: string; color?: string }>,
  ) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  initialData?: {
    type: string;
    code: string;
    name: string;
    parentId?: string | null;
    values?: Array<{ value: string; label: string; color?: string }>;
  };
  parentOptions?: Array<{ id: string; name: string }>;
  formId?: string;
}

export function CatalogForm({
  onSubmit,
  isLoading = false,
  onCancel: _onCancel,
  initialData,
  parentOptions = [],
  formId = 'catalog-form',
}: CatalogFormProps) {
  const { t } = useI18n();
  const normalizeHexColor = (value: string) => {
    const raw = value.trim();
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash : null;
  };

  const [type, setType] = useState(initialData?.type || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [parentId, setParentId] = useState<string | null | undefined>(
    initialData?.parentId ?? null,
  );
  const [values, setValues] = useState<Array<{ value: string; label: string; color?: string }>>(
    initialData?.values || [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!type.trim()) newErrors.type = t('catalogs.validation2.typeRequired');
    if (!code.trim()) newErrors.code = t('catalogs.validation2.codeRequired');
    if (!name.trim()) newErrors.name = t('catalogs.validation2.nameRequired');
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

  const addValue = () => setValues((v) => [...v, { value: '', label: '', color: '#3b82f6' }]);
  const updateValue = (idx: number, field: 'value' | 'label' | 'color', val: string) =>
    setValues((v) => v.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  const removeValue = (idx: number) => setValues((v) => v.filter((_, i) => i !== idx));

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900">{t('catalogs.form.typeLabel')}</label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setErrors({ ...errors, type: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">{t('catalogs.form.typePlaceholder')}</option>
          {Object.entries(CATALOG_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('catalogs.form.codeLabel2')}</label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErrors({ ...errors, code: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
          placeholder="VD: APARTMENT, HOUSE"
        />
        {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('catalogs.form.nameLabel2')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({ ...errors, name: '' });
          }}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50"
          placeholder={t('catalogs.form.namePlaceholder2')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('catalogs.form.parentLabel')}</label>
        <select
          value={parentId ?? ''}
          onChange={(e) => setParentId(e.target.value || null)}
          disabled={isLoading}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">{t('catalogs.noParent')}</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">{t('catalogs.form.valuesLabel')}</label>
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-[1fr_1fr_130px_40px] gap-2 px-1 text-[11px] font-medium text-gray-500">
            <span>{t('catalogs.form.valueCodeHeader')}</span>
            <span>{t('catalogs.form.valueLabelHeader')}</span>
            <span>{t('catalogs.form.valueColorHeader')}</span>
            <span></span>
          </div>
          {values.map((v, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_130px_40px] gap-2 items-center">
              <input
                type="text"
                value={v.value}
                onChange={(e) => updateValue(idx, 'value', e.target.value)}
                placeholder={t('catalogs.form.valuePlaceholderCode')}
                className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={v.label}
                onChange={(e) => updateValue(idx, 'label', e.target.value)}
                placeholder={t('catalogs.form.valuePlaceholderLabel')}
                className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1">
                <input
                  type="color"
                  value={v.color || '#3b82f6'}
                  onChange={(e) => updateValue(idx, 'color', e.target.value)}
                  className="h-7 w-7 p-0 border-0 rounded cursor-pointer"
                  title={t('catalogs.form.valueColorTitle')}
                />
                <input
                  type="text"
                  value={(v.color || '#3b82f6').toUpperCase()}
                  onChange={(e) => {
                    const normalized = normalizeHexColor(e.target.value);
                    if (normalized) updateValue(idx, 'color', normalized);
                  }}
                  className="w-20 text-xs text-gray-700 outline-none"
                  placeholder="#3B82F6"
                />
              </div>
              <button type="button" onClick={() => removeValue(idx)} className="p-2 text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addValue}
            className="mt-2 inline-flex items-center gap-2 text-sm text-[#CFAF6E]"
          >
            <Plus className="h-4 w-4" /> {t('catalogs.addValue')}
          </button>
        </div>
      </div>
    </form>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import { useI18n } from '../../providers/i18n-provider';

interface Value {
  value: string;
  label: string;
  color?: string;
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
  const normalizeHexColor = (value: string) => {
    const raw = value.trim();
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash : null;
  };

  const [values, setValues] = useState<Value[]>(initialValues);
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

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

  const addValue = () => setValues((v) => [...v, { value: '', label: '', color: '#3b82f6' }]);
  const updateValue = (idx: number, field: 'value' | 'label' | 'color', val: string) =>
    setValues((v) => v.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  const removeValue = (idx: number) => setValues((v) => v.filter((_, i) => i !== idx));

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('catalogs.valuesDialog.titleWithName', { name: catalogName })}
      maxWidth="md"
      disableClose={saving}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr_140px_40px] gap-2 px-1 text-[11px] font-medium text-gray-500">
          <span>{t('catalogs.valuesDialog.codeColumnLabel')}</span>
          <span>{t('catalogs.valuesDialog.labelColumnLabel')}</span>
          <span>{t('catalogs.valuesDialog.colorColumnLabel')}</span>
          <span></span>
        </div>
        {values.map((v, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_140px_40px] gap-2 items-center">
            <input
              type="text"
              value={v.value}
              onChange={(e) => updateValue(idx, 'value', e.target.value)}
              placeholder={t('catalogs.valuesDialog.valueCodePlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
            />
            <input
              type="text"
              value={v.label}
              onChange={(e) => updateValue(idx, 'label', e.target.value)}
              placeholder={t('catalogs.valuesDialog.valueLabelPlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
            />
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 h-10">
              <input
                type="color"
                value={v.color || '#3b82f6'}
                onChange={(e) => updateValue(idx, 'color', e.target.value)}
                className="h-7 w-7 p-0 border-0 rounded cursor-pointer"
                title={t('catalogs.valuesDialog.colorTitle')}
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
            <button
              onClick={() => removeValue(idx)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={addValue}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#CFAF6E] hover:text-[#CFAF6E] transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('catalogs.addValue')}
        </button>
      </div>
    </BaseDialog>
  );
}

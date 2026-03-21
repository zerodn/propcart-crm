'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCatalog } from '@/hooks/use-catalog';
import type { CustomFieldDefinition, CustomFieldValues } from '@/hooks/use-custom-fields';

interface DynamicFieldRendererProps {
  definitions: CustomFieldDefinition[];
  values: CustomFieldValues;
  onChange: (fieldKey: string, value: string | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function DynamicFieldRenderer({
  definitions,
  values,
  onChange,
  disabled = false,
  isLoading = false,
}: DynamicFieldRendererProps) {
  const { items: catalogs } = useCatalog();

  // Build a map: catalogCode → catalogValue[]
  const catalogMap = useMemo(() => {
    const map: Record<string, Array<{ value: string; label: string }>> = {};
    for (const cat of catalogs) {
      const key = cat.code?.toLowerCase();
      if (key) {
        map[key] = (cat.values ?? []).map((v) => ({ value: v.value, label: v.label }));
      }
    }
    return map;
  }, [catalogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (definitions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
      {definitions.map((def) => (
        <DynamicField
          key={def.id}
          definition={def}
          value={values[def.fieldKey] ?? ''}
          onChange={(v) => onChange(def.fieldKey, v)}
          disabled={disabled}
          catalogOptions={
            def.fieldType === 'SELECT' && def.catalogCode
              ? catalogMap[def.catalogCode.toLowerCase()] ?? []
              : []
          }
        />
      ))}
    </div>
  );
}

// ── Single field renderer ──

interface DynamicFieldProps {
  definition: CustomFieldDefinition;
  value: string;
  onChange: (value: string | null) => void;
  disabled: boolean;
  catalogOptions: Array<{ value: string; label: string }>;
}

function DynamicField({ definition, value, onChange, disabled, catalogOptions }: DynamicFieldProps) {
  const { label, fieldType, required, maxLength } = definition;

  switch (fieldType) {
    case 'TEXT':
      return (
        <div>
          <label className={labelCls}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value || null)}
            maxLength={maxLength || undefined}
            required={required}
            disabled={disabled}
            className={inputCls}
            placeholder={label}
          />
          {maxLength && (
            <p className="text-xs text-gray-400 mt-0.5 text-right">
              {(value || '').length}/{maxLength}
            </p>
          )}
        </div>
      );

    case 'NUMBER':
      return (
        <div>
          <label className={labelCls}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value || null)}
            required={required}
            disabled={disabled}
            className={inputCls}
            placeholder={label}
          />
        </div>
      );

    case 'SELECT':
      return (
        <div>
          <label className={labelCls}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value || null)}
            required={required}
            disabled={disabled}
            className={inputCls}
          >
            <option value="">— Chọn —</option>
            {catalogOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {definition.catalogCode && catalogOptions.length === 0 && (
            <p className="text-xs text-amber-500 mt-0.5">
              Danh mục &quot;{definition.catalogCode}&quot; chưa có giá trị
            </p>
          )}
        </div>
      );

    case 'FILE':
      return (
        <FileField
          definition={definition}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}

// ── File field ──

function FileField({
  definition,
  value,
  onChange,
  disabled,
}: {
  definition: CustomFieldDefinition;
  value: string;
  onChange: (v: string | null) => void;
  disabled: boolean;
}) {
  const [fileName, setFileName] = useState(value ? value.split('/').pop() || 'Đã tải' : '');

  useEffect(() => {
    setFileName(value ? value.split('/').pop() || 'Đã tải' : '');
  }, [value]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Store filename for now; actual upload handled at save time
    // Use a data URL or placeholder — the parent form will handle real upload
    setFileName(file.name);
    onChange(`pending:${file.name}`);
    e.target.value = '';
  };

  return (
    <div>
      <label className={labelCls}>
        {definition.label} {definition.required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-2">
        <label
          className={`inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Chọn file
          <input type="file" className="hidden" onChange={handleFile} disabled={disabled} />
        </label>
        {fileName && (
          <span className="text-sm text-gray-600 truncate max-w-[200px]">{fileName}</span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setFileName(''); }}
            disabled={disabled}
            className="text-xs text-red-500 hover:underline"
          >
            Xoá
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, GripVertical, Pencil, Check, X } from 'lucide-react';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useCatalog } from '@/hooks/use-catalog';
import type { CustomFieldDefinition } from '@/hooks/use-custom-fields';

type FieldType = 'TEXT' | 'NUMBER' | 'SELECT' | 'FILE';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'TEXT', label: 'Kiểu chữ' },
  { value: 'NUMBER', label: 'Kiểu số' },
  { value: 'SELECT', label: 'Danh sách (Combobox)' },
  { value: 'FILE', label: 'Tải file' },
];

interface FieldConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  definitions: CustomFieldDefinition[];
  onCreate: (data: {
    fieldKey: string;
    label: string;
    fieldType: FieldType;
    required?: boolean;
    maxLength?: number;
    catalogCode?: string;
    order?: number;
  }) => Promise<unknown>;
  onUpdate: (id: string, data: Partial<CustomFieldDefinition>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export function FieldConfigDialog({
  isOpen,
  onClose,
  definitions,
  onCreate,
  onUpdate,
  onDelete,
}: FieldConfigDialogProps) {
  const { items: catalogs } = useCatalog();

  // Add-new form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('TEXT');
  const [newRequired, setNewRequired] = useState(false);
  const [newMaxLength, setNewMaxLength] = useState('');
  const [newCatalogCode, setNewCatalogCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit row state
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState<FieldType>('TEXT');
  const [editRequired, setEditRequired] = useState(false);
  const [editMaxLength, setEditMaxLength] = useState('');
  const [editCatalogCode, setEditCatalogCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-generate fieldKey from label
  useEffect(() => {
    const key = newLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    setNewFieldKey(key);
  }, [newLabel]);

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewLabel('');
    setNewFieldKey('');
    setNewFieldType('TEXT');
    setNewRequired(false);
    setNewMaxLength('');
    setNewCatalogCode('');
  };

  const handleCreate = async () => {
    if (!newLabel.trim() || !newFieldKey.trim()) return;
    setIsCreating(true);
    try {
      await onCreate({
        fieldKey: newFieldKey,
        label: newLabel.trim(),
        fieldType: newFieldType,
        required: newRequired,
        maxLength: newMaxLength ? parseInt(newMaxLength) : undefined,
        catalogCode: newFieldType === 'SELECT' ? newCatalogCode || undefined : undefined,
        order: definitions.length,
      });
      resetAddForm();
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (def: CustomFieldDefinition) => {
    setEditId(def.id);
    setEditLabel(def.label);
    setEditFieldType(def.fieldType);
    setEditRequired(def.required);
    setEditMaxLength(def.maxLength ? String(def.maxLength) : '');
    setEditCatalogCode(def.catalogCode || '');
  };

  const handleSaveEdit = async () => {
    if (!editId || !editLabel.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(editId, {
        label: editLabel.trim(),
        fieldType: editFieldType,
        required: editRequired,
        maxLength: editMaxLength ? parseInt(editMaxLength) : null,
        catalogCode: editFieldType === 'SELECT' ? editCatalogCode || null : null,
      });
      setEditId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const catalogOptions = catalogs.map((c) => ({
    code: c.code,
    name: c.name,
    type: c.type,
  }));

  return (
    <>
      <BaseDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Cấu hình trường tuỳ chỉnh — Khách hàng"
        maxWidth="3xl"
        footer={
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        }
      >
        <div className="space-y-4">
          {/* Existing fields list */}
          {definitions.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-400 text-center py-8">
              Chưa có trường tuỳ chỉnh nào. Nhấn &quot;Thêm trường&quot; để bắt đầu.
            </p>
          )}

          {definitions.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {definitions.map((def) => (
                <div key={def.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/60">
                  {editId === def.id ? (
                    /* ── Edit mode ── */
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                      <div className="md:col-span-2">
                        <label className={labelCls}>Nhãn</label>
                        <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Kiểu</label>
                        <select value={editFieldType} onChange={(e) => setEditFieldType(e.target.value as FieldType)} className={inputCls}>
                          {FIELD_TYPES.map((ft) => (
                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                          ))}
                        </select>
                      </div>
                      {editFieldType === 'SELECT' && (
                        <div>
                          <label className={labelCls}>Danh mục</label>
                          <select value={editCatalogCode} onChange={(e) => setEditCatalogCode(e.target.value)} className={inputCls}>
                            <option value="">— Chọn —</option>
                            {catalogOptions.map((c) => (
                              <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {editFieldType === 'TEXT' && (
                        <div>
                          <label className={labelCls}>Ký tự tối đa</label>
                          <input type="number" value={editMaxLength} onChange={(e) => setEditMaxLength(e.target.value)} className={inputCls} placeholder="Không giới hạn" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-4">
                        <label className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className="rounded border-gray-300" />
                          Bắt buộc
                        </label>
                      </div>
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={handleSaveEdit} disabled={isSaving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <>
                      <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{def.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-gray-400">{def.fieldKey}</span>
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                            {FIELD_TYPES.find((f) => f.value === def.fieldType)?.label || def.fieldType}
                          </span>
                          {def.required && (
                            <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Bắt buộc</span>
                          )}
                          {def.catalogCode && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              Catalog: {def.catalogCode}
                            </span>
                          )}
                          {def.maxLength && (
                            <span className="text-xs text-gray-400">max {def.maxLength}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => startEdit(def)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(def.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xoá">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-700">Thêm trường mới</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nhãn hiển thị *</label>
                  <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className={inputCls} placeholder="Ví dụ: Số CCCD" />
                </div>
                <div>
                  <label className={labelCls}>Mã trường (tự sinh)</label>
                  <input value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} className={inputCls} placeholder="so_cccd" />
                </div>
                <div>
                  <label className={labelCls}>Kiểu dữ liệu *</label>
                  <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)} className={inputCls}>
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
                {newFieldType === 'SELECT' && (
                  <div>
                    <label className={labelCls}>Lấy từ danh mục *</label>
                    <select value={newCatalogCode} onChange={(e) => setNewCatalogCode(e.target.value)} className={inputCls}>
                      <option value="">— Chọn danh mục —</option>
                      {catalogOptions.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                )}
                {newFieldType === 'TEXT' && (
                  <div>
                    <label className={labelCls}>Giới hạn ký tự</label>
                    <input type="number" min="1" max="10000" value={newMaxLength} onChange={(e) => setNewMaxLength(e.target.value)} className={inputCls} placeholder="Không giới hạn" />
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="rounded border-gray-300" />
                    Bắt buộc
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !newLabel.trim() || !newFieldKey.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu
                </button>
                <button onClick={resetAddForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors w-full justify-center"
            >
              <Plus className="h-4 w-4" />
              Thêm trường
            </button>
          )}
        </div>
      </BaseDialog>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Xoá trường tuỳ chỉnh"
        message="Xoá trường sẽ đồng thời xoá toàn bộ dữ liệu đã nhập cho trường này. Bạn có chắc chắn?"
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

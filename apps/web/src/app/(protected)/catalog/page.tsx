'use client';

import { useState } from 'react';
import { ClipboardList, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { useCatalog } from '@/hooks/use-catalog';
import { CatalogForm } from '@/components/catalog/catalog-form';
import { CatalogValuesDialog } from '@/components/catalog/catalog-values-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDialog } from '@/components/common/base-dialog';
import { GridSkeleton } from '@/components/common/skeleton';
import { CATALOG_TYPES } from '@/types';
import type { CatalogItem } from '@/hooks/use-catalog';

export default function CatalogPage() {
  const { t } = useI18n();
  const { items, isLoading, error, create, update, delete: deleteCatalog } = useCatalog();
  const [showForm, setShowForm] = useState(false);
  const [showValuesDialog, setShowValuesDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = selectedType ? items.filter((item) => item.type === selectedType) : items;
  const editingItem = items.find((item) => item.id === editingId);
  const parentOptions = items.filter((i) => i.id !== editingId).map((i) => ({ id: i.id, name: i.name }));
  const editingItemValues = (editingItem as any)?.values ?? [];

  const handleSubmit = async (
    type: string,
    code: string,
    name: string,
    parentId?: string | null,
    values?: Array<{ value: string; label: string; color?: string }>,
  ) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, { type, code, name, parentId, values });
        setEditingId(null);
      } else {
        await create(type, code, name, parentId, values);
      }
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveValues = async (values: Array<{ value: string; label: string; color?: string }>) => {
    if (!editingId) return;
    await handleSubmit('', '', '', undefined, values);
    setShowValuesDialog(false);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteCatalog(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
    } catch {
      // Error is already handled by hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('catalog.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('catalog.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Thêm danh mục
        </button>
      </div>

      {/* Form Modal */}
      <BaseDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        maxWidth="4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="catalog-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </>
        }
      >
        <CatalogForm
          formId="catalog-form"
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          initialData={
            editingItem
              ? {
                  type: editingItem.type,
                  code: editingItem.code,
                  name: editingItem.name,
                  parentId: (editingItem as any).parentId ?? null,
                  values: (editingItem as any).values ?? [],
                }
              : undefined
          }
          parentOptions={parentOptions}
        />
      </BaseDialog>

      {/* Values Dialog */}
      <CatalogValuesDialog
        isOpen={showValuesDialog}
        catalogName={editingItem?.name || ''}
        values={editingItemValues}
        onSave={handleSaveValues}
        onClose={() => {
          setShowValuesDialog(false);
          setEditingId(null);
        }}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xóa danh mục"
        message="Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Type Filter */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">Lọc theo loại</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả loại</option>
            {Object.entries(CATALOG_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <GridSkeleton cols={3} rows={2} />}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">
            {items.length === 0 ? 'Chưa có danh mục nào' : 'Không tìm thấy danh mục'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {items.length === 0
              ? 'Hãy thêm danh mục đầu tiên để bắt đầu'
              : 'Thay đổi bộ lọc để xem thêm'}
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors flex flex-col"
            >
              {/* Content */}
              <div className="flex-1 mb-4">
                <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {CATALOG_TYPES[item.type] || item.type}
                  </span>
                  <span className="text-xs text-gray-400">({item.code})</span>
                </div>
                {(item as any)?.values?.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    {(item as any).values.length} giá trị
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  title="Chỉnh sửa giá trị"
                >
                  <Edit2 className="h-4 w-4" />
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                  title="Xóa danh mục"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

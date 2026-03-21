'use client';

import { useState } from 'react';
import { ClipboardList, Plus, Edit2, Trash2, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useCatalog } from '@/hooks/use-catalog';
import { CatalogForm } from '@/components/catalog/catalog-form';
import { CatalogValuesDialog } from '@/components/catalog/catalog-values-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDialog } from '@/components/common/base-dialog';
import { GridSkeleton } from '@/components/common/skeleton';
import { CATALOG_TYPES, CATALOG_USAGE_MAP } from '@/types';

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
  const [showUsageId, setShowUsageId] = useState<string | null>(null);
  const [viewValuesId, setViewValuesId] = useState<string | null>(null);

  usePageSetup({
    title: t('catalog.title'),
    subtitle: t('catalog.subtitle'),
    actions: (
      <button
        onClick={() => {
          setEditingId(null);
          setShowForm(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Thêm danh mục
      </button>
    ),
  });

  const filteredItems = selectedType ? items.filter((item) => item.type === selectedType) : items;
  const editingItem = items.find((item) => item.id === editingId);
  const parentOptions = items
    .filter((i) => i.id !== editingId)
    .map((i) => ({ id: i.id, name: i.name }));
  const editingItemValues = editingItem?.values ?? [];

  const getParentId = (item: unknown): string | null => {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    return typeof record.parentId === 'string' ? record.parentId : null;
  };

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

  const handleSaveValues = async (
    values: Array<{ value: string; label: string; color?: string }>,
  ) => {
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
      {/* Form Modal */}
      <BaseDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? t('catalogs.modal.editTitle') : t('catalogs.modal.addTitle')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="catalog-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.addNew')}
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
                  parentId: getParentId(editingItem),
                  values: editingItem.values ?? [],
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
        title={t('catalogs.delete')}
        message={t('catalogs.confirmDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
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
          <label className="block text-sm font-medium text-gray-900 mb-2">{t('catalogs.filterByType')}</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('catalogs.filter.allTypes')}</option>
            {Object.entries(CATALOG_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* View Values Dialog (read-only) */}
      {viewValuesId && (() => {
        const viewItem = items.find((i) => i.id === viewValuesId);
        if (!viewItem) return null;
        return (
          <BaseDialog
            isOpen
            onClose={() => setViewValuesId(null)}
            title={`Danh sách giá trị — ${viewItem.name}`}
            maxWidth="sm"
            footer={
              <button
                onClick={() => setViewValuesId(null)}
                className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            }
          >
            <div className="space-y-1.5 py-1">
              {(viewItem.values ?? []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Chưa có giá trị nào</p>
              ) : (
                (viewItem.values ?? []).map((v, idx) => (
                  <div
                    key={v.value || idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {v.color && (
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-gray-200"
                        style={{ backgroundColor: v.color }}
                      />
                    )}
                    <span className="text-sm font-medium text-gray-800 flex-1">{v.label}</span>
                    <span className="text-xs text-gray-400 font-mono">{v.value}</span>
                  </div>
                ))
              )}
            </div>
          </BaseDialog>
        );
      })()}

      {/* Loading State */}
      {isLoading && <GridSkeleton cols={1} rows={4} />}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">
            {items.length === 0 ? t('catalogs.empty.title') : t('catalogs.empty.notFound')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {items.length === 0
              ? t('catalogs.empty.description')
              : t('catalogs.empty.filterHint')}
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filteredItems.map((item) => (
            <div key={item.id}>
              {/* Main row */}
              <div className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                {/* Left: name + badges */}
                <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
                  <span className="font-medium text-gray-900 truncate">{item.name}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
                    {CATALOG_TYPES[item.type] || item.type}
                  </span>
                  <span className="text-xs text-gray-400 font-mono shrink-0">({item.code})</span>
                </div>

                {/* Value count badge — clickable */}
                <button
                  onClick={() => (item.values?.length ?? 0) > 0 && setViewValuesId(item.id)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    (item.values?.length ?? 0) > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                      : 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
                  }`}
                >
                  {item.values?.length ?? 0} giá trị
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowUsageId(showUsageId === item.id ? null : item.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Xem nơi sử dụng"
                    aria-label="Xem nơi sử dụng"
                  >
                    {showUsageId === item.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item.id)}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t('common.editInfo')}
                    aria-label={t('common.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('catalogs.delete')}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Usage panel (expandable sub-row) */}
              {showUsageId === item.id && (
                <div className="px-5 pb-4 bg-indigo-50/40 border-t border-indigo-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400 mt-3 mb-2">
                    Được dùng tại
                  </p>
                  {(CATALOG_USAGE_MAP[item.type] ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">Chưa có menu nào sử dụng danh mục này.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(CATALOG_USAGE_MAP[item.type] ?? []).map((usage) => (
                        <a
                          key={usage.path}
                          href={usage.path}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-xs text-indigo-700 font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {usage.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

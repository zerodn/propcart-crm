'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, MapPin, MapPinOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useWarehouse, PropertyWarehouse } from '@/hooks/use-warehouse';
import { useCatalog } from '@/hooks/use-catalog';
import { WarehouseForm } from '@/components/warehouse/warehouse-form';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { cn } from '@/lib/utils';
import { useI18n } from '@/providers/i18n-provider';

export default function WarehousePage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const {
    warehouses,
    isLoading,
    meta: warehouseMeta,
    list,
    create,
    update,
    delete: deleteWarehouse,
  } = useWarehouse(workspace?.id || '');
  const { items: catalogs } = useCatalog();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [warehousePage, setWarehousePage] = useState(1);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const WAREHOUSE_PAGE_SIZE = 10;

  usePageSetup({
    title: t('warehouse.pageTitle'),
    subtitle: t('warehouse.subtitle'),
    actions: (
      <button
        onClick={() => {
          setEditingId(null);
          setShowForm(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white text-sm font-medium rounded-lg hover:bg-[#B89655] transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('warehouse.action.create')}
      </button>
    ),
  });

  const warehouseTypeCatalog = catalogs.find((c) => c.type === 'WAREHOUSE_TYPE');
  const warehouseTypes = warehouseTypeCatalog?.values
    ? warehouseTypeCatalog.values.map((v) => ({ value: v.value, label: v.label }))
    : [];

  const editingWarehouse = warehouses.find((w) => w.id === editingId);

  useEffect(() => {
    if (workspace?.id) {
      list({ page: warehousePage, limit: WAREHOUSE_PAGE_SIZE, search: warehouseSearch || undefined });
    }
  }, [workspace?.id, warehousePage, warehouseSearch, list]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, data);
        setEditingId(null);
      } else {
        await create(data);
      }
      setShowForm(false);
      await list({ page: warehousePage, limit: WAREHOUSE_PAGE_SIZE });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteWarehouse(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      await list({ page: warehousePage, limit: WAREHOUSE_PAGE_SIZE });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  // DataGrid columns definition
  const columns: DataGridColumn<PropertyWarehouse>[] = [
    {
      key: 'name',
      label: t('warehouse.label.name'),
      render: (value, row) => (
        <div>
          <div className="font-semibold text-gray-900">
            {typeof value === 'string' ? value : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{t('warehouse.label.code')} {row.code}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: t('warehouse.label.type'),
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#CFAF6E]/15 text-[#0B1F3A]">
          {warehouseTypes.find((wt) => wt.value === value)?.label ||
            (typeof value === 'string' ? value : '—')}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('warehouse.label.status'),
      render: (value) => (
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            value === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800',
          )}
        >
          {value === 1 ? t('common.active') : t('common.paused')}
        </span>
      ),
    },
    {
      key: 'provinceName',
      label: t('warehouse.label.location'),
      render: (value, row) => {
        const province = typeof value === 'string' ? value : '';
        return (
          <div className="text-sm">
            {province && <div>{province}</div>}
            {row.wardName && <div className="text-xs text-gray-500">{row.wardName}</div>}
            {row.fullAddress && (
              <div className="text-xs text-gray-500 mt-0.5">{row.fullAddress}</div>
            )}
            {!province && !row.wardName && !row.fullAddress && (
              <span className="text-gray-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'latitude',
      label: t('warehouse.label.coordinates'),
      render: (value, row) => {
        if (value && row.longitude) {
          return (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="h-3 w-3 text-green-600" />
              <span>
                {Number(value).toFixed(4)}, {Number(row.longitude).toFixed(4)}
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPinOff className="h-3 w-3" />
            <span>Chưa có</span>
          </div>
        );
      },
    },
    {
      key: 'createdBy',
      label: t('warehouse.label.createdBy'),
      render: (value) => (
        <span className="text-sm text-gray-700">
          {(value as { fullName?: string; phone?: string } | null | undefined)?.fullName ||
            (value as { fullName?: string; phone?: string } | null | undefined)?.phone ||
            'N/A'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-[0.8rem]">
      {/* Data Grid */}
      <BaseDataGrid
        data={warehouses}
        columns={columns}
        isLoading={isLoading}
        title={t('warehouse.title')}
        titleIcon={<Building2 className="h-5 w-5" />}
        badgeCount={warehouseMeta.total}
        searchValue={warehouseSearch}
        onSearchChange={(v) => { setWarehouseSearch(v); setWarehousePage(1); }}
        searchPlaceholder={t('warehouse.placeholder.search')}
        pageSize={WAREHOUSE_PAGE_SIZE}
        emptyMessage={t('warehouse.empty.description')}
        emptyIcon={<Building2 className="h-10 w-10 text-gray-300" />}
        totalItems={warehouseMeta.total}
        currentPage={warehousePage}
        onPageChange={setWarehousePage}
        onEdit={(warehouse) => handleOpenEdit(warehouse.id)}
        onDelete={(warehouse) => handleDelete(warehouse.id)}
      />

      {/* Form Dialog */}
      <BaseDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? t('warehouse.action.edit') : t('warehouse.action.create')}
        maxWidth="2xl"
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
              form="warehouse-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.create')}
            </button>
          </>
        }
      >
        <WarehouseForm
          formId="warehouse-form"
          onSubmit={handleSubmit}
          warehouseTypes={warehouseTypes}
          editingWarehouse={editingWarehouse}
          isSubmitting={isSubmitting}
        />
      </BaseDialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('warehouse.action.deleteTitle')}
        message={t('warehouse.confirm.deleteText')}
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
    </div>
  );
}

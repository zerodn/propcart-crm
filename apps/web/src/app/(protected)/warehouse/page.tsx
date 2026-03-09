'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Edit2, Trash2, MapPin, MapPinOff, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { useWarehouse, PropertyWarehouse } from '@/hooks/use-warehouse';
import { useCatalog } from '@/hooks/use-catalog';
import { WarehouseForm } from '@/components/warehouse/warehouse-form';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { cn } from '@/lib/utils';

export default function WarehousePage() {
  const { t } = useI18n();
  const { workspace } = useAuth();
  const { warehouses, isLoading, list, create, update, delete: deleteWarehouse } = useWarehouse(
    workspace?.id || '',
  );
  const { items: catalogs } = useCatalog();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const warehouseTypeCatalog = catalogs.find((c) => c.type === 'WAREHOUSE_TYPE');
  const warehouseTypes = warehouseTypeCatalog?.values
    ? warehouseTypeCatalog.values.map((v: any) => ({ value: v.value, label: v.label }))
    : [];

  const editingWarehouse = warehouses.find((w) => w.id === editingId);

  useEffect(() => {
    if (workspace?.id) {
      list();
    }
  }, [workspace?.id, list]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, data);
        setEditingId(null);
      } else {
        await create(data);
      }
      setShowForm(false);
      // Reload data to ensure fresh state from server
      await list();
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
      label: 'Tên kho',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">Mã: {row.code}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Loại kho',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {warehouseTypes.find((t) => t.value === value)?.label || value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (value) => (
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            value === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800',
          )}
        >
          {value === 1 ? 'Hoạt động' : 'Tạm dừng'}
        </span>
      ),
    },
    {
      key: 'provinceName',
      label: 'Địa điểm',
      render: (value, row) => (
        <div className="text-sm">
          {value && <div>{value}</div>}
          {row.wardName && <div className="text-xs text-gray-500">{row.wardName}</div>}
          {row.fullAddress && (
            <div className="text-xs text-gray-500 mt-0.5">{row.fullAddress}</div>
          )}
          {!value && !row.wardName && !row.fullAddress && <span className="text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key: 'latitude',
      label: 'Tọa độ',
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
      label: 'Người tạo',
      render: (value) => (
        <span className="text-sm text-gray-700">{value?.fullName || 'N/A'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Quản lý kho hàng</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Quản lý các kho hàng bất động sản</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tạo kho hàng
        </button>
      </div>

      {/* Data Grid */}
      <BaseDataGrid
        data={warehouses}
        columns={columns}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="Chưa có kho hàng nào. Bắt đầu bằng cách tạo kho hàng đầu tiên."
        emptyIcon={<Building2 className="h-10 w-10 text-gray-300" />}
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
        title={editingId ? 'Chỉnh sửa kho hàng' : 'Tạo kho hàng'}
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
              Hủy
            </button>
            <button
              type="submit"
              form="warehouse-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Cập nhật' : 'Tạo mới'}
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
        title="Xoá kho hàng"
        message="Bạn có chắc chắn muốn xoá kho hàng này?"
        confirmText="Xoá"
        cancelText="Hủy"
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

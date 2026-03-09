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
import { GridSkeleton } from '@/components/common/skeleton';
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

      {/* Loading State */}
      {isLoading && <GridSkeleton cols={3} rows={2} />}

      {/* Empty State */}
      {!isLoading && warehouses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">Chưa có kho hàng nào</p>
          <p className="text-sm text-gray-500 mt-1">Bắt đầu bằng cách tạo kho hàng đầu tiên</p>
        </div>
      )}

      {/* Warehouse Grid */}
      {!isLoading && warehouses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{warehouse.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Mã: {warehouse.code}</p>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    warehouse.status === 1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {warehouse.status === 1 ? 'Hoạt động' : 'Tạm dừng'}
                </span>
              </div>

              {/* Type */}
              <div className="mb-3">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {warehouseTypes.find((t) => t.value === warehouse.type)?.label ||
                    warehouse.type}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs text-gray-600 mb-4">
                {warehouse.provinceName && (
                  <p>
                    <span className="font-medium">Tỉnh:</span> {warehouse.provinceName}
                  </p>
                )}
                {warehouse.wardName && (
                  <p>
                    <span className="font-medium">Phường:</span> {warehouse.wardName}
                  </p>
                )}
                {warehouse.fullAddress && (
                  <p>
                    <span className="font-medium">Địa chỉ:</span> {warehouse.fullAddress}
                  </p>
                )}
                {warehouse.latitude && warehouse.longitude && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{warehouse.latitude.toFixed(6)}, {warehouse.longitude.toFixed(6)}</span>
                  </p>
                )}
                {(!warehouse.latitude || !warehouse.longitude) && (
                  <p className="flex items-center gap-1 text-gray-400">
                    <MapPinOff className="h-3 w-3" />
                    <span>Chưa có tọa độ</span>
                  </p>
                )}
              </div>

              {warehouse.description && (
                <p className="text-xs text-gray-600 mb-4 italic">{warehouse.description}</p>
              )}

              {/* Creator */}
              <div className="text-xs text-gray-500 mb-4 pb-4 border-t border-gray-100 pt-4">
                Tạo bởi: <span className="font-medium">{warehouse.createdBy?.fullName || 'N/A'}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(warehouse.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(warehouse.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

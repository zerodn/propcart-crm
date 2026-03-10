'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useProduct, PropertyProduct } from '../../../hooks/use-product';
import { useWarehouse } from '@/hooks/use-warehouse';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { useCatalog } from '@/hooks/use-catalog';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { ProductForm } from '../../../components/product/product-form';
import { cn } from '@/lib/utils';

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function ProductPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const {
    products,
    isLoading,
    list,
    create,
    update,
    delete: deleteProduct,
    uploadFiles,
  } = useProduct(workspaceId);

  const { warehouses, list: listWarehouses } = useWarehouse(workspaceId);
  const { members } = useWorkspaceMembers(workspaceId);
  const { items: catalogs } = useCatalog();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const editingProduct = products.find((p) => p.id === editingId);

  useEffect(() => {
    if (!workspaceId) return;
    list();
    listWarehouses();
  }, [workspaceId, list, listWarehouses]);

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
    [warehouses],
  );

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.userId,
        label: m.displayName || m.user.fullName || m.workspacePhone || m.user.phone || 'N/A',
      })),
    [members],
  );

  const findCatalogValues = (keys: string[]) => {
    const normalized = keys.map((k) => k.toLowerCase());
    const target = catalogs.find((c) => {
      const code = (c.code || '').toLowerCase();
      const type = (c.type || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return normalized.some((key) => code.includes(key) || type.includes(key) || name.includes(key));
    });

    const values = target?.values || [];
    return values.map((v) => ({ value: v.value, label: v.label }));
  };

  const directionOptions = useMemo(
    () => findCatalogValues(['direction', 'huong']),
    [catalogs],
  );

  const transactionStatusOptions = useMemo(() => {
    const values = findCatalogValues(['transaction_status', 'status_bds', 'trang thai bds']);
    return values.length
      ? values
      : [
          { value: 'AVAILABLE', label: 'Chua book' },
          { value: 'BOOKED', label: 'Book can' },
        ];
  }, [catalogs]);

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
      await deleteProduct(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataGridColumn<PropertyProduct>[] = [
    {
      key: 'name',
      label: 'Tên sản phẩm',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value || '—'}</div>
          <div className="text-xs text-gray-500">Mã: {row.unitCode}</div>
        </div>
      ),
    },
    {
      key: 'propertyType',
      label: 'Loại hình',
      render: (value) => <span className="text-sm text-gray-700">{value}</span>,
    },
    {
      key: 'warehouse',
      label: 'Kho hàng',
      render: (value) => <span>{value?.name || '—'}</span>,
    },
    {
      key: 'area',
      label: 'Diện tích',
      render: (value) => <span>{value ? `${value} m2` : '—'}</span>,
    },
    {
      key: 'priceWithoutVat',
      label: 'Giá chưa VAT',
      render: (value) => <span>{formatMoney(value)}</span>,
    },
    {
      key: 'priceWithVat',
      label: 'Giá gồm VAT',
      render: (value) => <span>{formatMoney(value)}</span>,
    },
    {
      key: 'transactionStatus',
      label: 'Giao dịch',
      render: (value) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            value === 'BOOKED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
          )}
        >
          {transactionStatusOptions.find((s) => s.value === value)?.label || value}
        </span>
      ),
    },
    {
      key: 'createdBy',
      label: 'Người tạo',
      render: (value) => <span>{value?.fullName || value?.phone || 'N/A'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Box className="h-5 w-5 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách sản phẩm bất động sản</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tạo sản phẩm
        </button>
      </div>

      <BaseDataGrid
        data={products}
        columns={columns}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="Chưa có sản phẩm nào."
        emptyIcon={<Box className="h-10 w-10 text-gray-300" />}
        onEdit={(row) => {
          setEditingId(row.id);
          setShowForm(true);
        }}
        onDelete={(row) => handleDelete(row.id)}
      />

      <BaseDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm'}
        maxWidth="6xl"
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
              form="product-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </>
        }
      >
        <ProductForm
          formId="product-form"
          onSubmit={handleSubmit}
          onUploadFiles={uploadFiles}
          editingProduct={editingProduct}
          warehouseOptions={warehouseOptions}
          directionOptions={directionOptions}
          transactionStatusOptions={transactionStatusOptions}
          memberOptions={memberOptions}
          isSubmitting={isSubmitting}
        />
      </BaseDialog>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xóa sản phẩm"
        message="Bạn có chắc chắn muốn xóa sản phẩm này?"
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
    </div>
  );
}

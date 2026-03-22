'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Loader2, Plus, Eye } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useProduct, PropertyProduct } from '@/hooks/use-product';
import { useWarehouse } from '@/hooks/use-warehouse';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { useCatalog } from '@/hooks/use-catalog';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDataGrid, DataGridColumn, DataGridAction } from '@/components/common/base-data-grid';
import { ProductForm } from '@/components/product/product-form';
import { cn } from '@/lib/utils';
import { useI18n } from '@/providers/i18n-provider';

interface ProductFormPayload {
  [key: string]: unknown;
}

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function ProductPage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const workspaceId = workspace?.id || '';

  const {
    products,
    isLoading,
    meta: productMeta,
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
  const [showDetails, setShowDetails] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const PRODUCT_PAGE_SIZE = 10;

  usePageSetup({
    title: t('product.pageTitle'),
    subtitle: t('product.subtitle'),
    actions: (
      <button
        onClick={() => {
          setEditingId(null);
          setShowForm(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white text-sm font-medium rounded-lg hover:bg-[#B89655] transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('product.action.create')}
      </button>
    ),
  });

  const editingProduct = products.find((p) => p.id === editingId);
  const detailsProduct = products.find((p) => p.id === detailsId);

  useEffect(() => {
    if (!workspaceId) return;
    list({ page: productPage, limit: PRODUCT_PAGE_SIZE, search: productSearch || undefined });
    listWarehouses();
  }, [workspaceId, productPage, productSearch, list, listWarehouses]);

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
    [warehouses],
  );

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.userId,
        label: m.displayName || m.user.fullName || m.workspacePhone || m.user.phone || 'N/A',
        phone: m.workspacePhone || m.user.phone || undefined,
        email: m.workspaceEmail || m.user.email || undefined,
        avatarUrl: m.avatarUrl || undefined,
        title: m.role?.name || undefined,
      })),
    [members],
  );

  const findCatalogValues = (keys: string[]) => {
    const normalized = keys.map((k) => k.toLowerCase());
    const target = catalogs.find((c) => {
      const code = (c.code || '').toLowerCase();
      const type = (c.type || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return normalized.some(
        (key) => code.includes(key) || type.includes(key) || name.includes(key),
      );
    });

    const values = target?.values || [];
    return values.map((v) => ({ value: v.value, label: v.label, color: v.color }));
  };

  const directionOptions = useMemo(
    () => findCatalogValues(['property_direction', 'direction', 'huong_bds', 'huong bds', 'huong']),
    [catalogs],
  );

  const propertyTypeOptions = useMemo(
    () =>
      findCatalogValues([
        'property_type',
        'loai_hinh_bds',
        'loai hinh bds',
        'loai hinh bat dong san',
      ]),
    [catalogs],
  );

  const transactionStatusOptions = useMemo(() => {
    const values = findCatalogValues([
      'property_transaction_status',
      'transaction_status',
      'trang_thai_giao_dich_bds',
      'trang thai giao dich bds',
      'status_bds',
      'trang thai bds',
    ]);
    return values.length
      ? values
      : [
          { value: 'AVAILABLE', label: 'Chua book' },
          { value: 'BOOKED', label: 'Book can' },
        ];
  }, [catalogs]);

  const tagOptions = useMemo(
    () => findCatalogValues(['product_tag', 'tag', 'nhan', 'nhan_san_pham']),
    [catalogs],
  );

  const documentTypeOptions = useMemo(
    () => findCatalogValues(['product_document', 'tai_lieu_san_pham', 'tai lieu san pham']),
    [catalogs],
  );

  const handleSubmit = async (data: ProductFormPayload) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, data);
        setEditingId(null);
      } else {
        await create(data);
      }
      setShowForm(false);
      await list({ page: productPage, limit: PRODUCT_PAGE_SIZE });
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
      await list({ page: productPage, limit: PRODUCT_PAGE_SIZE });
    } finally {
      setIsDeleting(false);
    }
  };

  const customActions: DataGridAction<PropertyProduct>[] = [
    {
      icon: <Eye className="h-3.5 w-3.5" />,
      label: t('common.viewDetails'),
      onClick: (row) => {
        setDetailsId(row.id);
        setShowDetails(true);
      },
      variant: 'primary',
    },
  ];

  const columns: DataGridColumn<PropertyProduct>[] = [
    {
      key: 'name',
      label: t('product.label.name'),
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">
            {typeof value === 'string' && value.trim() ? value : '—'}
          </div>
          <div className="text-xs text-gray-500">{t('product.label.code')} {row.unitCode}</div>
        </div>
      ),
    },
    {
      key: 'propertyType',
      label: t('product.label.type'),
      render: (value) => {
        const code = typeof value === 'string' ? value : '';
        const label = propertyTypeOptions.find((o) => o.value === code)?.label || code || '—';
        return <span className="text-sm text-gray-700">{label}</span>;
      },
    },
    {
      key: 'warehouse',
      label: t('product.label.warehouse'),
      render: (value) => {
        const warehouse = value as { name?: string } | null | undefined;
        return <span>{warehouse?.name || '—'}</span>;
      },
    },
    {
      key: 'area',
      label: t('product.label.area'),
      render: (value) => {
        const area = typeof value === 'number' ? value : undefined;
        return <span>{area ? `${area} m2` : '—'}</span>;
      },
    },
    {
      key: 'priceWithoutVat',
      label: t('product.label.priceExcludingVAT'),
      render: (value) => <span>{formatMoney(typeof value === 'number' ? value : undefined)}</span>,
    },
    {
      key: 'priceWithVat',
      label: t('product.label.priceIncludingVAT'),
      render: (value) => <span>{formatMoney(typeof value === 'number' ? value : undefined)}</span>,
    },
    {
      key: 'transactionStatus',
      label: t('product.label.transaction'),
      render: (value) => {
        const status = typeof value === 'string' ? value : '';
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              status === 'BOOKED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
            )}
          >
            {transactionStatusOptions.find((s) => s.value === status)?.label || status || '—'}
          </span>
        );
      },
    },
    {
      key: 'createdBy',
      label: t('product.label.createdBy'),
      render: (value) => {
        const createdBy = value as { fullName?: string; phone?: string } | null | undefined;
        return <span>{createdBy?.fullName || createdBy?.phone || 'N/A'}</span>;
      },
    },
  ];

  return (
    <div className="space-y-[0.8rem]">
      <BaseDataGrid
        data={products}
        columns={columns}
        actions={customActions}
        isLoading={isLoading}
        title={t('product.title')}
        titleIcon={<Box className="h-5 w-5" />}
        badgeCount={productMeta.total}
        searchValue={productSearch}
        onSearchChange={(v) => { setProductSearch(v); setProductPage(1); }}
        searchPlaceholder={t('product.placeholder.search')}
        pageSize={PRODUCT_PAGE_SIZE}
        emptyMessage={t('product.empty.title')}
        emptyIcon={<Box className="h-10 w-10 text-gray-300" />}
        totalItems={productMeta.total}
        currentPage={productPage}
        onPageChange={setProductPage}
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
        title={editingId ? t('product.action.edit') : t('product.action.create')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.create')}
            </button>
          </>
        }
      >
        <ProductForm
          workspaceId={workspaceId}
          formId="product-form"
          onSubmit={handleSubmit}
          onUploadFiles={uploadFiles}
          editingProduct={editingProduct}
          warehouseOptions={warehouseOptions}
          propertyTypeOptions={propertyTypeOptions}
          directionOptions={directionOptions}
          transactionStatusOptions={transactionStatusOptions}
          tagOptions={tagOptions}
          documentTypeOptions={documentTypeOptions}
          memberOptions={memberOptions}
          isSubmitting={isSubmitting}
        />
      </BaseDialog>

      <BaseDialog
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setDetailsId(null);
        }}
        title={t('product.action.details')}
        maxWidth="6xl"
        footer={
          <button
            type="button"
            onClick={() => {
              setShowDetails(false);
              setDetailsId(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.close')}
          </button>
        }
      >
        {detailsProduct && (
          <ProductForm
            workspaceId={workspaceId}
            formId="product-details-form"
            onSubmit={async () => {}}
            onUploadFiles={async () => []}
            editingProduct={detailsProduct}
            warehouseOptions={warehouseOptions}
            propertyTypeOptions={propertyTypeOptions}
            directionOptions={directionOptions}
            transactionStatusOptions={transactionStatusOptions}
            tagOptions={tagOptions}
            documentTypeOptions={documentTypeOptions}
            memberOptions={memberOptions}
            isReadOnly={true}
          />
        )}
      </BaseDialog>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('product.action.deleteTitle')}
        message={t('product.confirm.deleteText')}
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

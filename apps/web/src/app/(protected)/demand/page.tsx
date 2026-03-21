'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardCheck, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useDemand, Demand, DemandListParams } from '@/hooks/use-demand';
import { useCustomer } from '@/hooks/use-customer';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { useCatalog } from '@/hooks/use-catalog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DemandForm } from '@/components/demand/demand-form';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  SEARCHING: 'bg-purple-100 text-purple-700',
  MATCHED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
};

const PURPOSE_STYLE: Record<string, string> = {
  BUY: 'bg-green-100 text-green-700',
  RENT: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  INVEST: 'bg-amber-100 text-amber-700',
};

export default function DemandPage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const workspaceId = workspace?.id || '';

  const {
    demands,
    meta,
    isLoading,
    error,
    fetchDemands,
    create,
    update,
    delete: deleteDemand,
  } = useDemand();

  const { customers } = useCustomer();
  const { members } = useWorkspaceMembers(workspaceId);
  const { items: catalogs } = useCatalog();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  usePageSetup({
    title: t('demand.title'),
    subtitle: t('demand.subtitle'),
    actions: (
      <button
        onClick={() => { setEditingId(null); setShowForm(true); }}
        className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white text-sm font-medium rounded-lg hover:bg-[#B89655] transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('demand.addBtn')}
      </button>
    ),
  });

  useEffect(() => {
    if (!workspaceId) return;
    const params: DemandListParams = {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
    };
    fetchDemands(params);
  }, [workspaceId, page, search, filterStatus, filterPriority]);

  // Catalog helpers
  const findCatalogValues = (keys: string[]) => {
    const normalized = keys.map((k) => k.toLowerCase());
    const target = catalogs.find((c) =>
      normalized.some(
        (key) =>
          (c.code || '').toLowerCase() === key ||
          (c.type || '').toLowerCase() === key,
      ),
    );
    return (target?.values || []).map((v) => ({ value: v.value, label: v.label, color: v.color }));
  };

  const statusOptions = useMemo(() => findCatalogValues(['demand_status']), [catalogs]);
  const priorityOptions = useMemo(() => findCatalogValues(['demand_priority']), [catalogs]);
  const propertyTypeOptions = useMemo(() => findCatalogValues(['demand_property_type']), [catalogs]);
  const purposeOptions = useMemo(() => findCatalogValues(['demand_purpose']), [catalogs]);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.userId,
        label: m.displayName || m.user?.fullName || m.workspacePhone || m.user?.phone || 'N/A',
      })),
    [members],
  );

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.fullName} (${c.phone})`,
      })),
    [customers],
  );

  const editingDemand = demands.find((d) => d.id === editingId);

  const resolveStatusLabel = (status: string) => {
    const opt = statusOptions.find((o) => o.value === status);
    return opt?.label || t(`demand.status.${status}` as never) || status;
  };

  const resolvePriorityLabel = (priority: string) => {
    const opt = priorityOptions.find((o) => o.value === priority);
    return opt?.label || t(`demand.priority.${priority}` as never) || priority;
  };

  const resolvePurposeLabel = (purpose: string) => {
    const opt = purposeOptions.find((o) => o.value === purpose);
    return opt?.label || t(`demand.purpose.${purpose}` as never) || purpose;
  };

  const resolvePropertyTypeLabel = (type: string) => {
    const opt = propertyTypeOptions.find((o) => o.value === type);
    return opt?.label || type;
  };

  const formatBudget = (min?: number | null, max?: number | null) => {
    if (!min && !max) return '—';
    const fmt = (v: number) => {
      if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
      return v.toLocaleString('vi-VN');
    };
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `Từ ${fmt(min)}`;
    return `Đến ${fmt(max!)}`;
  };

  const handleSubmit = async (data: Parameters<typeof create>[0]) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, data);
        setEditingId(null);
      } else {
        await create(data);
      }
      setShowForm(false);
      await fetchDemands({ page, limit: PAGE_SIZE, search: search || undefined, status: filterStatus || undefined, priority: filterPriority || undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDemand(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      await fetchDemands({ page, limit: PAGE_SIZE });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataGridColumn<Demand>[] = [
    {
      key: 'title',
      label: t('demand.col.title'),
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{String(value || '—')}</div>
          {row.customer && (
            <div className="text-xs text-gray-500">{row.customer.fullName} • {row.customer.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'propertyType',
      label: t('demand.col.propertyType'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        return <span className="text-sm text-gray-700">{resolvePropertyTypeLabel(String(value))}</span>;
      },
    },
    {
      key: 'purpose',
      label: t('demand.col.purpose'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const s = String(value);
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PURPOSE_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {resolvePurposeLabel(s)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: t('demand.col.status'),
      render: (value) => {
        const s = String(value || 'NEW');
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {resolveStatusLabel(s)}
          </span>
        );
      },
    },
    {
      key: 'priority',
      label: t('demand.col.priority'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const s = String(value);
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {resolvePriorityLabel(s)}
          </span>
        );
      },
    },
    {
      key: 'budgetMin',
      label: t('demand.col.budget'),
      render: (_value, row) => (
        <span className="text-sm text-gray-700">{formatBudget(row.budgetMin, row.budgetMax)}</span>
      ),
    },
    {
      key: 'assignedUser',
      label: t('demand.col.assignedUser'),
      render: (value) => {
        const user = value as { fullName?: string; phone?: string } | null | undefined;
        return <span className="text-sm text-gray-700">{user?.fullName || user?.phone || '—'}</span>;
      },
    },
    {
      key: 'createdAt',
      label: t('demand.col.createdAt'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-sm text-gray-600">
            {new Date(String(value)).toLocaleDateString('vi-VN')}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
        >
          <option value="">{t('demand.filter.allStatus')}</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
        >
          <option value="">{t('demand.filter.allPriority')}</option>
          {priorityOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <BaseDataGrid
        data={demands}
        columns={columns}
        isLoading={isLoading}
        title={t('demand.title')}
        titleIcon={<ClipboardCheck className="h-5 w-5" />}
        badgeCount={meta.total}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder={t('demand.placeholder.search')}
        pageSize={PAGE_SIZE}
        emptyMessage={t('demand.empty.title')}
        emptyIcon={<ClipboardCheck className="h-10 w-10 text-gray-300" />}
        totalItems={meta.total}
        currentPage={page}
        onPageChange={setPage}
        onEdit={(row) => { setEditingId(row.id); setShowForm(true); }}
        onDelete={(row) => { setDeleteId(row.id); setShowDeleteConfirm(true); }}
      />

      {/* Form Dialog */}
      <BaseDialog
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        title={editingId ? t('demand.editTitle') : t('demand.addTitle')}
        maxWidth="5xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="demand-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.addNew')}
            </button>
          </>
        }
      >
        <DemandForm
          formId="demand-form"
          workspaceId={workspaceId}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          propertyTypeOptions={propertyTypeOptions}
          purposeOptions={purposeOptions}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          memberOptions={memberOptions}
          initialCustomer={editingDemand?.customer ? {
            id: editingDemand.customer.id,
            fullName: editingDemand.customer.fullName,
            phone: editingDemand.customer.phone,
          } : undefined}
          initialData={
            editingDemand
              ? {
                  customerId: editingDemand.customerId || '',
                  title: editingDemand.title,
                  propertyType: editingDemand.propertyType || '',
                  purpose: editingDemand.purpose || '',
                  budgetMin: editingDemand.budgetMin ?? undefined,
                  budgetMax: editingDemand.budgetMax ?? undefined,
                  budgetUnit: editingDemand.budgetUnit || 'VND',
                  areaMin: editingDemand.areaMin ?? undefined,
                  areaMax: editingDemand.areaMax ?? undefined,
                  provinceCode: editingDemand.provinceCode || '',
                  provinceName: editingDemand.provinceName || '',
                  wardCode: editingDemand.wardCode || '',
                  wardName: editingDemand.wardName || '',
                  address: editingDemand.address || '',
                  status: editingDemand.status,
                  priority: editingDemand.priority || '',
                  assignedUserId: editingDemand.assignedUserId || '',
                  description: editingDemand.description || '',
                  note: editingDemand.note || '',
                }
              : undefined
          }
        />
      </BaseDialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
        onConfirm={handleConfirmDelete}
        title={t('demand.confirm.deleteTitle')}
        message={t('demand.confirm.deleteText')}
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
}

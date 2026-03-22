'use client';

import { useState, useEffect, useMemo } from 'react';
import { History, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useActivity, Activity, ActivityListParams } from '@/hooks/use-activity';
import { useCustomer } from '@/hooks/use-customer';
import { useDemand } from '@/hooks/use-demand';
import { useCatalog } from '@/hooks/use-catalog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ActivityForm } from '@/components/activity/activity-form';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  PLANNED: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const TYPE_STYLE: Record<string, string> = {
  CALL: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  MEETING: 'bg-purple-100 text-purple-700',
  EMAIL: 'bg-cyan-100 text-cyan-700',
  NOTE: 'bg-amber-100 text-amber-700',
  VISIT: 'bg-green-100 text-green-700',
  SMS: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const RESULT_STYLE: Record<string, string> = {
  POSITIVE: 'bg-green-100 text-green-700',
  NEUTRAL: 'bg-amber-100 text-amber-700',
  NEGATIVE: 'bg-red-100 text-red-700',
  NO_ANSWER: 'bg-gray-100 text-gray-600',
  CALLBACK: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
};

export default function ActivityPage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const workspaceId = workspace?.id || '';

  const {
    activities,
    meta,
    isLoading,
    error,
    fetchActivities,
    create,
    update,
    delete: deleteActivity,
  } = useActivity();

  const { customers } = useCustomer();
  const { demands } = useDemand();
  const { items: catalogs } = useCatalog();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  usePageSetup({
    title: t('activity.title'),
    subtitle: t('activity.subtitle'),
    actions: (
      <button
        onClick={() => { setEditingId(null); setShowForm(true); }}
        className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white text-sm font-medium rounded-lg hover:bg-[#B89655] transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('activity.addBtn')}
      </button>
    ),
  });

  useEffect(() => {
    if (!workspaceId) return;
    const params: ActivityListParams = {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      type: filterType || undefined,
      status: filterStatus || undefined,
    };
    fetchActivities(params);
  }, [workspaceId, page, search, filterType, filterStatus]);

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

  const typeOptions = useMemo(() => findCatalogValues(['activity_type']), [catalogs]);
  const resultOptions = useMemo(() => findCatalogValues(['activity_result']), [catalogs]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.fullName} (${c.phone})`,
      })),
    [customers],
  );

  const demandOptions = useMemo(
    () =>
      demands.map((d) => ({
        value: d.id,
        label: d.title,
      })),
    [demands],
  );

  const editingActivity = activities.find((a) => a.id === editingId);

  const resolveTypeLabel = (type: string) => {
    const opt = typeOptions.find((o) => o.value === type);
    return opt?.label || t(`activity.type.${type}` as never) || type;
  };

  const resolveResultLabel = (result: string) => {
    const opt = resultOptions.find((o) => o.value === result);
    return opt?.label || t(`activity.result.${result}` as never) || result;
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
      await fetchActivities({ page, limit: PAGE_SIZE, search: search || undefined, type: filterType || undefined, status: filterStatus || undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteActivity(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      await fetchActivities({ page, limit: PAGE_SIZE });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataGridColumn<Activity>[] = [
    {
      key: 'title',
      label: t('activity.col.title'),
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
      key: 'type',
      label: t('activity.col.type'),
      render: (value) => {
        const s = String(value || '');
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TYPE_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {resolveTypeLabel(s)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: t('activity.col.status'),
      render: (value) => {
        const s = String(value || 'COMPLETED');
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {t(`activity.status.${s}` as never) || s}
          </span>
        );
      },
    },
    {
      key: 'result',
      label: t('activity.col.result'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const s = String(value);
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', RESULT_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {resolveResultLabel(s)}
          </span>
        );
      },
    },
    {
      key: 'duration',
      label: t('activity.col.duration'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        return <span className="text-sm text-gray-700">{String(value)} {t('activity.minuteShort')}</span>;
      },
    },
    {
      key: 'activityDate',
      label: t('activity.col.activityDate'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-sm text-gray-600">
            {new Date(String(value)).toLocaleDateString('vi-VN')}
          </span>
        );
      },
    },
    {
      key: 'createdBy',
      label: t('activity.col.createdBy'),
      render: (value) => {
        const user = value as { fullName?: string; phone?: string } | null | undefined;
        return <span className="text-sm text-gray-700">{user?.fullName || user?.phone || '—'}</span>;
      },
    },
  ];

  return (
    <div className="space-y-[0.8rem]">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
        >
          <option value="">{t('activity.filter.allType')}</option>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
        >
          <option value="">{t('activity.filter.allStatus')}</option>
          <option value="PLANNED">{t('activity.status.PLANNED')}</option>
          <option value="IN_PROGRESS">{t('activity.status.IN_PROGRESS')}</option>
          <option value="COMPLETED">{t('activity.status.COMPLETED')}</option>
          <option value="CANCELLED">{t('activity.status.CANCELLED')}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <BaseDataGrid
        data={activities}
        columns={columns}
        isLoading={isLoading}
        title={t('activity.title')}
        titleIcon={<History className="h-5 w-5" />}
        badgeCount={meta.total}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder={t('activity.placeholder.search')}
        pageSize={PAGE_SIZE}
        emptyMessage={t('activity.empty.title')}
        emptyIcon={<History className="h-10 w-10 text-gray-300" />}
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
        title={editingId ? t('activity.editTitle') : t('activity.addTitle')}
        maxWidth="3xl"
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
              form="activity-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.addNew')}
            </button>
          </>
        }
      >
        <ActivityForm
          formId="activity-form"
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          typeOptions={typeOptions}
          resultOptions={resultOptions}
          customerOptions={customerOptions}
          demandOptions={demandOptions}
          initialData={
            editingActivity
              ? {
                  customerId: editingActivity.customerId || '',
                  demandId: editingActivity.demandId || '',
                  type: editingActivity.type,
                  title: editingActivity.title,
                  content: editingActivity.content || '',
                  result: editingActivity.result || '',
                  activityDate: editingActivity.activityDate,
                  duration: editingActivity.duration ?? undefined,
                  status: editingActivity.status,
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
        title={t('activity.confirm.deleteTitle')}
        message={t('activity.confirm.deleteText')}
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
}

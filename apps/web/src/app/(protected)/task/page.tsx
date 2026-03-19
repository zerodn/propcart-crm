'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Kanban, LayoutList, ListChecks, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useTask, Task, TaskListParams } from '@/hooks/use-task';
import { useCustomer } from '@/hooks/use-customer';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { useCatalog } from '@/hooks/use-catalog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { TaskForm } from '@/components/task/task-form';
import { TaskKanbanBoard } from '@/components/task/task-kanban-board';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'kanban';

const PAGE_SIZE = 20;
const KANBAN_LIMIT = 200;

const STATUS_STYLE: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-blue-100 text-blue-700',
};

export default function TaskPage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const workspaceId = workspace?.id || '';

  const {
    tasks,
    meta,
    isLoading,
    error,
    fetchTasks,
    create,
    update,
    delete: deleteTask,
  } = useTask();

  const { customers } = useCustomer();
  const { members } = useWorkspaceMembers(workspaceId);
  const { items: catalogs } = useCatalog();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Kanban uses local state for optimistic updates
  const [kanbanTasks, setKanbanTasks] = useState<Task[]>([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  usePageSetup({
    title: t('task.title'),
    subtitle: t('task.subtitle'),
    actions: (
      <div className="flex items-center gap-3">
        {/* View mode toggle */}
        <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-0.5 dark:bg-gray-800 dark:border-gray-600">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
            aria-label={t('task.kanban.listView')}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('task.kanban.listView')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              viewMode === 'kanban'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
            aria-label={t('task.kanban.kanbanView')}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('task.kanban.kanbanView')}</span>
          </button>
        </div>

        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('task.addBtn')}
        </button>
      </div>
    ),
  });

  // Fetch tasks — list mode paginates, kanban loads all
  useEffect(() => {
    if (!workspaceId) return;
    if (viewMode === 'list') {
      const params: TaskListParams = {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
      };
      fetchTasks(params);
    } else {
      // Kanban: load all tasks (no status filter, high limit)
      fetchTasks({
        limit: KANBAN_LIMIT,
        search: search || undefined,
        priority: filterPriority || undefined,
      });
    }
  }, [workspaceId, viewMode, page, search, filterStatus, filterPriority]);

  // Sync fetched tasks → kanbanTasks for optimistic updates
  useEffect(() => {
    if (viewMode === 'kanban') {
      setKanbanTasks(tasks);
    }
  }, [tasks, viewMode]);

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

  const categoryOptions = useMemo(() => findCatalogValues(['task_category']), [catalogs]);
  const priorityOptions = useMemo(() => findCatalogValues(['task_priority']), [catalogs]);

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

  const editingTask = (viewMode === 'kanban' ? kanbanTasks : tasks).find((t) => t.id === editingId);

  const resolveCategoryLabel = useCallback(
    (category: string) => {
      const opt = categoryOptions.find((o) => o.value === category);
      return opt?.label || t(`task.category.${category}` as never) || category;
    },
    [categoryOptions, t],
  );

  const resolvePriorityLabel = useCallback(
    (priority: string) => {
      const opt = priorityOptions.find((o) => o.value === priority);
      return opt?.label || t(`task.priority.${priority}` as never) || priority;
    },
    [priorityOptions, t],
  );

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
      // Refetch depending on view
      if (viewMode === 'list') {
        await fetchTasks({ page, limit: PAGE_SIZE, search: search || undefined, status: filterStatus || undefined, priority: filterPriority || undefined });
      } else {
        await fetchTasks({ limit: KANBAN_LIMIT, search: search || undefined, priority: filterPriority || undefined });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      if (viewMode === 'list') {
        await fetchTasks({ page, limit: PAGE_SIZE });
      } else {
        await fetchTasks({ limit: KANBAN_LIMIT });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isOverdue = useCallback((task: Task) => {
    if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
    return new Date(task.dueDate) < new Date();
  }, []);

  // Kanban: optimistic status change + API call
  const handleKanbanStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      // Optimistic update
      setKanbanTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                completedDate: newStatus === 'DONE' ? new Date().toISOString() : t.status === 'DONE' ? null : t.completedDate,
              }
            : t,
        ),
      );

      try {
        await update(taskId, { status: newStatus });
      } catch {
        // Rollback on error
        toast.error(t('task.message.updateError'));
        // Refetch to sync
        await fetchTasks({ limit: KANBAN_LIMIT, search: search || undefined, priority: filterPriority || undefined });
      }
    },
    [update, fetchTasks, search, filterPriority, t],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((task: Task) => {
    setDeleteId(task.id);
    setShowDeleteConfirm(true);
  }, []);

  const columns: DataGridColumn<Task>[] = [
    {
      key: 'title',
      label: t('task.col.title'),
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
      key: 'category',
      label: t('task.col.category'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        return <span className="text-sm text-gray-700">{resolveCategoryLabel(String(value))}</span>;
      },
    },
    {
      key: 'status',
      label: t('task.col.status'),
      render: (value) => {
        const s = String(value || 'TODO');
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {t(`task.status.${s}` as never) || s}
          </span>
        );
      },
    },
    {
      key: 'priority',
      label: t('task.col.priority'),
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
      key: 'dueDate',
      label: t('task.col.dueDate'),
      render: (value, row) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const overdue = isOverdue(row);
        return (
          <span className={cn('text-sm', overdue ? 'text-red-600 font-medium' : 'text-gray-600')}>
            {new Date(String(value)).toLocaleDateString('vi-VN')}
            {overdue && <span className="ml-1 text-xs">{t('task.overdue')}</span>}
          </span>
        );
      },
    },
    {
      key: 'assignedUser',
      label: t('task.col.assignedUser'),
      render: (value) => {
        const user = value as { fullName?: string; phone?: string } | null | undefined;
        return <span className="text-sm text-gray-700">{user?.fullName || user?.phone || '—'}</span>;
      },
    },
    {
      key: 'createdAt',
      label: t('task.col.createdAt'),
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
      {/* Filters — visible in both views */}
      <div className="flex flex-wrap items-center gap-3">
        {viewMode === 'list' && (
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('task.filter.allStatus')}</option>
            <option value="TODO">{t('task.status.TODO')}</option>
            <option value="IN_PROGRESS">{t('task.status.IN_PROGRESS')}</option>
            <option value="REVIEW">{t('task.status.REVIEW')}</option>
            <option value="DONE">{t('task.status.DONE')}</option>
            <option value="CANCELLED">{t('task.status.CANCELLED')}</option>
          </select>
        )}

        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('task.filter.allPriority')}</option>
          {priorityOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {viewMode === 'kanban' && (
          <div className="ml-auto text-xs text-gray-400">
            {t('task.kanban.dragHint')}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <BaseDataGrid
          data={tasks}
          columns={columns}
          isLoading={isLoading}
          title={t('task.title')}
          titleIcon={<ListChecks className="h-5 w-5" />}
          badgeCount={meta.total}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder={t('task.placeholder.search')}
          pageSize={PAGE_SIZE}
          emptyMessage={t('task.empty.title')}
          emptyIcon={<ListChecks className="h-10 w-10 text-gray-300" />}
          totalItems={meta.total}
          currentPage={page}
          onPageChange={setPage}
          onEdit={(row) => handleEdit(row)}
          onDelete={(row) => handleDelete(row)}
        />
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <TaskKanbanBoard
              tasks={kanbanTasks}
              isOverdue={isOverdue}
              resolvePriorityLabel={resolvePriorityLabel}
              resolveCategoryLabel={resolveCategoryLabel}
              onStatusChange={handleKanbanStatusChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Form Dialog */}
      <BaseDialog
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        title={editingId ? t('task.editTitle') : t('task.addTitle')}
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
              form="task-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.addNew')}
            </button>
          </>
        }
      >
        <TaskForm
          formId="task-form"
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          categoryOptions={categoryOptions}
          priorityOptions={priorityOptions}
          memberOptions={memberOptions}
          customerOptions={customerOptions}
          initialData={
            editingTask
              ? {
                  customerId: editingTask.customerId || '',
                  title: editingTask.title,
                  description: editingTask.description || '',
                  category: editingTask.category || '',
                  priority: editingTask.priority || '',
                  status: editingTask.status,
                  startDate: editingTask.startDate || '',
                  dueDate: editingTask.dueDate || '',
                  assignedUserId: editingTask.assignedUserId || '',
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
        title={t('task.confirm.deleteTitle')}
        message={t('task.confirm.deleteText')}
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, ContactRound, Loader2, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useCustomer, Customer, CustomerListParams } from '@/hooks/use-customer';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { useCatalog } from '@/hooks/use-catalog';
import { BaseDataGrid, DataGridColumn } from '@/components/common/base-data-grid';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CustomerForm } from '@/components/customer/customer-form';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-purple-100 text-purple-700',
  INTERESTED: 'bg-amber-100 text-amber-700',
  NEGOTIATING: 'bg-orange-100 text-orange-700',
  CONVERTED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

const INTEREST_STYLE: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700',
  WARM: 'bg-amber-100 text-amber-700',
  COLD: 'bg-blue-100 text-blue-700',
};

export default function CustomerPage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const workspaceId = workspace?.id || '';

  const {
    customers,
    meta,
    isLoading,
    error,
    fetchCustomers,
    create,
    update,
    delete: deleteCustomer,
  } = useCustomer();

  const { members } = useWorkspaceMembers(workspaceId);
  const { items: catalogs } = useCatalog();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Avatar upload state
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInterestLevel, setFilterInterestLevel] = useState('');

  // Dialog helpers — defined before usePageSetup so openCreateDialog is in scope
  const openEditDialog = (customer: Customer) => {
    setEditingId(customer.id);
    setAvatarPreviewUrl(customer.avatarUrl || '');
    setAvatarFile(null);
    setAvatarCleared(false);
    setShowForm(true);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setAvatarPreviewUrl('');
    setAvatarFile(null);
    setAvatarCleared(false);
    setShowForm(true);
  };

  const closeDialog = () => {
    setShowForm(false);
    setEditingId(null);
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl('');
    setAvatarFile(null);
    setAvatarCleared(false);
  };

  // Catalog helpers — declared before usePageSetup so selects in actions are in scope
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

  const statusOptions = useMemo(() => findCatalogValues(['customer_status']), [catalogs]);
  const interestLevelOptions = useMemo(() => findCatalogValues(['customer_interest_level']), [catalogs]);
  const sourceOptions = useMemo(() => findCatalogValues(['customer_source']), [catalogs]);
  const groupOptions = useMemo(() => findCatalogValues(['customer_group']), [catalogs]);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.userId,
        label: m.displayName || m.user?.fullName || m.workspacePhone || m.user?.phone || 'N/A',
      })),
    [members],
  );

  usePageSetup({
    title: t('customer.title'),
    subtitle: t('customer.subtitle'),
    actionsKey: `${filterStatus}|${filterInterestLevel}`,
    actions: (
      <div className="flex items-center gap-2 w-full">
        {/* Filters — left side */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('customer.filter.allStatus')}</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterInterestLevel}
          onChange={(e) => { setFilterInterestLevel(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('customer.filter.allInterestLevel')}</option>
          {interestLevelOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* Add button — right side */}
        <button
          onClick={openCreateDialog}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          {t('customer.addBtn')}
        </button>
      </div>
    ),
  });

  // Reload when filters/page change
  useEffect(() => {
    if (!workspaceId) return;
    const params: CustomerListParams = {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: filterStatus || undefined,
      interestLevel: filterInterestLevel || undefined,
    };
    fetchCustomers(params);
  }, [workspaceId, page, search, filterStatus, filterInterestLevel]);

  const editingCustomer = customers.find((c) => c.id === editingId);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('customer.avatar.invalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('customer.avatar.tooLarge'));
      return;
    }
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarFile(file);
    setAvatarCleared(false);
    // reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl('');
    setAvatarFile(null);
    setAvatarCleared(true);
  };

  const resolveStatusLabel = (status: string) => {
    const opt = statusOptions.find((o) => o.value === status);
    return opt?.label || status;
  };

  const resolveInterestLabel = (level: string) => {
    const opt = interestLevelOptions.find((o) => o.value === level);
    return opt?.label || level;
  };

  const handleSubmit = async (data: Parameters<typeof create>[0]) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        // Upload new avatar if file selected
        let finalAvatarUrl: string | null | undefined = avatarCleared
          ? null
          : editingCustomer?.avatarUrl ?? undefined;

        if (avatarFile && editingId) {
          setIsUploadingAvatar(true);
          try {
            const fd = new FormData();
            fd.append('avatar', avatarFile);
            const res = await apiClient.post(
              `/workspaces/${workspaceId}/customers/${editingId}/upload-avatar`,
              fd,
              { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            finalAvatarUrl = res.data?.data?.avatarUrl ?? finalAvatarUrl;
            toast.success(t('customer.avatar.uploadSuccess'));
          } catch {
            toast.error(t('customer.avatar.uploadError'));
            setIsSubmitting(false);
            setIsUploadingAvatar(false);
            return;
          } finally {
            setIsUploadingAvatar(false);
          }
        }

        await update(editingId, { ...data, avatarUrl: finalAvatarUrl ?? undefined });
        setEditingId(null);
      } else {
        await create(data);
      }
      closeDialog();
      await fetchCustomers({ page, limit: PAGE_SIZE, search: search || undefined, status: filterStatus || undefined, interestLevel: filterInterestLevel || undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      await fetchCustomers({ page, limit: PAGE_SIZE });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataGridColumn<Customer>[] = [
    {
      key: 'fullName',
      label: t('customer.col.fullName'),
      render: (value, row) => {
        const initials = String(value || '?')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full shrink-0 overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
              {row.avatarUrl ? (
                <img src={row.avatarUrl} alt={String(value)} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{String(value || '—')}</div>
              <div className="text-xs text-gray-500">{row.phone}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      label: t('customer.col.email'),
      render: (value) => (
        <span className="text-sm text-gray-700">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'status',
      label: t('customer.col.status'),
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
      key: 'interestLevel',
      label: t('customer.col.interestLevel'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const s = String(value);
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', INTEREST_STYLE[s] || 'bg-gray-100 text-gray-600')}>
            {resolveInterestLabel(s)}
          </span>
        );
      },
    },
    {
      key: 'source',
      label: t('customer.col.source'),
      render: (value) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const opt = sourceOptions.find((o) => o.value === value);
        return <span className="text-sm text-gray-700">{opt?.label || String(value)}</span>;
      },
    },
    {
      key: 'assignedUser',
      label: t('customer.col.assignedUser'),
      render: (value) => {
        const user = value as { fullName?: string; phone?: string } | null | undefined;
        return <span className="text-sm text-gray-700">{user?.fullName || user?.phone || '—'}</span>;
      },
    },
    {
      key: 'createdAt',
      label: t('customer.col.createdAt'),
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
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <BaseDataGrid
        data={customers}
        columns={columns}
        isLoading={isLoading}
        title={t('customer.title')}
        titleIcon={<ContactRound className="h-5 w-5" />}
        badgeCount={meta.total}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder={t('customer.placeholder.search')}
        pageSize={PAGE_SIZE}
        emptyMessage={t('customer.empty.title')}
        emptyIcon={<ContactRound className="h-10 w-10 text-gray-300" />}
        totalItems={meta.total}
        currentPage={page}
        onPageChange={setPage}
        onEdit={(row) => openEditDialog(row)}
        onDelete={(row) => { setDeleteId(row.id); setShowDeleteConfirm(true); }}
      />

      {/* Form Dialog */}
      <BaseDialog
        isOpen={showForm}
        onClose={closeDialog}
        title={editingId ? t('customer.editTitle') : t('customer.addTitle')}
        maxWidth="5xl"
        footer={
          <>
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="customer-form"
              disabled={isSubmitting || isUploadingAvatar}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {(isSubmitting || isUploadingAvatar) && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.addNew')}
            </button>
          </>
        }
      >
        {/* Avatar section — only when editing */}
        {editingId && (
          <div className="flex items-center gap-4 pb-5 mb-5 border-b border-gray-200">
            {/* Avatar circle */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-50 border-2 border-gray-200 flex items-center justify-center shrink-0">
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-9 h-9 text-gray-400" />
                )}
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('customer.avatar.label')}</p>
              <div className="flex gap-2">
                <label
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors',
                    isSubmitting && 'opacity-50 pointer-events-none',
                  )}
                >
                  <Camera className="h-4 w-4" />
                  {avatarPreviewUrl ? t('customer.avatar.change') : t('customer.avatar.upload')}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isSubmitting}
                  />
                </label>

                {avatarPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('customer.avatar.remove')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{t('customer.avatar.hint')}</p>
            </div>
          </div>
        )}

        <CustomerForm
          formId="customer-form"
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          statusOptions={statusOptions}
          interestLevelOptions={interestLevelOptions}
          sourceOptions={sourceOptions}
          groupOptions={groupOptions}
          memberOptions={memberOptions}
          initialData={
            editingCustomer
              ? {
                  fullName: editingCustomer.fullName,
                  phone: editingCustomer.phone,
                  email: editingCustomer.email || '',
                  gender: editingCustomer.gender || '',
                  dateOfBirth: editingCustomer.dateOfBirth || '',
                  address: editingCustomer.address || '',
                  provinceCode: editingCustomer.provinceCode || '',
                  provinceName: editingCustomer.provinceName || '',
                  wardCode: editingCustomer.wardCode || '',
                  wardName: editingCustomer.wardName || '',
                  source: editingCustomer.source || '',
                  group: editingCustomer.group || '',
                  status: editingCustomer.status,
                  interestLevel: editingCustomer.interestLevel || '',
                  assignedUserId: editingCustomer.assignedUserId || '',
                  note: editingCustomer.note || '',
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
        title={t('customer.confirm.deleteTitle')}
        message={t('customer.confirm.deleteText')}
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
}

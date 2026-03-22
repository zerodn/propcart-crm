'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, ContactRound, Edit2, History, Loader2, MessageSquare, Plus, Settings, Trash2, User } from 'lucide-react';
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
import { CustomerCommentTab } from '@/components/customer/customer-comment';
import { CustomerInfoTab } from '@/components/customer/customer-info';
import { CustomerCareHistoryTab } from '@/components/customer/customer-care-history';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { DynamicFieldRenderer } from '@/components/common/dynamic-field-renderer';
import { FieldConfigDialog } from '@/components/customer/field-config-dialog';

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  CONTACTED: 'bg-purple-100 text-purple-700',
  INTERESTED: 'bg-amber-100 text-amber-700',
  NEGOTIATING: 'bg-orange-100 text-orange-700',
  CONVERTED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

const INTEREST_STYLE: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700',
  WARM: 'bg-amber-100 text-amber-700',
  COLD: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
};

export default function CustomerPage() {
  const { workspace, role } = useAuth();
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
    listComments,
    createComment,
    updateComment,
    deleteComment,
    listInfos,
    createInfo,
    updateInfo,
    deleteInfo,
    reorderInfos,
    listCareHistories,
    createCareHistory,
    updateCareHistory,
    deleteCareHistory,
  } = useCustomer();

  const { members } = useWorkspaceMembers(workspaceId);
  const { items: catalogs } = useCatalog();
  const {
    definitions: fieldDefs,
    values: fieldValues,
    isLoadingDefs,
    isLoadingValues,
    fetchDefinitions,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    fetchValues,
    saveValues,
    setValues,
  } = useCustomFields('CUSTOMER');

  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const canConfigFields = role === 'OWNER' || role === 'ADMIN';
  const [showCareHistoryForm, setShowCareHistoryForm] = useState(false);

  const [dialogMode, setDialogMode] = useState<'edit' | 'comments' | 'careHistory' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'otherInfo'>('info');
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
  const openEditInfo = (customer: Customer) => {
    setEditingId(customer.id);
    setAvatarPreviewUrl(customer.avatarUrl || '');
    setAvatarFile(null);
    setAvatarCleared(false);
    setEditTab('info');
    setDialogMode('edit');
    fetchValues(customer.id);
  };

  const openComments = (customer: Customer) => {
    setEditingId(customer.id);
    setDialogMode('comments');
  };

  const openCareHistory = (customer: Customer) => {
    setEditingId(customer.id);
    setDialogMode('careHistory');
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setAvatarPreviewUrl('');
    setAvatarFile(null);
    setAvatarCleared(false);
    setEditTab('info');
    setValues({});
    setDialogMode('edit');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingId(null);
    setEditTab('info');
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl('');
    setAvatarFile(null);
    setAvatarCleared(false);
    setValues({});
    setShowCareHistoryForm(false);
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
  const titleOptions = useMemo(() => findCatalogValues(['customer_title', 'danh_xung']), [catalogs]);
  const careTaskTypeOptions = useMemo(() => findCatalogValues(['activity_type']), [catalogs]);

  const workspaceMemberData = useMemo(
    () =>
      members.map((m) => ({
        userId: m.userId,
        displayName: m.displayName || m.user?.fullName || m.workspacePhone || m.user?.phone || null,
      })),
    [members],
  );

  const memberCommentOptions = useMemo(
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
    actionsKey: `${filterStatus}|${filterInterestLevel}|${canConfigFields}`,
    actions: (
      <div className="flex items-center gap-2 w-full">
        {/* Filters — left side */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
        >
          <option value="">{t('customer.filter.allStatus')}</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterInterestLevel}
          onChange={(e) => { setFilterInterestLevel(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]"
        >
          <option value="">{t('customer.filter.allInterestLevel')}</option>
          {interestLevelOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* Add button — right side */}
        {canConfigFields && (
          <button
            onClick={() => setShowFieldConfig(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            <Settings className="h-4 w-4" />
            Cấu hình
          </button>
        )}
        <button
          onClick={openCreateDialog}
          className={cn(
            'flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white text-sm font-medium rounded-lg hover:bg-[#B89655] transition-colors shrink-0',
            !canConfigFields && 'ml-auto',
          )}
        >
          <Plus className="h-4 w-4" />
          {t('customer.addBtn')}
        </button>
      </div>
    ),
  });

  // Fetch custom field definitions on mount
  useEffect(() => {
    if (workspaceId) fetchDefinitions();
  }, [workspaceId, fetchDefinitions]);

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

        // Save custom field values if any definitions exist
        if (fieldDefs.length > 0) {
          const fields = fieldDefs.map((d) => ({
            fieldKey: d.fieldKey,
            value: fieldValues[d.fieldKey] ?? null,
          }));
          await saveValues(editingId, fields);
        }

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
            <div className="h-9 w-9 rounded-full shrink-0 overflow-hidden bg-[#CFAF6E]/15 text-[#0B1F3A] flex items-center justify-center text-xs font-semibold">
              {row.avatarUrl ? (
                <img src={row.avatarUrl} alt={String(value)} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{String(value || '—')}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                {row.customerCode && (
                  <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{row.customerCode}</span>
                )}
                {row.phone && <span>{row.phone}</span>}
              </div>
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
    <div className="space-y-[0.8rem]">
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
        actions={[
          {
            icon: <Edit2 className="h-3.5 w-3.5" />,
            label: 'Sửa thông tin',
            onClick: (row) => openEditInfo(row),
            variant: 'primary' as const,
          },
          {
            icon: <MessageSquare className="h-3.5 w-3.5" />,
            label: 'Xem bình luận',
            onClick: (row) => openComments(row),
          },
          {
            icon: <History className="h-3.5 w-3.5" />,
            label: 'Lịch sử chăm sóc',
            onClick: (row) => openCareHistory(row),
          },
        ]}
        onDelete={(row) => { setDeleteId(row.id); setShowDeleteConfirm(true); }}
      />

      {/* ── Dialog 1: Sửa thông tin khách hàng ─────────────────────────── */}
      <BaseDialog
        isOpen={dialogMode === 'edit'}
        onClose={closeDialog}
        title={editingId
          ? `${t('customer.editTitle')}${editingCustomer?.customerCode ? ` — ${editingCustomer.customerCode}` : ''}`
          : t('customer.addTitle')}
        maxWidth="5xl"
        footer={
          editTab === 'info' || !editingId ? (
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
                className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
              >
                {(isSubmitting || isUploadingAvatar) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? t('common.update') : t('common.addNew')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={closeDialog}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('common.close') || t('common.cancel')}
            </button>
          )
        }
      >
        {/* Avatar section — only when editing */}
        {editingId && (
          <div className="flex items-center gap-4 pb-5 mb-5 border-b border-gray-200">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#F5F7FA] border-2 border-gray-200 flex items-center justify-center shrink-0">
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

        {/* Sub-tabs within edit dialog (info / các ghi chú) — only when editing */}
        {editingId && (
          <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-5">
            {(
              [
                { key: 'info', label: t('customer.tabs.info') },
                { key: 'otherInfo', label: 'Các ghi chú' },
              ] as { key: 'info' | 'otherInfo'; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setEditTab(tab.key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  editTab === tab.key
                    ? 'border-[#CFAF6E] text-[#CFAF6E]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {(!editingId || editTab === 'info') && (
          <>
          <CustomerForm
            formId="customer-form"
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            statusOptions={statusOptions}
            interestLevelOptions={interestLevelOptions}
            sourceOptions={sourceOptions}
            groupOptions={groupOptions}
            titleOptions={titleOptions}
            workspaceId={workspaceId}
            workspaceMemberData={workspaceMemberData}
            initialData={
              editingCustomer
                ? {
                    title: editingCustomer.title || '',
                    fullName: editingCustomer.fullName,
                    phone: editingCustomer.phone || '',
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
                    assignees: (editingCustomer.assignees as string[] | null) || [],
                    observers: (editingCustomer.observers as string[] | null) || [],
                    note: editingCustomer.note || '',
                  }
                : undefined
            }
          />

          {/* Dynamic custom fields — shown below form when editing */}
          {editingId && fieldDefs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Thông tin khác</h3>
              <DynamicFieldRenderer
                definitions={fieldDefs}
                values={fieldValues}
                onChange={(key, val) => setValues((prev) => ({ ...prev, [key]: val }))}
                disabled={isSubmitting}
                isLoading={isLoadingValues}
              />
            </div>
          )}
          </>
        )}

        {editingId && editTab === 'otherInfo' && (
          <CustomerInfoTab
            customerId={editingId}
            listInfos={listInfos}
            createInfo={createInfo}
            updateInfo={updateInfo}
            deleteInfo={deleteInfo}
            reorderInfos={reorderInfos}
          />
        )}
      </BaseDialog>

      {/* ── Dialog 2: Xem bình luận ─────────────────────────────────────── */}
      <BaseDialog
        isOpen={dialogMode === 'comments'}
        onClose={closeDialog}
        title={`${t('customer.tabs.comments')}${editingCustomer?.fullName ? ` — ${editingCustomer.fullName}` : ''}`}
        maxWidth="4xl"
        footer={
          <button
            type="button"
            onClick={closeDialog}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.close') || 'Đóng'}
          </button>
        }
      >
        {/* Customer info header */}
        {editingCustomer && (
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-200">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F5F7FA] border border-gray-200 flex items-center justify-center shrink-0">
              {editingCustomer.avatarUrl ? (
                <img src={editingCustomer.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-[#CFAF6E]">
                  {(editingCustomer.fullName || '?').split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{editingCustomer.fullName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {editingCustomer.customerCode && (
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{editingCustomer.customerCode}</span>
                )}
                {editingCustomer.phone && <span className="text-xs text-gray-500">{editingCustomer.phone}</span>}
                {editingCustomer.email && <span className="text-xs text-gray-500">{editingCustomer.email}</span>}
                {editingCustomer.status && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLE[editingCustomer.status] || 'bg-gray-100 text-gray-600')}>
                    {resolveStatusLabel(editingCustomer.status)}
                  </span>
                )}
                {editingCustomer.interestLevel && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INTEREST_STYLE[editingCustomer.interestLevel] || 'bg-gray-100 text-gray-600')}>
                    {resolveInterestLabel(editingCustomer.interestLevel)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {editingId && (
          <CustomerCommentTab
            customerId={editingId}
            workspaceId={workspaceId}
            memberOptions={memberCommentOptions}
            listComments={listComments}
            createComment={createComment}
            updateComment={updateComment}
            deleteComment={deleteComment}
          />
        )}
      </BaseDialog>

      {/* ── Dialog 3: Xem lịch sử chăm sóc ─────────────────────────────── */}
      <BaseDialog
        isOpen={dialogMode === 'careHistory'}
        onClose={closeDialog}
        title={`${t('customer.tabs.careHistory')}${editingCustomer?.fullName ? ` — ${editingCustomer.fullName}` : ''}`}
        maxWidth="5xl"
        footer={
          <button
            type="button"
            onClick={closeDialog}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.close') || 'Đóng'}
          </button>
        }
      >
        {/* Customer info header */}
        {editingCustomer && (
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-200">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F5F7FA] border border-gray-200 flex items-center justify-center shrink-0">
              {editingCustomer.avatarUrl ? (
                <img src={editingCustomer.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-[#CFAF6E]">
                  {(editingCustomer.fullName || '?').split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900 truncate">{editingCustomer.fullName}</p>
                <button
                  type="button"
                  onClick={() => setShowCareHistoryForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#F5F7FA] hover:bg-[#CFAF6E]/15 border border-[#CFAF6E]/40 text-[#CFAF6E] rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm chăm sóc
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {editingCustomer.customerCode && (
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{editingCustomer.customerCode}</span>
                )}
                {editingCustomer.phone && <span className="text-xs text-gray-500">{editingCustomer.phone}</span>}
                {editingCustomer.email && <span className="text-xs text-gray-500">{editingCustomer.email}</span>}
                {editingCustomer.status && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLE[editingCustomer.status] || 'bg-gray-100 text-gray-600')}>
                    {resolveStatusLabel(editingCustomer.status)}
                  </span>
                )}
                {editingCustomer.interestLevel && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INTEREST_STYLE[editingCustomer.interestLevel] || 'bg-gray-100 text-gray-600')}>
                    {resolveInterestLabel(editingCustomer.interestLevel)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {editingId && (
          <CustomerCareHistoryTab
            customerId={editingId}
            workspaceId={workspaceId}
            taskTypeOptions={careTaskTypeOptions}
            memberOptions={memberCommentOptions}
            listCareHistories={listCareHistories}
            createCareHistory={createCareHistory}
            updateCareHistory={updateCareHistory}
            deleteCareHistory={deleteCareHistory}
            showAddForm={showCareHistoryForm}
            onToggleAddForm={setShowCareHistoryForm}
          />
        )}
      </BaseDialog>

      {/* ── Field Config Dialog ──────────────────────────────────────── */}
      <FieldConfigDialog
        isOpen={showFieldConfig}
        onClose={() => setShowFieldConfig(false)}
        definitions={fieldDefs}
        onCreate={createDefinition}
        onUpdate={updateDefinition}
        onDelete={deleteDefinition}
      />

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

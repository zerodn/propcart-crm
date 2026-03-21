'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Loader2, Trash2, ChevronDown, ChevronUp, Phone, MessageSquare, Mail, Video, Users, Clock, HelpCircle, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';
import { useAuth } from '@/providers/auth-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { MemberSearchSelect } from '@/components/common/member-search-select';
import type { CustomerCareHistory } from '@/hooks/use-customer';

interface CatalogOption {
  value: string;
  label: string;
}

interface CustomerCareHistoryTabProps {
  customerId: string;
  workspaceId: string;
  taskTypeOptions?: CatalogOption[];
  memberOptions?: CatalogOption[];
  listCareHistories: (id: string) => Promise<{ data: CustomerCareHistory[] }>;
  createCareHistory: (
    id: string,
    payload: { content: string; taskType?: string; taskId?: string; resultDescription?: string; assignedToUserId?: string; observers?: string[] },
  ) => Promise<unknown>;
  updateCareHistory: (
    id: string,
    historyId: string,
    payload: { content?: string; resultDescription?: string },
  ) => Promise<unknown>;
  deleteCareHistory: (id: string, historyId: string) => Promise<void>;
  showAddForm?: boolean;
  onToggleAddForm?: (show: boolean) => void;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Map task type value → lucide icon
function TaskTypeIcon({ value }: { value?: string | null }) {
  if (!value) return <Clock className="h-3.5 w-3.5" />;
  const v = value.toLowerCase();
  if (v.includes('goi') || v.includes('call') || v.includes('dien')) return <Phone className="h-3.5 w-3.5" />;
  if (v.includes('sms') || v.includes('nhan_tin') || v.includes('message') || v.includes('chat')) return <MessageSquare className="h-3.5 w-3.5" />;
  if (v.includes('email') || v.includes('mail')) return <Mail className="h-3.5 w-3.5" />;
  if (v.includes('video') || v.includes('meet') || v.includes('zoom')) return <Video className="h-3.5 w-3.5" />;
  if (v.includes('gap') || v.includes('gap_mat') || v.includes('truc_tiep')) return <Users className="h-3.5 w-3.5" />;
  return <HelpCircle className="h-3.5 w-3.5" />;
}

// ─── Add Entry Form ────────────────────────────────────────────────────────────
interface AddEntryFormProps {
  taskTypeOptions: CatalogOption[];
  workspaceId: string;
  onSubmit: (content: string, taskType?: string, resultDescription?: string, assignedToUserId?: string, observers?: string[]) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function AddEntryForm({ taskTypeOptions, workspaceId, onSubmit, onCancel, isLoading }: AddEntryFormProps) {
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const [taskType, setTaskType] = useState('');
  const [resultDescription, setResultDescription] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [observers, setObservers] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(
      content.trim(),
      taskType || undefined,
      resultDescription?.trim() || undefined,
      assignedToUserId || undefined,
      observers.length > 0 ? observers : undefined,
    );
    setContent('');
    setTaskType('');
    setResultDescription('');
    setAssignedToUserId('');
    setObservers([]);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 rounded-xl p-4 bg-blue-50/50 space-y-3">
      {/* Row 1: Loại hình + Nội dung */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('customer.care.taskType')}
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value="">{t('customer.care.taskTypePlaceholder')}</option>
            {taskTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {taskTypeOptions.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-600">
              Chưa có loại hình — thêm tại /category
            </p>
          )}
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('customer.care.content')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('customer.care.contentPlaceholder')}
            rows={2}
            disabled={isLoading}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
          />
        </div>
      </div>

      {/* Row 2: Người thực hiện + Người quan sát — same style as Tab Thông tin */}
      <div className="grid grid-cols-2 gap-3">
        <MemberSearchSelect
          mode="single"
          workspaceId={workspaceId}
          label={t('customer.care.assignedTo') || 'Người thực hiện'}
          placeholder="Tìm nhân viên thực hiện..."
          value={assignedToUserId}
          onChange={setAssignedToUserId}
          disabled={isLoading}
        />
        <MemberSearchSelect
          mode="multi"
          workspaceId={workspaceId}
          label={t('customer.care.observers') || 'Người quan sát'}
          placeholder="Tìm nhân viên quan sát..."
          values={observers}
          onChange={setObservers}
          disabled={isLoading}
        />
      </div>

      {/* Row 3: Mô tả kết quả */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('customer.care.resultDescription') || 'Mô tả kết quả'}
        </label>
        <textarea
          value={resultDescription}
          onChange={(e) => setResultDescription(e.target.value)}
          placeholder={t('customer.care.resultDescriptionPlaceholder') || 'Nhập kết quả cuộc gọi, cuộc gặp...'}
          rows={2}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('customer.care.save')}
        </button>
      </div>
    </form>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CustomerCareHistoryTab({
  customerId,
  workspaceId,
  taskTypeOptions = [],
  memberOptions = [],
  listCareHistories,
  createCareHistory,
  updateCareHistory,
  deleteCareHistory,
  showAddForm: externalShowAddForm,
  onToggleAddForm: externalOnToggleAddForm,
}: CustomerCareHistoryTabProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [histories, setHistories] = useState<CustomerCareHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Inline edit states
  const [editContentId, setEditContentId] = useState<string | null>(null);
  const [editContentValue, setEditContentValue] = useState('');
  const [editResultId, setEditResultId] = useState<string | null>(null);
  const [editResultValue, setEditResultValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Use external showAddForm if provided, otherwise use internal state
  const actualShowAddForm = externalShowAddForm ?? showAddForm;
  const toggleAddForm = (show: boolean) => {
    if (externalOnToggleAddForm) {
      externalOnToggleAddForm(show);
    } else {
      setShowAddForm(show);
    }
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listCareHistories(customerId);
      setHistories(res?.data || []);
    } catch {
      toast.error(t('customer.care.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, listCareHistories]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (content: string, taskType?: string, resultDescription?: string, assignedToUserId?: string, observers?: string[]) => {
    setIsSubmitting(true);
    try {
      await createCareHistory(customerId, { content, taskType, resultDescription, assignedToUserId, observers });
      await load();
      toggleAddForm(false);
      toast.success(t('customer.care.addSuccess'));
    } catch {
      toast.error(t('customer.care.addError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveContent = async (h: CustomerCareHistory) => {
    if (!editContentValue.trim() || editContentValue.trim() === h.content) {
      setEditContentId(null);
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateCareHistory(customerId, h.id, { content: editContentValue.trim() });
      await load();
      setEditContentId(null);
      toast.success('Đã cập nhật nội dung');
    } catch {
      toast.error('Không thể cập nhật nội dung');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveResult = async (h: CustomerCareHistory) => {
    if (editResultValue.trim() === (h.resultDescription ?? '')) {
      setEditResultId(null);
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateCareHistory(customerId, h.id, { resultDescription: editResultValue.trim() || undefined });
      await load();
      setEditResultId(null);
      toast.success('Đã cập nhật kết quả');
    } catch {
      toast.error('Không thể cập nhật kết quả');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteCareHistory(customerId, deleteId);
      await load();
      toast.success(t('customer.care.deleteSuccess'));
    } catch {
      toast.error(t('customer.care.deleteError'));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolveTaskTypeLabel = (value: string) => {
    const opt = taskTypeOptions.find((o) => o.value === value);
    return opt?.label || value;
  };

  const PREVIEW_LENGTH = 180;

  return (
    <div className="flex flex-col gap-4">
      {/* Add button — only shown when not controlled externally */}
      {!externalOnToggleAddForm && !actualShowAddForm && (
        <button
          type="button"
          onClick={() => toggleAddForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors self-start"
        >
          <Plus className="h-4 w-4" />
          {t('customer.care.addEntry')}
        </button>
      )}

      {/* Add form */}
      {actualShowAddForm && (
        <AddEntryForm
          taskTypeOptions={taskTypeOptions}
          workspaceId={workspaceId}
          onSubmit={handleCreate}
          onCancel={() => toggleAddForm(false)}
          isLoading={isSubmitting}
        />
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : histories.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">{t('customer.care.empty')}</div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

          {histories.map((h) => {
            const authorName = h.createdBy?.fullName || 'N/A';
            const isExpanded = expandedIds.has(h.id);
            const isLong = h.content.length > PREVIEW_LENGTH;
            const observerList = (h as any).observerUsers as { id: string; fullName?: string | null; avatarUrl?: string | null }[] | undefined;
            const userId = user?.id;
            const userRole = (user as any)?.role as string | undefined;
            const isCreator  = h.createdByUserId === userId;
            const isAssignee = h.assignedToUserId === userId;
            const isObserver = (observerList ?? []).some((o) => o.id === userId);
            const isAdmin    = userRole === 'OWNER' || userRole === 'ADMIN';
            const canDelete      = isCreator || isAdmin;
            const canEditContent = isCreator || isAdmin;
            const canEditResult  = isCreator || isAssignee || isObserver || isAdmin;
            const isEditingContent = editContentId === h.id;
            const isEditingResult  = editResultId === h.id;

            return (
              <div key={h.id} className="relative flex gap-3 pb-4">
                {/* Timeline dot — task type icon */}
                <div className="relative z-10 flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-white border-2 border-purple-400 flex items-center justify-center text-purple-500">
                    <TaskTypeIcon value={h.taskType} />
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">

                  {/* ── Header bar: task type + creator + time + delete ── */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 min-w-0">
                      {h.taskType && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">
                          <TaskTypeIcon value={h.taskType} />
                          {resolveTaskTypeLabel(h.taskType)}
                        </span>
                      )}
                      {/* Creator */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-5 w-5 rounded-full shrink-0 bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-semibold overflow-hidden">
                          {h.createdBy?.avatarUrl ? (
                            <img src={h.createdBy.avatarUrl} alt={authorName} className="h-full w-full object-cover" />
                          ) : (
                            <span>{getInitials(h.createdBy?.fullName)}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{authorName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(h.createdAt)}</span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteId(h.id)}
                          className="p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={t('customer.care.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Assignee + Observers row ── */}
                  {(h.assignedTo || (observerList && observerList.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-4 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                      {h.assignedTo && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                            {t('customer.care.assignedTo') || 'Thực hiện'}:
                          </span>
                          <div className="h-5 w-5 rounded-full shrink-0 bg-green-100 text-green-700 flex items-center justify-center text-[9px] font-semibold overflow-hidden">
                            {h.assignedTo.avatarUrl ? (
                              <img src={h.assignedTo.avatarUrl} alt={h.assignedTo.fullName || ''} className="h-full w-full object-cover" />
                            ) : (
                              <span>{getInitials(h.assignedTo.fullName)}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{h.assignedTo.fullName || 'N/A'}</span>
                        </div>
                      )}
                      {observerList && observerList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                            {t('customer.care.observers') || 'Quan sát'}:
                          </span>
                          <div className="flex items-center -space-x-1.5 mr-1">
                            {observerList.slice(0, 3).map((ob) => (
                              <div
                                key={ob.id}
                                title={ob.fullName || ''}
                                className="h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-orange-100 text-orange-700 flex items-center justify-center text-[9px] font-semibold overflow-hidden"
                              >
                                {ob.avatarUrl ? (
                                  <img src={ob.avatarUrl} alt={ob.fullName || ''} className="h-full w-full object-cover" />
                                ) : (
                                  <span>{getInitials(ob.fullName)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {observerList.slice(0, 3).map((o) => o.fullName || '?').join(', ')}
                            {observerList.length > 3 && ` +${observerList.length - 3}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Main content ── */}
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        {t('customer.care.content')}
                      </p>
                      {canEditContent && !isEditingContent && (
                        <button
                          type="button"
                          onClick={() => { setEditContentId(h.id); setEditContentValue(h.content); }}
                          className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                          aria-label="Sửa nội dung"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {isEditingContent ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editContentValue}
                          onChange={(e) => setEditContentValue(e.target.value)}
                          rows={3}
                          autoFocus
                          disabled={isSavingEdit}
                          className="w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button type="button" onClick={() => setEditContentId(null)} disabled={isSavingEdit} className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                            <X className="h-3 w-3" /> Hủy
                          </button>
                          <button type="button" onClick={() => handleSaveContent(h)} disabled={isSavingEdit || !editContentValue.trim()} className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                          {isLong && !isExpanded ? `${h.content.slice(0, PREVIEW_LENGTH)}...` : h.content}
                        </p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(h.id)}
                            className="mt-1 flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-3.5 w-3.5" />{t('customer.care.showLess')}</>
                            ) : (
                              <><ChevronDown className="h-3.5 w-3.5" />{t('customer.care.showMore')}</>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* ── Result description ── */}
                  <div className="px-3 pt-1 pb-2.5 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        {t('customer.care.resultDescription') || 'Kết quả'}
                      </p>
                      {canEditResult && !isEditingResult && (
                        <button
                          type="button"
                          onClick={() => { setEditResultId(h.id); setEditResultValue(h.resultDescription ?? ''); }}
                          className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-green-500 transition-colors"
                          aria-label="Cập nhật kết quả"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {isEditingResult ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editResultValue}
                          onChange={(e) => setEditResultValue(e.target.value)}
                          rows={3}
                          autoFocus
                          disabled={isSavingEdit}
                          placeholder="Nhập kết quả..."
                          className="w-full px-2.5 py-1.5 text-sm border border-green-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:opacity-60"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button type="button" onClick={() => setEditResultId(null)} disabled={isSavingEdit} className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                            <X className="h-3 w-3" /> Hủy
                          </button>
                          <button type="button" onClick={() => handleSaveResult(h)} disabled={isSavingEdit} className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Lưu kết quả
                          </button>
                        </div>
                      </div>
                    ) : h.resultDescription ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{h.resultDescription}</p>
                    ) : canEditResult ? (
                      <button
                        type="button"
                        onClick={() => { setEditResultId(h.id); setEditResultValue(''); }}
                        className="text-xs text-gray-400 italic hover:text-green-600 transition-colors"
                      >
                        + Thêm kết quả...
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Chưa có kết quả</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('customer.care.confirmDeleteTitle')}
        message={t('customer.care.confirmDeleteMessage')}
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
}

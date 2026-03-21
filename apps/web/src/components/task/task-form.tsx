'use client';

import { useI18n } from '@/providers/i18n-provider';
import type { TaskFormData } from '@/hooks/use-task';

interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface CustomerOption {
  value: string;
  label: string;
}

interface TaskFormProps {
  formId: string;
  onSubmit: (data: TaskFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<TaskFormData & { id?: string }>;
  categoryOptions?: SelectOption[];
  priorityOptions?: SelectOption[];
  memberOptions?: { value: string; label: string }[];
  customerOptions?: CustomerOption[];
}

export function TaskForm({
  formId,
  onSubmit,
  isLoading,
  initialData,
  categoryOptions = [],
  priorityOptions = [],
  memberOptions = [],
  customerOptions = [],
}: TaskFormProps) {
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const get = (key: string) => (fd.get(key) as string)?.trim() || undefined;

    const data: TaskFormData = {
      customerId: get('customerId') || undefined,
      title: get('title') || '',
      description: get('description') || undefined,
      category: get('category') || undefined,
      priority: get('priority') || undefined,
      status: get('status') || 'TODO',
      startDate: get('startDate') || undefined,
      dueDate: get('dueDate') || undefined,
      assignedUserId: get('assignedUserId') || undefined,
    };

    onSubmit(data);
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] focus:border-transparent disabled:opacity-60';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 10);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className={labelCls}>{t('task.form.title')} <span className="text-red-500">*</span></label>
          <input
            name="title"
            required
            defaultValue={initialData?.title || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('task.form.titlePlaceholder')}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>{t('task.form.category')}</label>
          <select name="category" defaultValue={initialData?.category || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('task.form.categoryPlaceholder')}</option>
            {categoryOptions.length > 0 ? (
              categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="FOLLOW_UP">{t('task.category.FOLLOW_UP')}</option>
                <option value="CALL_BACK">{t('task.category.CALL_BACK')}</option>
                <option value="MEETING">{t('task.category.MEETING')}</option>
                <option value="DOCUMENT">{t('task.category.DOCUMENT')}</option>
                <option value="SITE_VISIT">{t('task.category.SITE_VISIT')}</option>
                <option value="OTHER">{t('task.category.OTHER')}</option>
              </>
            )}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>{t('task.form.status')}</label>
          <select name="status" defaultValue={initialData?.status || 'TODO'} disabled={isLoading} className={inputCls}>
            <option value="TODO">{t('task.status.TODO')}</option>
            <option value="IN_PROGRESS">{t('task.status.IN_PROGRESS')}</option>
            <option value="REVIEW">{t('task.status.REVIEW')}</option>
            <option value="DONE">{t('task.status.DONE')}</option>
            <option value="CANCELLED">{t('task.status.CANCELLED')}</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className={labelCls}>{t('task.form.priority')}</label>
          <select name="priority" defaultValue={initialData?.priority || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('task.form.priorityPlaceholder')}</option>
            {priorityOptions.length > 0 ? (
              priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="HIGH">{t('task.priority.HIGH')}</option>
                <option value="MEDIUM">{t('task.priority.MEDIUM')}</option>
                <option value="LOW">{t('task.priority.LOW')}</option>
              </>
            )}
          </select>
        </div>

        {/* Customer */}
        <div>
          <label className={labelCls}>{t('task.form.customer')}</label>
          <select name="customerId" defaultValue={initialData?.customerId || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('task.form.customerPlaceholder')}</option>
            {customerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className={labelCls}>{t('task.form.startDate')}</label>
          <input
            name="startDate"
            type="date"
            defaultValue={formatDate(initialData?.startDate)}
            disabled={isLoading}
            className={inputCls}
          />
        </div>

        {/* Due Date */}
        <div>
          <label className={labelCls}>{t('task.form.dueDate')}</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={formatDate(initialData?.dueDate)}
            disabled={isLoading}
            className={inputCls}
          />
        </div>

        {/* Assigned User */}
        <div>
          <label className={labelCls}>{t('task.form.assignedUser')}</label>
          <select name="assignedUserId" defaultValue={initialData?.assignedUserId || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('task.form.assignedUserPlaceholder')}</option>
            {memberOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>{t('task.form.description')}</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initialData?.description || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('task.form.descriptionPlaceholder')}
        />
      </div>
    </form>
  );
}

'use client';

import { useI18n } from '@/providers/i18n-provider';
import type { ActivityFormData } from '@/hooks/use-activity';

interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface CustomerOption {
  value: string;
  label: string;
}

interface DemandOption {
  value: string;
  label: string;
}

interface ActivityFormProps {
  formId: string;
  onSubmit: (data: ActivityFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<ActivityFormData & { id?: string }>;
  typeOptions?: SelectOption[];
  resultOptions?: SelectOption[];
  customerOptions?: CustomerOption[];
  demandOptions?: DemandOption[];
}

export function ActivityForm({
  formId,
  onSubmit,
  isLoading,
  initialData,
  typeOptions = [],
  resultOptions = [],
  customerOptions = [],
  demandOptions = [],
}: ActivityFormProps) {
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const get = (key: string) => (fd.get(key) as string)?.trim() || undefined;
    const getNum = (key: string) => {
      const v = get(key);
      return v ? parseInt(v, 10) : undefined;
    };

    const data: ActivityFormData = {
      customerId: get('customerId') || undefined,
      demandId: get('demandId') || undefined,
      type: get('type') || 'NOTE',
      title: get('title') || '',
      content: get('content') || undefined,
      result: get('result') || undefined,
      activityDate: get('activityDate') || undefined,
      duration: getNum('duration'),
      status: get('status') || 'COMPLETED',
    };

    onSubmit(data);
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] focus:border-transparent disabled:opacity-60';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  // Format default date for input
  const defaultDate = initialData?.activityDate
    ? new Date(initialData.activityDate).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className={labelCls}>{t('activity.form.title')} <span className="text-red-500">*</span></label>
          <input
            name="title"
            required
            defaultValue={initialData?.title || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('activity.form.titlePlaceholder')}
          />
        </div>

        {/* Type */}
        <div>
          <label className={labelCls}>{t('activity.form.type')} <span className="text-red-500">*</span></label>
          <select name="type" required defaultValue={initialData?.type || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('activity.form.typePlaceholder')}</option>
            {typeOptions.length > 0 ? (
              typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="CALL">{t('activity.type.CALL')}</option>
                <option value="MEETING">{t('activity.type.MEETING')}</option>
                <option value="EMAIL">{t('activity.type.EMAIL')}</option>
                <option value="NOTE">{t('activity.type.NOTE')}</option>
                <option value="VISIT">{t('activity.type.VISIT')}</option>
                <option value="SMS">{t('activity.type.SMS')}</option>
                <option value="OTHER">{t('activity.type.OTHER')}</option>
              </>
            )}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>{t('activity.form.status')}</label>
          <select name="status" defaultValue={initialData?.status || 'COMPLETED'} disabled={isLoading} className={inputCls}>
            <option value="PLANNED">{t('activity.status.PLANNED')}</option>
            <option value="IN_PROGRESS">{t('activity.status.IN_PROGRESS')}</option>
            <option value="COMPLETED">{t('activity.status.COMPLETED')}</option>
            <option value="CANCELLED">{t('activity.status.CANCELLED')}</option>
          </select>
        </div>

        {/* Customer */}
        <div>
          <label className={labelCls}>{t('activity.form.customer')}</label>
          <select name="customerId" defaultValue={initialData?.customerId || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('activity.form.customerPlaceholder')}</option>
            {customerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Demand */}
        <div>
          <label className={labelCls}>{t('activity.form.demand')}</label>
          <select name="demandId" defaultValue={initialData?.demandId || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('activity.form.demandPlaceholder')}</option>
            {demandOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Activity Date */}
        <div>
          <label className={labelCls}>{t('activity.form.activityDate')}</label>
          <input
            name="activityDate"
            type="datetime-local"
            defaultValue={defaultDate}
            disabled={isLoading}
            className={inputCls}
          />
        </div>

        {/* Duration */}
        <div>
          <label className={labelCls}>{t('activity.form.duration')}</label>
          <input
            name="duration"
            type="number"
            min="0"
            defaultValue={initialData?.duration ?? ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('activity.form.durationPlaceholder')}
          />
        </div>

        {/* Result */}
        <div>
          <label className={labelCls}>{t('activity.form.result')}</label>
          <select name="result" defaultValue={initialData?.result || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('activity.form.resultPlaceholder')}</option>
            {resultOptions.length > 0 ? (
              resultOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="POSITIVE">{t('activity.result.POSITIVE')}</option>
                <option value="NEUTRAL">{t('activity.result.NEUTRAL')}</option>
                <option value="NEGATIVE">{t('activity.result.NEGATIVE')}</option>
                <option value="NO_ANSWER">{t('activity.result.NO_ANSWER')}</option>
                <option value="CALLBACK">{t('activity.result.CALLBACK')}</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Content */}
      <div>
        <label className={labelCls}>{t('activity.form.content')}</label>
        <textarea
          name="content"
          rows={3}
          defaultValue={initialData?.content || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('activity.form.contentPlaceholder')}
        />
      </div>
    </form>
  );
}

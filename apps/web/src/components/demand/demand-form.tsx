'use client';

import { useI18n } from '@/providers/i18n-provider';
import type { DemandFormData } from '@/hooks/use-demand';

interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface CustomerOption {
  value: string;
  label: string;
}

interface DemandFormProps {
  formId: string;
  onSubmit: (data: DemandFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<DemandFormData & { id?: string }>;
  propertyTypeOptions?: SelectOption[];
  purposeOptions?: SelectOption[];
  statusOptions?: SelectOption[];
  priorityOptions?: SelectOption[];
  memberOptions?: { value: string; label: string }[];
  customerOptions?: CustomerOption[];
}

export function DemandForm({
  formId,
  onSubmit,
  isLoading,
  initialData,
  propertyTypeOptions = [],
  purposeOptions = [],
  statusOptions = [],
  priorityOptions = [],
  memberOptions = [],
  customerOptions = [],
}: DemandFormProps) {
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const get = (key: string) => (fd.get(key) as string)?.trim() || undefined;
    const getNum = (key: string) => {
      const v = get(key);
      return v ? parseFloat(v) : undefined;
    };

    const data: DemandFormData = {
      customerId: get('customerId') || undefined,
      title: get('title') || '',
      propertyType: get('propertyType') || undefined,
      purpose: get('purpose') || undefined,
      budgetMin: getNum('budgetMin'),
      budgetMax: getNum('budgetMax'),
      budgetUnit: get('budgetUnit') || 'VND',
      areaMin: getNum('areaMin'),
      areaMax: getNum('areaMax'),
      address: get('address') || undefined,
      status: get('status') || 'NEW',
      priority: get('priority') || undefined,
      assignedUserId: get('assignedUserId') || undefined,
      description: get('description') || undefined,
      note: get('note') || undefined,
    };

    onSubmit(data);
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className={labelCls}>{t('demand.form.title')} <span className="text-red-500">*</span></label>
          <input
            name="title"
            required
            defaultValue={initialData?.title || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('demand.form.titlePlaceholder')}
          />
        </div>

        {/* Customer */}
        <div>
          <label className={labelCls}>{t('demand.form.customer')}</label>
          <select name="customerId" defaultValue={initialData?.customerId || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('demand.form.customerPlaceholder')}</option>
            {customerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Property Type */}
        <div>
          <label className={labelCls}>{t('demand.form.propertyType')}</label>
          <select name="propertyType" defaultValue={initialData?.propertyType || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('demand.form.propertyTypePlaceholder')}</option>
            {propertyTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Purpose */}
        <div>
          <label className={labelCls}>{t('demand.form.purpose')}</label>
          <select name="purpose" defaultValue={initialData?.purpose || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('demand.form.purposePlaceholder')}</option>
            {purposeOptions.length > 0 ? (
              purposeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="BUY">{t('demand.purpose.BUY')}</option>
                <option value="RENT">{t('demand.purpose.RENT')}</option>
                <option value="INVEST">{t('demand.purpose.INVEST')}</option>
              </>
            )}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>{t('demand.form.status')}</label>
          <select name="status" defaultValue={initialData?.status || 'NEW'} disabled={isLoading} className={inputCls}>
            {statusOptions.length > 0 ? (
              statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="NEW">{t('demand.status.NEW')}</option>
                <option value="SEARCHING">{t('demand.status.SEARCHING')}</option>
                <option value="MATCHED">{t('demand.status.MATCHED')}</option>
                <option value="COMPLETED">{t('demand.status.COMPLETED')}</option>
                <option value="CANCELLED">{t('demand.status.CANCELLED')}</option>
              </>
            )}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className={labelCls}>{t('demand.form.priority')}</label>
          <select name="priority" defaultValue={initialData?.priority || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('demand.form.priorityPlaceholder')}</option>
            {priorityOptions.length > 0 ? (
              priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="HIGH">{t('demand.priority.HIGH')}</option>
                <option value="MEDIUM">{t('demand.priority.MEDIUM')}</option>
                <option value="LOW">{t('demand.priority.LOW')}</option>
              </>
            )}
          </select>
        </div>

        {/* Budget Min */}
        <div>
          <label className={labelCls}>{t('demand.form.budgetMin')}</label>
          <input
            name="budgetMin"
            type="number"
            min="0"
            step="any"
            defaultValue={initialData?.budgetMin ?? ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('demand.form.budgetMinPlaceholder')}
          />
        </div>

        {/* Budget Max */}
        <div>
          <label className={labelCls}>{t('demand.form.budgetMax')}</label>
          <input
            name="budgetMax"
            type="number"
            min="0"
            step="any"
            defaultValue={initialData?.budgetMax ?? ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('demand.form.budgetMaxPlaceholder')}
          />
        </div>

        {/* Area Min */}
        <div>
          <label className={labelCls}>{t('demand.form.areaMin')}</label>
          <input
            name="areaMin"
            type="number"
            min="0"
            step="any"
            defaultValue={initialData?.areaMin ?? ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('demand.form.areaMinPlaceholder')}
          />
        </div>

        {/* Area Max */}
        <div>
          <label className={labelCls}>{t('demand.form.areaMax')}</label>
          <input
            name="areaMax"
            type="number"
            min="0"
            step="any"
            defaultValue={initialData?.areaMax ?? ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('demand.form.areaMaxPlaceholder')}
          />
        </div>

        {/* Assigned User */}
        <div>
          <label className={labelCls}>{t('demand.form.assignedUser')}</label>
          <select name="assignedUserId" defaultValue={initialData?.assignedUserId || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('demand.form.assignedUserPlaceholder')}</option>
            {memberOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className={labelCls}>{t('demand.form.address')}</label>
        <input
          name="address"
          defaultValue={initialData?.address || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('demand.form.addressPlaceholder')}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>{t('demand.form.description')}</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initialData?.description || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('demand.form.descriptionPlaceholder')}
        />
      </div>

      {/* Note */}
      <div>
        <label className={labelCls}>{t('demand.form.note')}</label>
        <textarea
          name="note"
          rows={2}
          defaultValue={initialData?.note || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('demand.form.notePlaceholder')}
        />
      </div>
    </form>
  );
}

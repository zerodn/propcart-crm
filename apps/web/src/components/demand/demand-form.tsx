'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/providers/i18n-provider';
import { CustomerSearchSelect, type CustomerSearchResult } from '@/components/common/customer-search-select';
import type { DemandFormData } from '@/hooks/use-demand';

interface LocationItem {
  code: number | string;
  name: string;
}

interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface DemandFormProps {
  formId: string;
  workspaceId: string;
  onSubmit: (data: DemandFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<DemandFormData & { id?: string }>;
  initialCustomer?: CustomerSearchResult | null;
  propertyTypeOptions?: SelectOption[];
  purposeOptions?: SelectOption[];
  statusOptions?: SelectOption[];
  priorityOptions?: SelectOption[];
  memberOptions?: { value: string; label: string }[];
}

export function DemandForm({
  formId,
  workspaceId,
  onSubmit,
  isLoading,
  initialData,
  initialCustomer,
  propertyTypeOptions = [],
  purposeOptions = [],
  statusOptions = [],
  priorityOptions = [],
  memberOptions = [],
}: DemandFormProps) {
  const { t } = useI18n();

  // Controlled: customer, province/ward
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [provinceCode, setProvinceCode] = useState(initialData?.provinceCode || '');
  const [wardCode, setWardCode] = useState(initialData?.wardCode || '');
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [cachedProvinceName, setCachedProvinceName] = useState(initialData?.provinceName || '');
  const [cachedWardName, setCachedWardName] = useState(initialData?.wardName || '');

  // Re-sync when editing a different demand
  useEffect(() => {
    setCustomerId(initialData?.customerId || '');
    setProvinceCode(initialData?.provinceCode || '');
    setWardCode(initialData?.wardCode || '');
    setCachedProvinceName(initialData?.provinceName || '');
    setCachedWardName(initialData?.wardName || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData?.customerId,
    initialData?.provinceCode,
    initialData?.wardCode,
  ]);

  // Fetch provinces once on mount
  useEffect(() => {
    setIsLoadingProvinces(true);
    fetch('https://provinces.open-api.vn/api/v2/?depth=1')
      .then((r) => r.json())
      .then((data: LocationItem[]) => setProvinces(data || []))
      .catch(() => {})
      .finally(() => setIsLoadingProvinces(false));
  }, []);

  // Fetch wards when province changes
  useEffect(() => {
    if (!provinceCode) { setWards([]); return; }
    setIsLoadingWards(true);
    fetch(`https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((data: { wards?: LocationItem[] }) => setWards(data.wards || []))
      .catch(() => setWards([]))
      .finally(() => setIsLoadingWards(false));
  }, [provinceCode]);

  const handleProvinceChange = (code: string) => {
    setProvinceCode(code);
    setWardCode('');
    setWards([]);
    const found = provinces.find((p) => String(p.code) === code);
    setCachedProvinceName(found?.name || '');
    setCachedWardName('');
  };

  const handleWardChange = (code: string) => {
    setWardCode(code);
    const found = wards.find((w) => String(w.code) === code);
    setCachedWardName(found?.name || '');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (key: string) => (fd.get(key) as string)?.trim() || undefined;
    const getNum = (key: string) => {
      const v = get(key);
      return v ? parseFloat(v) : undefined;
    };

    const pCode = provinceCode || undefined;
    const wCode = wardCode || undefined;
    const pName = cachedProvinceName || provinces.find((p) => String(p.code) === provinceCode)?.name || undefined;
    const wName = cachedWardName || wards.find((w) => String(w.code) === wardCode)?.name || undefined;

    const data: DemandFormData = {
      customerId: customerId || undefined,
      title: get('title') || '',
      propertyType: get('propertyType') || undefined,
      purpose: get('purpose') || undefined,
      status: get('status') || 'NEW',
      priority: get('priority') || undefined,
      budgetMin: getNum('budgetMin'),
      budgetMax: getNum('budgetMax'),
      budgetUnit: 'VND',
      areaMin: getNum('areaMin'),
      areaMax: getNum('areaMax'),
      provinceCode: pCode,
      provinceName: pName,
      wardCode: wCode,
      wardName: wName,
      address: get('address') || undefined,
      assignedUserId: get('assignedUserId') || undefined,
      description: get('description') || undefined,
      note: get('note') || undefined,
    };

    onSubmit(data);
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] focus:border-transparent disabled:opacity-60';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">

      {/* Row 1: Tiêu đề */}
      <div>
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

      {/* Row 2: Khách hàng | Trạng thái */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomerSearchSelect
          workspaceId={workspaceId}
          label={t('demand.form.customer')}
          placeholder="Tìm theo tên, SĐT, mã KH..."
          value={customerId}
          onChange={(id) => setCustomerId(id)}
          disabled={isLoading}
          initialCustomer={initialCustomer}
        />

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
      </div>

      {/* Row 3: Loại BĐS | Mục đích | Mức độ ưu tiên */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>{t('demand.form.propertyType')}</label>
          <select name="propertyType" defaultValue={initialData?.propertyType || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('demand.form.propertyTypePlaceholder')}</option>
            {propertyTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

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
      </div>

      {/* Row 4: Ngân sách tối thiểu | Ngân sách tối đa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Row 5: Diện tích tối thiểu (m²) | Diện tích tối đa (m²) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t('demand.form.areaMin')} (m²)</label>
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
        <div>
          <label className={labelCls}>{t('demand.form.areaMax')} (m²)</label>
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
      </div>

      {/* Row 6: Tỉnh/Thành phố | Phường/Xã | Khu vực mong muốn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Tỉnh/Thành phố</label>
          <select
            value={provinceCode}
            onChange={(e) => handleProvinceChange(e.target.value)}
            disabled={isLoading || isLoadingProvinces}
            className={inputCls}
          >
            <option value="">Chọn tỉnh/thành phố</option>
            {provinces.map((p) => (
              <option key={p.code} value={String(p.code)}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Phường/Xã</label>
          <select
            value={wardCode}
            onChange={(e) => handleWardChange(e.target.value)}
            disabled={isLoading || !provinceCode || isLoadingWards}
            className={inputCls}
          >
            <option value="">Chọn phường/xã</option>
            {wards.map((w) => (
              <option key={w.code} value={String(w.code)}>{w.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Khu vực mong muốn</label>
          <input
            name="address"
            defaultValue={initialData?.address || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder="VD: Gần trường học, mặt tiền đường lớn..."
          />
        </div>
      </div>

      {/* Row 7: Chi tiết yêu cầu (formerly Mô tả chi tiết) */}
      <div>
        <label className={labelCls}>Chi tiết yêu cầu</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={initialData?.description || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder="Mô tả chi tiết yêu cầu bất động sản..."
        />
      </div>

      {/* Row 8: Ghi chú */}
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


'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/providers/i18n-provider';
import type { CustomerFormData } from '@/hooks/use-customer';
import { MemberSearchSelect } from '@/components/common/member-search-select';

interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface LocationItem {
  code: number;
  name: string;
}

// MemberOption kept for backward compat (used as initialMembers source)
export interface MemberOption {
  userId: string;
  displayName?: string | null;
}
interface CustomerFormProps {
  formId: string;
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<CustomerFormData & { id?: string }>;
  statusOptions?: SelectOption[];
  interestLevelOptions?: SelectOption[];
  sourceOptions?: SelectOption[];
  groupOptions?: SelectOption[];
  titleOptions?: SelectOption[];
  workspaceId: string;
  /** Pre-populated member data for initial display of selected IDs */
  workspaceMemberData?: MemberOption[];
}

export function CustomerForm({
  formId,
  onSubmit,
  isLoading,
  initialData,
  statusOptions = [],
  interestLevelOptions = [],
  sourceOptions = [],
  groupOptions = [],
  titleOptions = [],
  workspaceId,
  workspaceMemberData = [],
}: CustomerFormProps) {
  const { t } = useI18n();

  // Province / Ward state
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [provinceCode, setProvinceCode] = useState(initialData?.provinceCode || '');
  const [wardCode, setWardCode] = useState(initialData?.wardCode || '');
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  // AssignedUser single search-select
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assignedUserId || '');

  // Multi-select: assignees + observers
  const [assignees, setAssignees] = useState<string[]>(
    Array.isArray(initialData?.assignees) ? (initialData.assignees as string[]) : [],
  );
  const [observers, setObservers] = useState<string[]>(
    Array.isArray(initialData?.observers) ? (initialData.observers as string[]) : [],
  );

  // Re-sync when initialData changes (different customer opened in dialog)
  useEffect(() => {
    setProvinceCode(initialData?.provinceCode || '');
    setWardCode(initialData?.wardCode || '');
    setAssignedUserId(initialData?.assignedUserId || '');
    setAssignees(Array.isArray(initialData?.assignees) ? (initialData.assignees as string[]) : []);
    setObservers(Array.isArray(initialData?.observers) ? (initialData.observers as string[]) : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData?.assignedUserId,
    initialData?.provinceCode,
    initialData?.wardCode,
    JSON.stringify(initialData?.assignees),
    JSON.stringify(initialData?.observers),
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
    if (!provinceCode) {
      setWards([]);
      return;
    }
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
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (key: string) => (fd.get(key) as string)?.trim() || undefined;

    const pCode = provinceCode || undefined;
    const wCode = wardCode || undefined;
    const pName = provinces.find((p) => String(p.code) === provinceCode)?.name || undefined;
    const wName = wards.find((w) => String(w.code) === wardCode)?.name || undefined;

    const data: CustomerFormData = {
      title: get('title') || undefined,
      fullName: get('fullName') || '',
      phone: get('phone') || undefined,
      email: get('email') || undefined,
      gender: get('gender') || undefined,
      dateOfBirth: get('dateOfBirth') || undefined,
      address: get('address') || undefined,
      source: get('source') || undefined,
      group: get('group') || undefined,
      status: get('status') || 'NEW',
      interestLevel: get('interestLevel') || undefined,
      assignedUserId: assignedUserId || undefined,
      assignees: assignees.length > 0 ? assignees : undefined,
      observers: observers.length > 0 ? observers : undefined,
      provinceCode: pCode,
      provinceName: pName,
      wardCode: wCode,
      wardName: wName,
      note: get('note') || undefined,
    };

    onSubmit(data);
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Danh xưng | Họ tên | Giới tính | Ngày sinh */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>{t('customer.form.title')}</label>
          <select
            name="title"
            defaultValue={initialData?.title || ''}
            disabled={isLoading}
            className={inputCls}
          >
            <option value="">{t('customer.form.titlePlaceholder')}</option>
            {titleOptions.length > 0 ? (
              titleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="MR">Ông</option>
                <option value="MRS">Bà</option>
                <option value="MS">Chị</option>
                <option value="MISS">Cô</option>
                <option value="DR">Chú</option>
                <option value="PROF">Bác</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t('customer.form.fullName')} <span className="text-red-500">*</span>
          </label>
          <input
            name="fullName"
            required
            defaultValue={initialData?.fullName || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('customer.form.fullNamePlaceholder')}
          />
        </div>

        <div>
          <label className={labelCls}>{t('customer.form.gender')}</label>
          <select
            name="gender"
            defaultValue={initialData?.gender || ''}
            disabled={isLoading}
            className={inputCls}
          >
            <option value="">{t('customer.form.genderPlaceholder')}</option>
            <option value="MALE">{t('customer.form.genderMale')}</option>
            <option value="FEMALE">{t('customer.form.genderFemale')}</option>
            <option value="OTHER">{t('customer.form.genderOther')}</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>{t('customer.form.dateOfBirth')}</label>
          <input
            name="dateOfBirth"
            type="date"
            defaultValue={initialData?.dateOfBirth ? initialData.dateOfBirth.slice(0, 10) : ''}
            disabled={isLoading}
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 2: Số điện thoại | Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t('customer.form.phone')}</label>
          <input
            name="phone"
            defaultValue={initialData?.phone || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('customer.form.phonePlaceholder')}
          />
        </div>
        <div>
          <label className={labelCls}>{t('customer.form.email')}</label>
          <input
            name="email"
            type="email"
            defaultValue={initialData?.email || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('customer.form.emailPlaceholder')}
          />
        </div>
      </div>

      {/* Row 3: Tỉnh/Thành phố | Phường/Xã | Địa chỉ (col-span-2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>{t('personalInfoForm.province')}</label>
          <select
            value={provinceCode}
            onChange={(e) => handleProvinceChange(e.target.value)}
            disabled={isLoading || isLoadingProvinces}
            className={inputCls}
          >
            <option value="">{t('personalInfoForm.provincePlaceholder')}</option>
            {provinces.map((p) => (
              <option key={p.code} value={String(p.code)}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t('personalInfoForm.ward')}</label>
          <select
            value={wardCode}
            onChange={(e) => setWardCode(e.target.value)}
            disabled={isLoading || !provinceCode || isLoadingWards}
            className={inputCls}
          >
            <option value="">{t('personalInfoForm.wardPlaceholder')}</option>
            {wards.map((w) => (
              <option key={w.code} value={String(w.code)}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>{t('customer.form.address')}</label>
          <input
            name="address"
            defaultValue={initialData?.address || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('customer.form.addressPlaceholder')}
          />
        </div>
      </div>

      {/* Row 4: Nhóm khách hàng | Nguồn khách hàng | Mức quan tâm | Trạng thái */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>{t('customer.form.group')}</label>
          <select name="group" defaultValue={initialData?.group || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.groupPlaceholder')}</option>
            {groupOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t('customer.form.source')}</label>
          <select name="source" defaultValue={initialData?.source || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.sourcePlaceholder')}</option>
            {sourceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t('customer.form.interestLevel')}</label>
          <select name="interestLevel" defaultValue={initialData?.interestLevel || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.interestLevelPlaceholder')}</option>
            {interestLevelOptions.length > 0 ? (
              interestLevelOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="HOT">{t('customer.interestLevel.HOT')}</option>
                <option value="WARM">{t('customer.interestLevel.WARM')}</option>
                <option value="COLD">{t('customer.interestLevel.COLD')}</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t('customer.form.status')}</label>
          <select name="status" defaultValue={initialData?.status || 'NEW'} disabled={isLoading} className={inputCls}>
            {statusOptions.length > 0 ? (
              statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <>
                <option value="NEW">{t('customer.status.NEW')}</option>
                <option value="CONTACTED">{t('customer.status.CONTACTED')}</option>
                <option value="INTERESTED">{t('customer.status.INTERESTED')}</option>
                <option value="NEGOTIATING">{t('customer.status.NEGOTIATING')}</option>
                <option value="CONVERTED">{t('customer.status.CONVERTED')}</option>
                <option value="LOST">{t('customer.status.LOST')}</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Row 5: Nhân viên phụ trách | Người quan sát */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MemberSearchSelect
          mode="single"
          workspaceId={workspaceId}
          label={t('customer.form.assignedUser')}
          placeholder={t('customer.form.assignedUserPlaceholder')}
          value={assignedUserId}
          onChange={setAssignedUserId}
          disabled={isLoading}
          initialMembers={workspaceMemberData}
        />
        <MemberSearchSelect
          mode="multi"
          workspaceId={workspaceId}
          label={t('customer.form.observers')}
          placeholder={t('customer.form.observersPlaceholder')}
          values={observers}
          onChange={setObservers}
          disabled={isLoading}
          initialMembers={workspaceMemberData}
        />
      </div>

      {/* Ghi chú */}
      <div>
        <label className={labelCls}>{t('customer.form.note')}</label>
        <textarea
          name="note"
          rows={3}
          defaultValue={initialData?.note || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('customer.form.notePlaceholder')}
        />
      </div>
    </form>
  );
}

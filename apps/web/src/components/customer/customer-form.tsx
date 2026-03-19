'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { cn } from '@/lib/utils';
import type { CustomerFormData } from '@/hooks/use-customer';

interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface LocationItem {
  code: number;
  name: string;
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
  memberOptions?: { value: string; label: string }[];
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
  memberOptions = [],
}: CustomerFormProps) {
  const { t } = useI18n();

  // Province / Ward state
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [provinceCode, setProvinceCode] = useState(initialData?.provinceCode || '');
  const [wardCode, setWardCode] = useState(initialData?.wardCode || '');
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  // AssignedUser search-select state
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assignedUserId || '');
  const [memberKeyword, setMemberKeyword] = useState(
    () => memberOptions.find((m) => m.value === (initialData?.assignedUserId || ''))?.label || '',
  );
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Re-sync when initialData changes (different customer opened in dialog)
  useEffect(() => {
    setProvinceCode(initialData?.provinceCode || '');
    setWardCode(initialData?.wardCode || '');
    const uid = initialData?.assignedUserId || '';
    setAssignedUserId(uid);
    setMemberKeyword(memberOptions.find((m) => m.value === uid)?.label || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.assignedUserId, initialData?.provinceCode, initialData?.wardCode]);

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

  // Close member dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredMembers = memberKeyword.trim()
    ? memberOptions.filter((m) => m.label.toLowerCase().includes(memberKeyword.toLowerCase()))
    : memberOptions.slice(0, 25);

  const handleProvinceChange = (code: string) => {
    setProvinceCode(code);
    setWardCode('');
    setWards([]);
  };

  const handleMemberSelect = (option: { value: string; label: string }) => {
    if (assignedUserId === option.value) {
      setAssignedUserId('');
      setMemberKeyword('');
    } else {
      setAssignedUserId(option.value);
      setMemberKeyword(option.label);
    }
    setIsMemberDropdownOpen(false);
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
      fullName: get('fullName') || '',
      phone: get('phone') || '',
      email: get('email') || undefined,
      gender: get('gender') || undefined,
      dateOfBirth: get('dateOfBirth') || undefined,
      address: get('address') || undefined,
      source: get('source') || undefined,
      group: get('group') || undefined,
      status: get('status') || 'NEW',
      interestLevel: get('interestLevel') || undefined,
      assignedUserId: assignedUserId || undefined,
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
      {/* Row 1-3 — Basic info — 3 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Full Name */}
        <div>
          <label className={labelCls}>{t('customer.form.fullName')} <span className="text-red-500">*</span></label>
          <input
            name="fullName"
            required
            defaultValue={initialData?.fullName || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('customer.form.fullNamePlaceholder')}
          />
        </div>

        {/* Phone */}
        <div>
          <label className={labelCls}>{t('customer.form.phone')} <span className="text-red-500">*</span></label>
          <input
            name="phone"
            required
            defaultValue={initialData?.phone || ''}
            disabled={isLoading}
            className={inputCls}
            placeholder={t('customer.form.phonePlaceholder')}
          />
        </div>

        {/* Email */}
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

        {/* Gender */}
        <div>
          <label className={labelCls}>{t('customer.form.gender')}</label>
          <select name="gender" defaultValue={initialData?.gender || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.genderPlaceholder')}</option>
            <option value="MALE">{t('customer.form.genderMale')}</option>
            <option value="FEMALE">{t('customer.form.genderFemale')}</option>
            <option value="OTHER">{t('customer.form.genderOther')}</option>
          </select>
        </div>

        {/* Date of Birth */}
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

        {/* Status */}
        <div>
          <label className={labelCls}>{t('customer.form.status')}</label>
          <select name="status" defaultValue={initialData?.status || 'NEW'} disabled={isLoading} className={inputCls}>
            {statusOptions.length > 0 ? (
              statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
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

        {/* Interest Level */}
        <div>
          <label className={labelCls}>{t('customer.form.interestLevel')}</label>
          <select name="interestLevel" defaultValue={initialData?.interestLevel || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.interestLevelPlaceholder')}</option>
            {interestLevelOptions.length > 0 ? (
              interestLevelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
            ) : (
              <>
                <option value="HOT">{t('customer.interestLevel.HOT')}</option>
                <option value="WARM">{t('customer.interestLevel.WARM')}</option>
                <option value="COLD">{t('customer.interestLevel.COLD')}</option>
              </>
            )}
          </select>
        </div>

        {/* Source */}
        <div>
          <label className={labelCls}>{t('customer.form.source')}</label>
          <select name="source" defaultValue={initialData?.source || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.sourcePlaceholder')}</option>
            {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Group */}
        <div>
          <label className={labelCls}>{t('customer.form.group')}</label>
          <select name="group" defaultValue={initialData?.group || ''} disabled={isLoading} className={inputCls}>
            <option value="">{t('customer.form.groupPlaceholder')}</option>
            {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row 4 — Province | Ward | Assigned User — 3 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Province */}
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

        {/* Ward */}
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

        {/* Assigned User — search-as-you-type single select */}
        <div>
          <label className={labelCls}>{t('customer.form.assignedUser')}</label>
          <div className="relative" ref={memberDropdownRef}>
            {/* Trigger */}
            <div
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent dark:border-gray-600 dark:bg-gray-800',
                isLoading && 'opacity-60 pointer-events-none',
              )}
            >
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={memberKeyword}
                onChange={(e) => {
                  setMemberKeyword(e.target.value);
                  setIsMemberDropdownOpen(true);
                  if (!e.target.value) setAssignedUserId('');
                }}
                onFocus={() => setIsMemberDropdownOpen(true)}
                placeholder={t('customer.form.assignedUserPlaceholder')}
                className="flex-1 border-none bg-transparent p-0 text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                disabled={isLoading}
              />
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-400 shrink-0 transition-transform',
                  isMemberDropdownOpen && 'rotate-180',
                )}
              />
            </div>

            {/* Dropdown */}
            {isMemberDropdownOpen && (
              <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700">
                {filteredMembers.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-center text-gray-400">
                    {t('customer.form.assignedUserNoResult')}
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.value}
                      type="button"
                      onClick={() => handleMemberSelect(member)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span
                        className={cn(
                          'text-gray-900 dark:text-gray-100',
                          assignedUserId === member.value && 'text-blue-600 font-medium',
                        )}
                      >
                        {member.label}
                      </span>
                      {assignedUserId === member.value && (
                        <Check className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className={labelCls}>{t('customer.form.address')}</label>
        <input
          name="address"
          defaultValue={initialData?.address || ''}
          disabled={isLoading}
          className={inputCls}
          placeholder={t('customer.form.addressPlaceholder')}
        />
      </div>

      {/* Note */}
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

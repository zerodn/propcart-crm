'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';

interface LocationItem {
  code: number;
  name: string;
}

interface MemberAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  availableRoles?: Array<{ id: string; code: string; name: string }> | null;
}

export function MemberAddDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  availableRoles = [],
}: MemberAddDialogProps) {
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [contractType, setContractType] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [wardName, setWardName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [wardLoading, setWardLoading] = useState(false);

  const [hdldOptions, setHdldOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [employmentStatus, setEmploymentStatus] = useState('');
  const { t } = useI18n();

  const rolesArray = Array.isArray(availableRoles) ? availableRoles : [];

  // Load provinces
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/?depth=1')
      .then((r) => r.json())
      .then((list: LocationItem[]) => setProvinces(list || []))
      .catch(() => setProvinces([]));
  }, []);

  // Load wards when province changes
  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      return;
    }
    setWardLoading(true);
    fetch(`https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((payload: { wards?: LocationItem[] }) => {
        setWards((payload.wards || []).map((w) => ({ code: w.code, name: w.name })));
      })
      .catch(() => setWards([]))
      .finally(() => setWardLoading(false));
  }, [provinceCode]);

  // Set default role when roles load
  useEffect(() => {
    if (rolesArray.length > 0 && !roleId) {
      const salesRole = rolesArray.find((r) => r.code === 'SALES');
      setRoleId(salesRole?.id || rolesArray[0].id);
    }
  }, [rolesArray]);

  // Load HDLD_TYPE and EMPLOYMENT_STATUS catalog options
  useEffect(() => {
    const loadCatalogOptions = async () => {
      try {
        const [hdldRes, empRes] = await Promise.all([
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=HDLD_TYPE`),
          apiClient.get(`/workspaces/${workspaceId}/catalogs?type=EMPLOYMENT_STATUS`),
        ]);

        const findValues = (res: { data: { data?: unknown[] } }, code: string) => {
          const catalogs = Array.isArray(res.data?.data) ? res.data.data : [];
          const catalog = catalogs.find((c: unknown) => (c as Record<string, unknown>).code === code);
          if (catalog && Array.isArray((catalog as Record<string, unknown>).values)) {
            return (catalog as { values: Array<{ value: string; label: string }> }).values.map(
              (v) => ({ value: v.value, label: v.label }),
            );
          }
          return [];
        };

        setHdldOptions(findValues(hdldRes, 'HDLD_TYPE'));
        setEmploymentStatusOptions(findValues(empRes, 'EMPLOYMENT_STATUS'));
      } catch {
        setHdldOptions([]);
        setEmploymentStatusOptions([]);
      }
    };
    if (workspaceId) loadCatalogOptions();
  }, [workspaceId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setDisplayName('');
      setWorkspaceEmail('');
      setContractType('');
      setEmploymentStatus('');
      setProvinceCode('');
      setProvinceName('');
      setWardCode('');
      setWardName('');
      setAddressLine('');
      if (rolesArray.length > 0) {
        const salesRole = rolesArray.find((r) => r.code === 'SALES');
        setRoleId(salesRole?.id || rolesArray[0].id);
      }
    }
  }, [isOpen]);

  const handleProvinceChange = (code: string) => {
    const prov = provinces.find((p) => String(p.code) === code);
    setProvinceCode(code);
    setProvinceName(prov?.name || '');
    setWardCode('');
    setWardName('');
  };

  const handleWardChange = (code: string) => {
    const w = wards.find((w) => String(w.code) === code);
    setWardCode(code);
    setWardName(w?.name || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error(t('memberAdd.validation.phoneRequired'));
      return;
    }
    if (!roleId) {
      toast.error(t('memberAdd.validation.roleRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/members`, {
        phone: phone.trim(),
        roleId,
        displayName: displayName.trim() || undefined,
        workspaceEmail: workspaceEmail.trim() || undefined,
        contractType: contractType || undefined,
        employmentStatus: employmentStatus || undefined,
        workspaceCity: provinceName || undefined,
        workspaceAddress: wardName || undefined,
        addressLine: addressLine.trim() || undefined,
      });
      toast.success(t('memberAdd.message.success'));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { code?: string; message?: string } } };
      const code = apiError.response?.data?.code;
      if (code === 'EMAIL_ALREADY_EXISTS') {
        toast.error(apiError.response?.data?.message || t('memberAdd.validation.emailUsed'));
      } else if (code === 'ALREADY_MEMBER') {
        toast.error(apiError.response?.data?.message || t('memberAdd.validation.alreadyMember'));
      } else {
        toast.error(apiError.response?.data?.message || t('memberAdd.message.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('memberAdd.dialog.title')}
      maxWidth="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="member-add-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {t('memberAdd.dialog.title')}
          </button>
        </>
      }
    >
      <form id="member-add-form" onSubmit={handleSubmit} className="space-y-5">

        {/* Row 1: Phone + Display Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('memberAdd.label.phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('memberAdd.label.phonePlaceholder')}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('memberAdd.label.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('memberAdd.label.displayNamePlaceholder')}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Row 2: Role + Contract */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('memberAdd.label.role')}
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
            >
              {rolesArray.length === 0 && (
                <option value="">{t('memberAdd.label.loadingRoles')}</option>
              )}
              {rolesArray.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('memberAdd.label.contractType')}
            </label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
            >
              <option value="">-- {t('memberAdd.label.selectContractType')} --</option>
              {hdldOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2b: Employment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('members.employmentStatus.label')}
          </label>
          <select
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
          >
            <option value="">-- {t('members.employmentStatus.unknown')} --</option>
            {employmentStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('memberAdd.label.workspaceEmail')}
          </label>
          <input
            type="email"
            value={workspaceEmail}
            onChange={(e) => setWorkspaceEmail(e.target.value)}
            placeholder={t('memberAdd.label.workspaceEmailPlaceholder')}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Row 4: Province + Ward */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('memberAdd.label.province')}
            </label>
            <select
              value={provinceCode}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
            >
              <option value="">{t('memberAdd.label.provincePlaceholder')}</option>
              {provinces.map((p) => (
                <option key={p.code} value={String(p.code)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('memberAdd.label.ward')}
            </label>
            <select
              value={wardCode}
              onChange={(e) => handleWardChange(e.target.value)}
              disabled={isSubmitting || !provinceCode || wardLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
            >
              <option value="">
                {wardLoading ? t('common.loading') : t('memberAdd.label.wardPlaceholder')}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={String(w.code)}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 5: Address Line */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('memberAdd.label.addressLine')}
          </label>
          <input
            type="text"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder={t('memberAdd.label.addressLinePlaceholder')}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

      </form>
    </BaseDialog>
  );
}

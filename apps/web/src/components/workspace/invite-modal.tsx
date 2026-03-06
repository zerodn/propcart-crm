'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Phone } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { BaseDialog } from '../common/base-dialog';

const COUNTRIES = [
  { code: 'vn', countryCode: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'th', countryCode: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: 'us', countryCode: '+1', flag: '🇺🇸', name: 'USA' },
  { code: 'sg', countryCode: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: 'ph', countryCode: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: 'my', countryCode: '+60', flag: '🇲🇾', name: 'Malaysia' },
] as const;

const DEFAULT_INVITABLE_ROLES = [
  { code: 'ADMIN', label: 'Quản trị viên' },
  { code: 'MANAGER', label: 'Quản lý' },
  { code: 'SALES', label: 'Nhân viên bán hàng' },
  { code: 'PARTNER', label: 'Đối tác' },
  { code: 'OWNER', label: 'Chủ sở hữu' },
  { code: 'VIEWER', label: 'Người xem' },
];

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteModal({ isOpen, onClose, onSuccess }: InviteModalProps) {
  const { workspace } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0] as (typeof COUNTRIES)[number]);
  const [phone, setPhone] = useState('');
  const [roleCode, setRoleCode] = useState('SALES');
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<{ code: string; label: string }[]>(DEFAULT_INVITABLE_ROLES);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadRoles() {
      if (!workspace?.id) return;
      try {
        const res = await apiClient.get(`/workspaces/${workspace.id}/roles`);
        console.log('[InviteModal] Response from /roles:', res);
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        console.log('[InviteModal] Extracted list:', list);
        if (!mounted) return;
        const mappedRoles = list.map((r: any) => ({ code: r.code, label: r.name }));
        console.log('[InviteModal] Mapped roles:', mappedRoles);
        setRoles(mappedRoles.length > 0 ? mappedRoles : DEFAULT_INVITABLE_ROLES);
        if (list.length > 0) setRoleCode(list[0].code);
      } catch (err) {
        console.error('[InviteModal] Error loading roles:', err);
        // fallback to default roles
        setRoles(DEFAULT_INVITABLE_ROLES);
      }
    }
    loadRoles();
    return () => {
      mounted = false;
    };
  }, [workspace?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !workspace?.id) return;

    // Remove leading 0 if present
    let cleanPhone = phone.trim();
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const fullPhone = `${selectedCountry.countryCode}${cleanPhone}`;

    setIsLoading(true);
    try {
      await apiClient.post(`/workspaces/${workspace.id}/invitations`, {
        phone: fullPhone,
        role_code: roleCode,
      });
      toast.success(`Đã gửi lời mời đến ${fullPhone}`);
      onSuccess();
      onClose();
      setPhone('');
      setSelectedCountry(COUNTRIES[0]);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'MEMBER_ALREADY_EXISTS') toast.error('Người dùng đã là nhân sự');
      else if (code === 'INVITATION_ALREADY_PENDING') toast.error('Lời mời đã tồn tại');
      else if (code === 'ROLE_NOT_FOUND') toast.error('Vai trò không hợp lệ');
      else toast.error('Không thể gửi lời mời');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Mời nhân sự"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="invite-form"
            disabled={isLoading || !phone.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Đang gửi...' : 'Gửi lời mời'}
          </button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Country Code + Phone Input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
          <div className="flex gap-2">
            {/* Country Selector */}
            <div className="relative w-24">
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full h-10 flex items-center justify-center gap-1 px-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">{selectedCountry.flag}</span>
              </button>

              {/* Dropdown */}
              {isCountryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsCountryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors ${
                        selectedCountry.code === country.code ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1">
                        <div className="font-medium">{country.name}</div>
                        <div className="text-xs text-gray-500">{country.countryCode}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Input */}
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                placeholder="901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Format Info */}
          <p className="text-xs text-gray-500">
            📱 {selectedCountry.countryCode}
            {phone.startsWith('0') ? phone.substring(1) : phone || '...'}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Vai trò</label>
          <select
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {roles.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </BaseDialog>
  );
}

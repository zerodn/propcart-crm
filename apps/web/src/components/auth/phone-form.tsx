'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Phone } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';
import { SocialLoginButtons } from './social-login-buttons';
import type { User, Workspace } from '@/types';

interface PhoneFormProps {
  onSuccess: (phone: string) => void;
  onSocialLoginSuccess?: (
    accessToken: string,
    refreshToken: string,
    user: User,
    workspace: Workspace,
  ) => void;
}

const COUNTRIES = [
  { code: 'vn', countryCode: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'th', countryCode: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: 'us', countryCode: '+1', flag: '🇺🇸', name: 'USA' },
  { code: 'sg', countryCode: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: 'ph', countryCode: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: 'my', countryCode: '+60', flag: '🇲🇾', name: 'Malaysia' },
] as const;

export function PhoneForm({ onSuccess, onSocialLoginSuccess }: PhoneFormProps) {
  const { t } = useI18n();
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES[0] as (typeof COUNTRIES)[number],
  );
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    // Remove leading 0 if present
    let cleanPhone = phone.trim();
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const fullPhone = `${selectedCountry.countryCode}${cleanPhone}`;

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/phone/send-otp', { phone: fullPhone });
      console.log('✅ OTP sent successfully:', response);
      toast.success(t('auth.login.sendOtp'));
      onSuccess(fullPhone);
    } catch (err: unknown) {
      console.error('❌ Send OTP error:', err);
      const response = (err as { response?: { status?: number; data?: unknown } })?.response;
      const responseData = response?.data as
        | { message?: string; code?: string }
        | string
        | undefined;
      const msg =
        (typeof responseData === 'object' && responseData !== null ? responseData.message : null) ??
        (typeof responseData === 'object' && responseData !== null ? responseData.code : null) ??
        (typeof responseData === 'string' ? responseData : null) ??
        t('auth.errors.loginFailed');
      console.error('Error details:', { status: response?.status, data: responseData, msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Country + Phone row */}
      <div className="space-y-2">
        <div className="flex gap-2 items-stretch">
          {/* Country Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="glass-input h-12 flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium text-white whitespace-nowrap hover:border-white/40 transition-all"
            >
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="text-white/80">{selectedCountry.countryCode}</span>
              <svg className="w-3 h-3 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {isCountryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country);
                      setIsCountryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedCountry.code === country.code ? 'bg-[#F5F7FA] text-[#0B1F3A]' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{country.name}</div>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{country.countryCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone Input */}
          <div className="relative flex-1">
            <input
              type="tel"
              placeholder="901 234 567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="glass-input w-full h-12 px-4 rounded-xl text-sm transition-all"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Preview number */}
        {phone && (
          <p className="text-xs text-white/50 pl-1">
            {t('auth.login.phonePreviewLabel')}{' '}
            <span className="font-medium text-white/80">
              {selectedCountry.countryCode}{phone.startsWith('0') ? phone.substring(1) : phone}
            </span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !phone.trim()}
        className="glass-btn w-full flex items-center justify-center gap-2 h-12 px-4 bg-[#CFAF6E] text-white text-sm font-semibold rounded-xl hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#CFAF6E]/30"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
        {isLoading ? t('common.loading') : t('auth.login.sendOtp')}
      </button>

    </form>

    {/* Social login buttons — rendered OUTSIDE the form to avoid nested <form> elements
        (nested forms cause the dialog submit button to submit the outer phone form) */}
    {onSocialLoginSuccess && (
      <div className="mt-5">
        <SocialLoginButtons onSuccess={onSocialLoginSuccess} />
      </div>
    )}
  </>
  );
}

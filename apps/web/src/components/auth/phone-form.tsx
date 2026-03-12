'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Phone } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';

interface PhoneFormProps {
  onSuccess: (phone: string) => void;
}

const COUNTRIES = [
  { code: 'vn', countryCode: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'th', countryCode: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: 'us', countryCode: '+1', flag: '🇺🇸', name: 'USA' },
  { code: 'sg', countryCode: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: 'ph', countryCode: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: 'my', countryCode: '+60', flag: '🇲🇾', name: 'Malaysia' },
] as const;

export function PhoneForm({ onSuccess }: PhoneFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {/* Country Code + Phone Input */}
        <div className="flex gap-2 items-center">
          {/* Country Selector */}
          <div className="relative w-24">
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full h-10 flex items-center justify-center gap-1 px-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
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

      <button
        type="submit"
        disabled={isLoading || !phone.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isLoading ? t('common.loading') : t('auth.login.sendOtp')}
      </button>
    </form>
  );
}

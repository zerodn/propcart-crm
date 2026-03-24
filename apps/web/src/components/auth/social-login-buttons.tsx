'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Phone, X, ChevronDown } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import apiClient from '@/lib/api-client';
import { getDeviceHash } from '@/lib/auth';
import type { User, Workspace } from '@/types';

interface SocialLoginButtonsProps {
  onSuccess: (
    accessToken: string,
    refreshToken: string,
    user: User,
    workspace: Workspace,
  ) => void;
}

const COUNTRIES = [
  { code: 'vn', countryCode: '+84', flag: '🇻🇳', name: 'Việt Nam' },
  { code: 'th', countryCode: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: 'us', countryCode: '+1',  flag: '🇺🇸', name: 'USA' },
  { code: 'sg', countryCode: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: 'ph', countryCode: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: 'my', countryCode: '+60', flag: '🇲🇾', name: 'Malaysia' },
] as const;

// ─── Phone Link Dialog ──────────────────────────────────────────────────────

interface PhoneLinkDialogProps {
  tempToken: string;
  onSuccess: SocialLoginButtonsProps['onSuccess'];
  onClose: () => void;
}

function PhoneLinkDialog({ tempToken, onSuccess, onClose }: PhoneLinkDialogProps) {
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0] as typeof COUNTRIES[number]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = (seconds = 120) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const buildFullPhone = () => {
    let clean = phone.trim();
    if (clean.startsWith('0')) clean = clean.slice(1);
    return `${selectedCountry.countryCode}${clean}`;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!phone.trim()) return;
    const fp = buildFullPhone();
    setLoading(true);
    try {
      await apiClient.post('/auth/phone/send-otp', { phone: fp });
      setFullPhone(fp);
      setStep('otp');
      startCountdown(120);
      toast.success(t('auth.login.sendOtp'));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'USER_BANNED') toast.error(t('auth.errors.userBanned'));
      else toast.error(t('auth.login.sendOtpFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/google/link-phone', {
        temp_token: tempToken,
        phone: fullPhone,
        otp,
        device_hash: getDeviceHash(),
        platform: 'web',
      });
      const { access_token, refresh_token, user, workspace } = data.data;
      toast.success(t('auth.login.phoneLinkSuccess'));
      login(access_token, refresh_token, user, workspace);
      onSuccess(access_token, refresh_token, user, workspace);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'OTP_EXPIRED') toast.error(t('auth.login.otpExpired'));
      else if (code === 'OTP_INVALID') toast.error(t('auth.login.otpInvalid'));
      else if (code === 'OTP_MAX_ATTEMPTS') toast.error(t('auth.login.otpMaxAttempts'));
      else if (code === 'TEMP_TOKEN_INVALID') {
        toast.error(t('auth.login.phoneLinkSessionExpired'));
        setStep('phone');
        setOtp('');
      } else if (code === 'PHONE_TAKEN') {
        toast.error(t('auth.login.phoneTaken'));
        setStep('phone');
        setOtp('');
      } else {
        toast.error(t('auth.errors.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0B1F3A] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">{t('auth.login.phoneLinkTitle')}</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {step === 'phone' ? t('auth.login.phoneLinkDescription') : fullPhone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="flex gap-2">
                {/* Country selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="h-12 flex items-center gap-1.5 px-3 rounded-xl border border-white/20 bg-white/5 text-sm text-white whitespace-nowrap hover:border-white/40 transition-colors"
                  >
                    <span>{selectedCountry.flag}</span>
                    <span className="text-white/70">{selectedCountry.countryCode}</span>
                    <ChevronDown className="h-3 w-3 text-white/40" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl z-10 py-1.5 border border-gray-100">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setSelectedCountry(c); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                        >
                          <span>{c.flag}</span>
                          <span className="font-medium">{c.countryCode}</span>
                          <span className="text-gray-400 text-xs">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone input */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="905xxxxxx"
                  autoFocus
                  className="flex-1 h-12 px-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#CFAF6E] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full h-12 rounded-xl bg-[#CFAF6E] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                {t('auth.login.phoneLinkSendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              {/* OTP input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
                  {t('auth.login.phoneLinkOtpLabel')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full h-14 px-4 rounded-xl bg-white/5 border border-white/20 text-white text-center text-2xl tracking-[0.5em] placeholder-white/20 focus:outline-none focus:border-[#CFAF6E] transition-colors"
                />
              </div>

              {/* Countdown + resend */}
              <div className="flex items-center justify-between text-xs text-white/40">
                {countdown > 0 ? (
                  <span>{t('auth.login.timeRemaining')}: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-[#CFAF6E] hover:underline disabled:opacity-50"
                  >
                    {t('auth.login.phoneLinkResend')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  {t('auth.login.phoneLinkChangePhone')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 rounded-xl bg-[#CFAF6E] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('auth.login.phoneLinkConfirm')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface EmailVerifyLinkDialogProps {
  tempToken: string;
  email: string;
  maskedPhone: string;
  onSuccess: SocialLoginButtonsProps['onSuccess'];
  onClose: () => void;
}

function EmailVerifyLinkDialog({ tempToken, email, maskedPhone, onSuccess, onClose }: EmailVerifyLinkDialogProps) {
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0] as typeof COUNTRIES[number]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = (seconds = 120) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const buildFullPhone = () => {
    let clean = phone.trim();
    if (clean.startsWith('0')) clean = clean.slice(1);
    return `${selectedCountry.countryCode}${clean}`;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (phone.length < 8) return;
    const fp = buildFullPhone();
    setLoading(true);
    setPhoneError('');
    try {
      await apiClient.post('/auth/google/email-verify-send-otp', {
        temp_token: tempToken,
        phone: fp,
      });
      setFullPhone(fp);
      setStep('otp');
      startCountdown(120);
      toast.success(t('auth.login.sendOtp'));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'PHONE_MISMATCH') {
        setPhoneError(t('auth.login.phoneMismatch'));
      } else if (code === 'TEMP_TOKEN_INVALID') {
        setPhoneError(t('auth.login.phoneLinkSessionExpired'));
      } else {
        toast.error(t('auth.login.sendOtpFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/google/verify-email-link', {
        temp_token: tempToken,
        phone: fullPhone,
        otp,
        device_hash: getDeviceHash(),
        platform: 'web',
      });
      const { access_token, refresh_token, user, workspace } = data.data;
      toast.success(t('auth.login.emailVerifyLinkSuccess'));
      login(access_token, refresh_token, user, workspace);
      onSuccess(access_token, refresh_token, user, workspace);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'OTP_EXPIRED') toast.error(t('auth.login.otpExpired'));
      else if (code === 'OTP_INVALID') toast.error(t('auth.login.otpInvalid'));
      else if (code === 'OTP_MAX_ATTEMPTS') toast.error(t('auth.login.otpMaxAttempts'));
      else if (code === 'TEMP_TOKEN_INVALID') {
        toast.error(t('auth.login.phoneLinkSessionExpired'));
        setStep('phone');
        setOtp('');
      } else if (code === 'PHONE_MISMATCH') {
        // Shouldn't happen (caught at send-otp step), but handle defensively
        toast.error(t('auth.login.phoneMismatch'));
        setStep('phone');
        setOtp('');
      } else {
        toast.error(t('auth.errors.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0B1F3A] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">{t('auth.login.emailVerifyLinkTitle')}</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {step === 'phone' ? email : fullPhone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Masked phone hint */}
              <p className="text-xs text-white/60 leading-relaxed">
                {t('auth.login.emailVerifyLinkDescription').replace('{{maskedPhone}}', maskedPhone)}
              </p>

              <div className="flex gap-2">
                {/* Country selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="h-12 flex items-center gap-1.5 px-3 rounded-xl border border-white/20 bg-white/5 text-sm text-white whitespace-nowrap hover:border-white/40 transition-colors"
                  >
                    <span>{selectedCountry.flag}</span>
                    <span className="text-white/70">{selectedCountry.countryCode}</span>
                    <ChevronDown className="h-3 w-3 text-white/40" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl z-10 py-1.5 border border-gray-100">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setSelectedCountry(c); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                        >
                          <span>{c.flag}</span>
                          <span className="font-medium">{c.countryCode}</span>
                          <span className="text-gray-400 text-xs">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone input */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                  placeholder="905xxxxxx"
                  autoFocus
                  className="flex-1 h-12 px-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#CFAF6E] transition-colors"
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-400 -mt-1">{phoneError}</p>
              )}
              <button
                type="submit"
                disabled={loading || phone.length < 8}
                className="w-full h-12 rounded-xl bg-[#CFAF6E] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                {t('auth.login.phoneLinkSendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
                  {t('auth.login.phoneLinkOtpLabel')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full h-14 px-4 rounded-xl bg-white/5 border border-white/20 text-white text-center text-2xl tracking-[0.5em] placeholder-white/20 focus:outline-none focus:border-[#CFAF6E] transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/40">
                {countdown > 0 ? (
                  <span>{t('auth.login.timeRemaining')}: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-[#CFAF6E] hover:underline disabled:opacity-50"
                  >
                    {t('auth.login.phoneLinkResend')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setPhoneError(''); }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  {t('auth.login.phoneLinkChangePhone')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 rounded-xl bg-[#CFAF6E] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('auth.login.phoneLinkConfirm')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Google icon ────────────────────────────────────────────────────────────

/** Google "G" logo SVG (official brand colors) */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

/** Apple logo SVG */
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14.045 9.579c-.02-2.055 1.683-3.051 1.758-3.1C14.852 4.693 13 4.463 12.338 4.442c-1.408-.143-2.76.84-3.476.84-.73 0-1.836-.824-3.025-.8C4.257 4.506 2.8 5.538 2 7.065c-1.626 2.82-.416 6.985 1.17 9.273.78 1.122 1.705 2.381 2.918 2.334 1.174-.049 1.617-.754 3.036-.754 1.407 0 1.81.754 3.039.727 1.263-.022 2.06-1.139 2.832-2.265a10.6 10.6 0 001.285-2.619c-.029-.013-2.215-.851-2.235-3.182zm-2.086-5.84c.638-.782 1.07-1.863.953-2.948-.92.039-2.05.616-2.714 1.382-.591.686-1.11 1.79-.972 2.845 1.03.08 2.083-.524 2.733-1.28z" />
    </svg>
  );
}

// ─── Google button (inner — requires GoogleOAuthProvider) ───────────────────

function GoogleButton({
  disabled,
  onPhoneRequired,
  onEmailVerifyRequired,
  onSuccess,
}: {
  disabled: boolean;
  onPhoneRequired: (tempToken: string) => void;
  onEmailVerifyRequired: (data: { tempToken: string; email: string; maskedPhone: string }) => void;
  onSuccess: SocialLoginButtonsProps['onSuccess'];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const deviceHash = getDeviceHash();
        const { data } = await apiClient.post('/auth/google', {
          google_token: tokenResponse.access_token,
          device_hash: deviceHash,
          platform: 'web',
        });

        const responseData = data?.data ?? data;

        // PHONE_REQUIRED: show phone-link dialog
        if (responseData?.code === 'PHONE_REQUIRED' && responseData?.temp_token) {
          onPhoneRequired(responseData.temp_token as string);
          return;
        }

        // EMAIL_EXISTS_UNVERIFIED: show email-verify-link dialog
        if (responseData?.code === 'EMAIL_EXISTS_UNVERIFIED' && responseData?.temp_token) {
          onEmailVerifyRequired({
            tempToken: responseData.temp_token as string,
            email: (responseData.email as string) ?? '',
            maskedPhone: (responseData.maskedPhone as string) ?? '***',
          });
          return;
        }

        const { access_token, refresh_token, user, workspace } = data.data;
        login(access_token, refresh_token, user, workspace);
        router.push('/dashboard');
        onSuccess(access_token, refresh_token, user, workspace);
      } catch {
        toast.error(t('auth.login.googleLoginFailed'));
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error(t('auth.login.googleLoginFailed'));
    },
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={loading || disabled}
      className="flex items-center justify-center w-11 h-11 rounded-xl
        bg-white hover:bg-gray-50 active:bg-gray-100
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-150 shadow-sm"
      aria-label={t('auth.login.continueWithGoogle')}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#0B1F3A]" /> : <GoogleIcon />}
    </button>
  );
}

// ─── SocialLoginButtons ──────────────────────────────────────────────────────

export function SocialLoginButtons({ onSuccess }: SocialLoginButtonsProps) {
  const { t } = useI18n();
  const [appleLoading, setAppleLoading] = useState(false);
  const [phoneLinkTempToken, setPhoneLinkTempToken] = useState<string | null>(null);
  const [emailVerifyData, setEmailVerifyData] = useState<{
    tempToken: string;
    email: string;
    maskedPhone: string;
  } | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? '';

  const handleAppleLogin = () => {
    if (!appleClientId) {
      toast.error(t('auth.login.appleLoginFailed'));
      return;
    }
    setAppleLoading(true);
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/auth/apple/callback`;
    const params = new URLSearchParams({
      response_type: 'code id_token',
      client_id: appleClientId,
      redirect_uri: redirectUri,
      scope: 'name email',
      response_mode: 'form_post',
    });
    window.location.href = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  };

  const handleGoogleUnconfigured = () => {
    toast.error(t('auth.login.googleLoginFailed'));
  };

  return (
    <>
      <div className="space-y-3">
        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-xs text-white/40 font-medium">{t('auth.login.orContinueWith')}</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        {/* Social buttons — icon only, always shown */}
        <div className="flex items-center justify-center gap-3">
          {/* Google */}
          {googleClientId ? (
            <GoogleButton
              disabled={appleLoading}
              onPhoneRequired={(token) => setPhoneLinkTempToken(token)}
              onEmailVerifyRequired={(d) => setEmailVerifyData(d)}
              onSuccess={onSuccess}
            />
          ) : (
            <button
              type="button"
              onClick={handleGoogleUnconfigured}
              className="flex items-center justify-center w-11 h-11 rounded-xl
                bg-white hover:bg-gray-50 active:bg-gray-100
                transition-all duration-150 shadow-sm"
              aria-label={t('auth.login.continueWithGoogle')}
            >
              <GoogleIcon />
            </button>
          )}

          {/* Apple */}
          <button
            type="button"
            onClick={handleAppleLogin}
            disabled={appleLoading}
            className="flex items-center justify-center w-11 h-11 rounded-xl
              bg-black text-white hover:bg-gray-900 active:bg-gray-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150 shadow-sm border border-white/10"
            aria-label={t('auth.login.continueWithApple')}
          >
            {appleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <AppleIcon />
            )}
          </button>
        </div>
      </div>

      {/* Phone link dialog — shown when Google login returns PHONE_REQUIRED */}
      {phoneLinkTempToken && (
        <PhoneLinkDialog
          tempToken={phoneLinkTempToken}
          onSuccess={onSuccess}
          onClose={() => setPhoneLinkTempToken(null)}
        />
      )}

      {/* Email verify + link dialog — shown when Google login returns EMAIL_EXISTS_UNVERIFIED */}
      {emailVerifyData && (
        <EmailVerifyLinkDialog
          tempToken={emailVerifyData.tempToken}
          email={emailVerifyData.email}
          maskedPhone={emailVerifyData.maskedPhone}
          onSuccess={onSuccess}
          onClose={() => setEmailVerifyData(null)}
        />
      )}
    </>
  );
}


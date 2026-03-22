'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

/**
 * Inner component — uses useGoogleLogin hook (requires GoogleOAuthProvider ancestor).
 * Only mounted when GoogleOAuthProvider is present (i.e. clientId is configured).
 */
function GoogleButton({
  disabled,
  onSuccess,
}: {
  disabled: boolean;
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
        const { access_token, refresh_token, user, workspace } = data.data;
        login(access_token, refresh_token, user, workspace);
        router.push('/dashboard');
        onSuccess(access_token, refresh_token, user, workspace);
      } catch (err: unknown) {
        const errData = (err as { response?: { data?: { code?: string; email?: string } } })?.response?.data;
        if (errData?.code === 'EMAIL_EXISTS_UNVERIFIED') {
          const email = errData.email ?? '';
          const msg = email
            ? t('auth.login.unverifiedEmailBlockMessage').replace('{{email}}', email)
            : t('auth.login.emailExistsUnverified');
          toast.custom(
            (toastId) => (
              <div className="flex flex-col gap-2 rounded-xl bg-white shadow-lg border border-red-100 p-4 w-[356px]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-50 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <circle cx="6" cy="6" r="6" fill="#EF4444" opacity="0.15" />
                      <path d="M6 3.5v3M6 8.5h.01" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-gray-900">{t('auth.login.unverifiedEmailBlockTitle')}</p>
                    <p className="text-sm text-gray-600 leading-snug">{msg}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(toastId)}
                  className="self-end mt-1 px-4 py-1.5 rounded-lg bg-[#0B1F3A] text-white text-sm font-medium hover:bg-[#0F2A52] transition-colors"
                >
                  {t('auth.login.loginWithPhoneCta')}
                </button>
              </div>
            ),
            { duration: 8000 },
          );
        } else {
          toast.error(t('auth.login.googleLoginFailed'));
        }
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

export function SocialLoginButtons({ onSuccess }: SocialLoginButtonsProps) {
  const { t } = useI18n();
  const [appleLoading, setAppleLoading] = useState(false);

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
          <GoogleButton disabled={appleLoading} onSuccess={onSuccess} />
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
  );
}

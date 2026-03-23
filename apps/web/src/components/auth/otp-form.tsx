'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';
import { getDeviceHash } from '@/lib/auth';
import type { User, Workspace } from '@/types';
import { MergeAccountDialog, type MergeSuggestion } from '@/components/auth/merge-account-dialog';

interface OtpFormProps {
  phone: string;
  onSuccess: (accessToken: string, refreshToken: string, user: User, workspace: Workspace) => void;
  onBack: () => void;
}

export function OtpForm({ phone, onSuccess, onBack }: OtpFormProps) {
  const { t } = useI18n();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [mergeState, setMergeState] = useState<{
    suggestion: MergeSuggestion;
    accessToken: string;
    refreshToken: string;
    user: User;
    workspace: Workspace;
  } | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleResend = async () => {
    try {
      await apiClient.post('/auth/phone/send-otp', { phone });
      toast.success(t('invitations.acceptSuccess'));
      setTimeLeft(120);
      setCanResend(false);
    } catch {
      toast.error(t('auth.errors.loginFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setIsLoading(true);
    try {
      const deviceHash = getDeviceHash();
      const { data } = await apiClient.post('/auth/phone/verify-otp', {
        phone,
        otp,
        device_hash: deviceHash,
        platform: 'web',
      });

      const { access_token, refresh_token, user, workspace, mergeSuggestion } = data.data;
      if (mergeSuggestion) {
        // Pause and show merge confirmation dialog
        setMergeState({ suggestion: mergeSuggestion, accessToken: access_token, refreshToken: refresh_token, user, workspace });
      } else {
        onSuccess(access_token, refresh_token, user, workspace);
      }
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'OTP_INVALID') toast.error(t('auth.errors.invalidOtp'));
      else if (code === 'OTP_MAX_ATTEMPTS') toast.error(t('auth.errors.invalidOtp'));
      else toast.error(t('auth.errors.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Back + Phone info */}
      <div className="flex items-center gap-2.5 p-3 bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors flex-shrink-0"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0">
          <p className="text-xs text-[#CFAF6E]/80">{t('auth.login.otpSentTo')}</p>
          <p className="text-sm font-semibold text-white truncate">{phone}</p>
        </div>
      </div>

      {/* OTP input */}
      <div className="space-y-2">
        <label htmlFor="otp" className="text-sm font-medium text-white/70 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#CFAF6E]" />
          {t('auth.login.enterOtp')}
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="● ● ● ● ● ●"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="glass-input w-full h-14 px-4 rounded-xl text-center tracking-[0.6em] text-xl font-mono transition-all placeholder:tracking-[0.4em]"
          required
          autoFocus
        />
      </div>

      {/* Resend timer */}
      <div className="text-center">
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="inline-flex items-center gap-1.5 text-sm text-[#CFAF6E] hover:text-[#0B1F3A] font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('auth.login.resendOtp')}
          </button>
        ) : (
          <p className="text-sm text-white/50">
            {t('auth.login.timeRemaining')}{' '}
            <span className="font-semibold text-white/80 tabular-nums">{timeLeft}s</span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || otp.length !== 6}
        className="glass-btn w-full flex items-center justify-center gap-2 h-12 px-4 bg-[#CFAF6E] text-white text-sm font-semibold rounded-xl hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#CFAF6E]/30"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {isLoading ? t('common.loading') : t('auth.login.verifyOtp')}
      </button>

      {mergeState && (
        <MergeAccountDialog
          suggestion={mergeState.suggestion}
          accessToken={mergeState.accessToken}
          onMerged={(access_token, refresh_token, user, workspace) => {
            setMergeState(null);
            onSuccess(access_token, refresh_token, user, workspace);
          }}
          onSkip={() => {
            const auth = mergeState;
            setMergeState(null);
            onSuccess(auth.accessToken, auth.refreshToken, auth.user, auth.workspace);
          }}
        />
      )}
    </form>
  );
}

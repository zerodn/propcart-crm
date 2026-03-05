'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { getDeviceHash } from '@/lib/auth';
import type { User, Workspace } from '@/types';

interface OtpFormProps {
  phone: string;
  onSuccess: (accessToken: string, refreshToken: string, user: User, workspace: Workspace) => void;
  onBack: () => void;
}

export function OtpForm({ phone, onSuccess, onBack }: OtpFormProps) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);

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
      toast.success('Đã gửi lại mã OTP');
      setTimeLeft(120);
      setCanResend(false);
    } catch {
      toast.error('Không thể gửi lại OTP');
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

      const { access_token, refresh_token, user, workspace } = data.data;
      onSuccess(access_token, refresh_token, user, workspace);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'OTP_INVALID') toast.error('Mã OTP không đúng');
      else if (code === 'OTP_MAX_ATTEMPTS')
        toast.error('Nhập sai quá nhiều lần. Vui lòng gửi lại OTP');
      else toast.error('Xác thực thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <button type="button" onClick={onBack} className="hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span>
          Mã OTP đã gửi đến <strong className="text-gray-800">{phone}</strong>
        </span>
      </div>

      <div className="space-y-2">
        <label htmlFor="otp" className="text-sm font-medium text-gray-700">
          Nhập mã OTP (6 chữ số)
        </label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="999999"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-center tracking-[0.4em] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-blue-600 hover:underline font-medium"
          >
            Gửi lại OTP
          </button>
        ) : (
          <span>
            Gửi lại sau <strong className="text-gray-700">{timeLeft}s</strong>
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || otp.length !== 6}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
      </button>
    </form>
  );
}

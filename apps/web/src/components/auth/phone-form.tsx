'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Phone } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface PhoneFormProps {
  onSuccess: (phone: string) => void;
}

export function PhoneForm({ onSuccess }: PhoneFormProps) {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    try {
      await apiClient.post('/auth/phone/send-otp', { phone });
      toast.success('Mã OTP đã được gửi');
      onSuccess(phone);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Không thể gửi OTP';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
          Số điện thoại
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="phone"
            type="tel"
            placeholder="+84901234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !phone.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
      </button>
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';

export default function EmailVerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Dang xac thuc email...');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Thieu token xac thuc email');
        return;
      }

      try {
        const { data } = await apiClient.get(`/auth/email/verify?token=${encodeURIComponent(token)}`);
        setStatus('success');
        setMessage(data?.data?.message ?? 'Xac thuc email thanh cong');
      } catch (error: any) {
        setStatus('error');
        setMessage(error?.response?.data?.message ?? 'Link xac thuc khong hop le hoac da het han');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
        {status === 'success' ? (
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
        ) : status === 'error' ? (
          <XCircle className="h-10 w-10 text-red-500 mx-auto" />
        ) : (
          <div className="h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
        )}

        <h1 className="text-lg font-semibold text-gray-900">Xac thuc email</h1>
        <p className="text-sm text-gray-600">{message}</p>

        {status !== 'loading' && (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Ve trang dang nhap
          </Link>
        )}
      </div>
    </div>
  );
}

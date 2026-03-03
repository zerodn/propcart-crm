'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { PhoneForm } from '@/components/auth/phone-form';
import { OtpForm } from '@/components/auth/otp-form';
import { useAuth } from '@/providers/auth-provider';
import type { User, Workspace } from '@/types';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');

  const handlePhoneSuccess = (submittedPhone: string) => {
    setPhone(submittedPhone);
    setStep('otp');
  };

  const handleOtpSuccess = (
    accessToken: string,
    refreshToken: string,
    user: User,
    workspace: Workspace,
  ) => {
    login(accessToken, refreshToken, user, workspace);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PropCart CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý bất động sản chuyên nghiệp</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'phone' ? 'Đăng nhập' : 'Xác thực OTP'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'phone'
                ? 'Nhập số điện thoại để nhận mã OTP'
                : 'Kiểm tra SMS và nhập mã 6 chữ số'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${step === 'phone' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
              {step === 'phone' ? '1' : '✓'}
            </div>
            <div className={`flex-1 h-0.5 ${step === 'otp' ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${step === 'otp' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
          </div>

          {step === 'phone' ? (
            <PhoneForm onSuccess={handlePhoneSuccess} />
          ) : (
            <OtpForm
              phone={phone}
              onSuccess={handleOtpSuccess}
              onBack={() => setStep('phone')}
            />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 PropCart CRM · Dành cho nội bộ
        </p>
      </div>
    </div>
  );
}

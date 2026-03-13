'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to backend login endpoint
    // The backend will handle OAuth/authentication and redirect back to portal
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const returnUrl = `${window.location.origin}/login/callback`;
    
    // Redirect to backend login endpoint
    window.location.href = `${backendUrl}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
        <p className="mt-4 text-gray-600">Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    </div>
  );
}

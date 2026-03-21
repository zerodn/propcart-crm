'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageProvider, usePageConfig } from '@/providers/page-provider';
import { useAuth } from '@/providers/auth-provider';

function PageActions() {
  const { config } = usePageConfig();
  if (!config.actions) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-end dark:border-gray-700 dark:bg-gray-900">
      {config.actions}
    </div>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col overflow-auto">
          <PageActions />
          <main className="flex-1 p-6 dark:bg-gray-950">{children}</main>
        </div>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while checking auth or redirecting
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#CFAF6E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PageProvider>
        <LayoutInner>{children}</LayoutInner>
      </PageProvider>
    </AuthGuard>
  );
}

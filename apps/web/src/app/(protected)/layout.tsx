'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, SidebarProvider, useSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageProvider, usePageConfig } from '@/providers/page-provider';
import { useAuth } from '@/providers/auth-provider';
import { BackgroundProvider, useBackground, getBackgroundStyle } from '@/providers/background-provider';
import { cn } from '@/lib/utils';

function PageActions() {
  const { config } = usePageConfig();
  if (!config.actions) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200/50 dark:border-white/[0.07] bg-white/80 dark:bg-[#0b1f3a]/80 backdrop-blur-md px-6 py-3 flex items-center justify-end">
      {config.actions}
    </div>
  );
}

function DashboardBackground() {
  const { config } = useBackground();
  const style = getBackgroundStyle(config);

  return (
    <div className="fixed inset-0 z-0" style={style}>
      {/* Subtle grid pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dashGrid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#CFAF6E" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dashGrid)" />
      </svg>
      {/* Radial glow top-left */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#CFAF6E]/[0.04] blur-[120px]" />
      {/* Radial glow bottom-right */}
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#0f2a52]/40 blur-[100px]" />
    </div>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="relative min-h-screen">
      {/* Full-screen configurable background */}
      <DashboardBackground />

      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Fixed Header (offset by sidebar width) */}
      <Header />

      {/* Main content area — margin matches sidebar width */}
      <div className={cn('relative z-10 pt-16 min-h-screen transition-[margin] duration-300', collapsed ? 'ml-[64px]' : 'ml-[240px]')}>
        <PageActions />
        <main className="p-[0.8rem] dashboard-fade-in">{children}</main>
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] dark:bg-[#0b1f3a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#CFAF6E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-white/60">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BackgroundProvider>
        <SidebarProvider>
          <PageProvider>
            <LayoutInner>{children}</LayoutInner>
          </PageProvider>
        </SidebarProvider>
      </BackgroundProvider>
    </AuthGuard>
  );
}

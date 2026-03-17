'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageProvider, usePageConfig } from '@/providers/page-provider';

function PageActions() {
  const { config } = usePageConfig();
  if (!config.actions) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between dark:border-gray-700 dark:bg-gray-900">
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

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageProvider>
      <LayoutInner>{children}</LayoutInner>
    </PageProvider>
  );
}

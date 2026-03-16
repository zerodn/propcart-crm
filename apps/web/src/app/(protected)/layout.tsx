import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 dark:bg-gray-950">{children}</main>
      </div>
    </div>
  );
}

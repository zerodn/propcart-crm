'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Mail,
  Users,
  LogOut,
  ClipboardList,
  Shield,
  Briefcase,
  Bell,
  UserCircle2,
  Warehouse,
  Box,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { logout, role } = useAuth();
  const { t } = useI18n();
  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';

  const navItems = [
    { href: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/workspaces', label: t('sidebar.workspaces'), icon: Building2 },
    { href: '/invitations', label: t('sidebar.invitations'), icon: Mail },
    { href: '/notifications', label: t('sidebar.notifications'), icon: Bell },
    { href: '/profile', label: t('sidebar.profile'), icon: UserCircle2 },
  ];

  const adminNavItems = [
    { href: '/workspace/members', label: t('sidebar.members'), icon: Users },
    { href: '/warehouse', label: t('sidebar.warehouses'), icon: Warehouse },
    { href: '/product', label: t('sidebar.products'), icon: Box },
    { href: '/project', label: 'Dự án', icon: FolderOpen },
    { href: '/department', label: t('sidebar.departments'), icon: Briefcase },
    { href: '/catalog', label: t('sidebar.catalogs'), icon: ClipboardList },
    { href: '/permissions', label: t('sidebar.permissions'), icon: Shield },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            PropCart CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {isAdminOrOwner && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 px-3 uppercase tracking-wider">
                {t('sidebar.management')}
              </p>
            </div>
            {adminNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}

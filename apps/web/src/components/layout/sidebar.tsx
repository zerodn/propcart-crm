'use client';

import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: NavItem & { active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'group/nav relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 rounded-md bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity z-50 shadow-lg">
          {label}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout, role, workspace } = useAuth();
  const { t } = useI18n();
  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';
  const [collapsed, setCollapsed] = useState(false);

  const adminNavItems: NavItem[] = [
    { href: '/workspace/members', label: t('sidebar.members'), icon: Users },
    { href: '/warehouse', label: t('sidebar.warehouses'), icon: Warehouse },
    { href: '/product', label: t('sidebar.products'), icon: Box },
    { href: '/project', label: 'Dự án', icon: FolderOpen },
    { href: '/department', label: t('sidebar.departments'), icon: Briefcase },
    { href: '/catalog', label: t('sidebar.catalogs'), icon: ClipboardList },
    { href: '/permissions', label: t('sidebar.permissions'), icon: Shield },
  ];

  const navItems: NavItem[] = [
    { href: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/workspaces', label: t('sidebar.workspaces'), icon: Building2 },
    { href: '/invitations', label: t('sidebar.invitations'), icon: Mail },
    { href: '/notifications', label: t('sidebar.notifications'), icon: Bell },
    { href: '/profile', label: t('sidebar.profile'), icon: UserCircle2 },
  ];

  return (
    <aside
      className={cn(
        'border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header: Logo + Collapse toggle */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
              PropCart CRM
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Workspace info — below logo, hidden when collapsed */}
      {!collapsed && workspace && (
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium leading-none">
            Workspace
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate mt-1">
            {workspace.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {/* Admin/Management items — shown first */}
        {isAdminOrOwner && (
          <>
            {!collapsed && (
              <div className="pt-1 pb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 px-3 uppercase tracking-wider">
                  {t('sidebar.management')}
                </p>
              </div>
            )}
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                collapsed={collapsed}
              />
            ))}
            <div className="my-1.5 border-t border-gray-100 dark:border-gray-800" />
          </>
        )}

        {/* General items */}
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => logout()}
          className={cn(
            'group/nav relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && t('sidebar.logout')}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 rounded-md bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity z-50 shadow-lg">
              {t('sidebar.logout')}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

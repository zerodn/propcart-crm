'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Mail, Users, LogOut, ClipboardList, Shield, Briefcase, Bell, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/invitations', label: 'Lời mời', icon: Mail },
  { href: '/notifications', label: 'Thông báo', icon: Bell },
  { href: '/profile', label: 'Hồ sơ cá nhân', icon: UserCircle2 },
];

// links shown to owners/admins under "Quản lý" group
const adminNavItems = [
  { href: '/workspace/members', label: 'Thành viên', icon: Users },
  { href: '/department', label: 'Phòng ban', icon: Briefcase },
  { href: '/catalog', label: 'Danh mục', icon: ClipboardList },
  { href: '/permissions', label: 'Quyền', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, role } = useAuth();
  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">PropCart CRM</span>
        </div>
        <WorkspaceSwitcher />
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
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {isAdminOrOwner && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs font-medium text-gray-400 px-3 uppercase tracking-wider">
                Quản lý
              </p>
            </div>
            {adminNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
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
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

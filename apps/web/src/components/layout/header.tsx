'use client';

import { useAuth } from '@/providers/auth-provider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, workspace, role } = useAuth();

  const displayName = user?.phone ?? user?.email ?? 'Người dùng';
  const initials = displayName.slice(-4, -2) || 'PC';

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{workspace?.name}</h1>
        <p className="text-xs text-gray-500">{workspace?.type === 'COMPANY' ? 'Doanh nghiệp' : 'Cá nhân'}</p>
      </div>

      <div className="flex items-center gap-3">
        {role && (
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600')}>
            {ROLE_LABELS[role] ?? role}
          </span>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm text-gray-700">{displayName}</span>
        </div>
      </div>
    </header>
  );
}

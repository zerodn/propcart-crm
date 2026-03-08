'use client';

import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/hooks/use-notifications';
import { useI18n } from '@/providers/i18n-provider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ProfileMenu } from '@/components/layout/profile-menu';

export function Header() {
  const { user, workspace, role } = useAuth();

  // TODO: wire language switcher + notifications
  const { notifications, unreadCount } = useNotifications();
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-sm font-semibold text-gray-900 max-w-[220px] sm:max-w-[320px] truncate">
          {workspace?.name}
        </h1>
        <p className="text-xs text-gray-500">
          {workspace?.type === 'COMPANY'
            ? t('header.workspaceCompany')
            : t('header.workspacePersonal')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <LanguageSwitcher />
        {/* Notification bell */}
        <button
          aria-label="notifications"
          className="relative p-1 rounded hover:bg-gray-100"
          onClick={() => (location.href = '/invitations')}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 01-3.46 0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        </button>
        {role && (
          <span
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full',
              ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600',
            )}
          >
            {ROLE_LABELS[role] ?? role}
          </span>
        )}
        <ProfileMenu />
      </div>
    </header>
  );
}

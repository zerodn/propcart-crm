'use client';

import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/hooks/use-notifications';
import { useI18n } from '@/providers/i18n-provider';
import { usePageConfig } from '@/providers/page-provider';
import { useSidebar } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { ProfileMenu } from '@/components/layout/profile-menu';

export function Header() {
  const { workspace } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  const { config } = usePageConfig();
  const { collapsed } = useSidebar();

  return (
    <header className={cn('fixed top-0 right-0 z-20 h-16 glass-header flex items-center justify-between px-6 transition-[left] duration-300', collapsed ? 'left-[64px]' : 'left-[240px]')}>
      {/* Left: Page title from context */}
      <div className="min-w-0">
        {config.title ? (
          <>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {config.title}
            </h1>
            {config.subtitle && (
              <p className="text-xs text-gray-500 dark:text-white/50 truncate">{config.subtitle}</p>
            )}
          </>
        ) : (
          <div className="h-5" />
        )}
      </div>

      {/* Right: Utilities */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <LanguageSwitcher />
        <ThemeToggle />
        {/* Notification bell */}
        <button
          aria-label={t('sidebar.notifications')}
          className="relative p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          onClick={() => (location.href = '/invitations')}
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-white/70"
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
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full shadow-lg shadow-red-500/30">
              {unreadCount}
            </span>
          )}
        </button>
        <ProfileMenu />
      </div>
    </header>
  );
}

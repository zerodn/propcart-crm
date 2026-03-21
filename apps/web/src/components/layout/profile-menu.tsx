'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, UserCircle2, Building2, User } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { useI18n } from '@/providers/i18n-provider';
import { ROLE_LABELS } from '@/types';
import Link from 'next/link';

export function ProfileMenu() {
  const { user, workspace, role, switchWorkspace, logout } = useAuth();
  const { workspaces } = useWorkspaces();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const normalizeText = (value?: string | null) =>
    value && value.trim().length > 0 ? value : null;
  const displayName =
    normalizeText(user?.fullName) ??
    normalizeText(user?.phone) ??
    normalizeText(user?.email) ??
    'Người dùng';
  const initials = displayName.slice(0, 2).toUpperCase() || 'PC';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-[#CFAF6E]/15 text-[#0B1F3A] rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden">
          <span>{initials}</span>
        </div>
        <span className="text-sm text-gray-700 font-medium max-w-[120px] truncate hidden sm:block">
          {displayName}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* User Info Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#CFAF6E]/15 text-[#0B1F3A] rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                <span>{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || user?.phone}</p>
                {role && (
                  <p className="text-xs text-gray-400 mt-1">{ROLE_LABELS[role] ?? role}</p>
                )}
              </div>
            </div>
          </div>

          {/* Workspace Switcher Section */}
          <div className="p-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 px-2 py-1.5 uppercase tracking-wider">
              {t('workspace.title')}
            </p>
            <div className="space-y-0.5">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors ${ws.id === workspace?.id ? 'bg-[#F5F7FA] text-[#0B1F3A]' : 'text-gray-700'}`}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-md flex-shrink-0">
                    {ws.type === 'COMPANY' ? (
                      <Building2 className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">{ws.name}</p>
                    <p className="text-xs text-gray-400">{ws.role}</p>
                  </div>
                  {ws.id === workspace?.id && (
                    <span className="text-xs text-[#CFAF6E] flex-shrink-0">
                      {t('common.current')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Actions */}
          <div className="p-2">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserCircle2 className="h-4 w-4" />
              {t('sidebar.profile')}
            </Link>
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {t('sidebar.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

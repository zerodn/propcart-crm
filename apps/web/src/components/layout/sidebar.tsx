'use client';

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
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
  ContactRound,
  ClipboardCheck,
  History,
  ListChecks,
  Palette,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { cn } from '@/lib/utils';

// ─── Sidebar Context ───────────────────────────────────────────────────────────
interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  // Restore from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem('pc_sidebar_collapsed') === 'true') {
        setCollapsedState(true);
      }
    } catch {}
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem('pc_sidebar_collapsed', String(v));
    } catch {}
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

// ─── NavItem types ─────────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// ─── Tooltip using position:fixed to escape overflow-y:auto clipping ──────────
function SidebarTooltip({ label, anchorRef }: { label: string; anchorRef: React.RefObject<HTMLElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
  }, [anchorRef]);

  if (!pos) return null;

  return (
    <div
      className="fixed z-[9999] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-gray-900/95 text-white shadow-xl pointer-events-none"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
    >
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900/95" />
    </div>
  );
}

// ─── NavLink ───────────────────────────────────────────────────────────────────
function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: NavItem & { active: boolean; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={href}
        className={cn(
          'relative flex items-center rounded-lg text-sm font-medium transition-all duration-200',
          collapsed
            ? 'justify-center w-10 h-10 mx-auto'
            : 'gap-3 px-3 py-2',
          active
            ? cn(
                'text-[#0B1F3A] dark:text-[#CFAF6E]',
                collapsed
                  ? 'bg-[#CFAF6E]/15 dark:bg-white/10'
                  : 'bg-[#0B1F3A]/10 dark:bg-white/10 border-l-2 border-[#CFAF6E] pl-[10px]',
              )
            : 'text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white',
        )}
      >
        <Icon className={cn('h-4 w-4 flex-shrink-0', active && 'text-[#CFAF6E]')} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>

      {/* Tooltip rendered via fixed positioning to escape overflow clipping */}
      {collapsed && hovered && <SidebarTooltip label={label} anchorRef={ref} />}
    </div>
  );
}

// ─── Logout icon button with fixed-position tooltip ───────────────────────────
function LogoutIconButton({ label, onLogout }: { label: string; onLogout: () => void }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onLogout}
        aria-label={label}
        className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-red-500 dark:text-red-400/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-all duration-200"
      >
        <LogOut className="h-4 w-4" />
      </button>
      {hovered && <SidebarTooltip label={label} anchorRef={ref} />}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { logout, role, workspace } = useAuth();
  const { t } = useI18n();
  const { collapsed, setCollapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isAdminOrOwner = mounted && (role === 'OWNER' || role === 'ADMIN');

  const adminNavItems: NavItem[] = [
    { href: '/workspace/members', label: t('sidebar.members'), icon: Users },
    { href: '/warehouse', label: t('sidebar.warehouses'), icon: Warehouse },
    { href: '/product', label: t('sidebar.products'), icon: Box },
    { href: '/project', label: t('sidebar.projects'), icon: FolderOpen },
    { href: '/department', label: t('sidebar.departments'), icon: Briefcase },
    { href: '/customer', label: t('sidebar.customers'), icon: ContactRound },
    { href: '/demand', label: t('sidebar.demands'), icon: ClipboardCheck },
    { href: '/activity', label: t('sidebar.activities'), icon: History },
    { href: '/task', label: t('sidebar.tasks'), icon: ListChecks },
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

  const configItems: NavItem[] = [
    { href: '/settings/appearance', label: t('sidebar.appearance'), icon: Palette },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-30 flex flex-col glass-sidebar',
        'transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[64px]' : 'w-[240px]',
      )}
    >
      {/* Header: Logo + Hamburger toggle */}
      <div
        className={cn(
          'border-b border-gray-200/60 dark:border-white/10 flex items-center flex-shrink-0',
          collapsed ? 'flex-col gap-2 py-3 px-2' : 'gap-3 px-4 py-4',
        )}
      >
        <div className="w-8 h-8 bg-[#CFAF6E] rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#CFAF6E]/20">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 dark:text-white text-sm tracking-wide flex-1 truncate">
            PropCart CRM
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors flex-shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace info — hidden when collapsed */}
      {!collapsed && workspace && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          <p className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-widest font-medium">
            Workspace
          </p>
          <p
            className="text-sm text-gray-800 dark:text-white/90 font-medium truncate mt-0.5"
            title={workspace.name}
          >
            {workspace.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-visible scrollbar-thin',
          collapsed ? 'p-2 space-y-1' : 'p-3 space-y-0.5',
        )}
      >
        {/* Admin/Management items */}
        {isAdminOrOwner && (
          <>
            {!collapsed && (
              <div className="pt-1 pb-1.5">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 px-3 uppercase tracking-widest">
                  {t('sidebar.management')}
                </p>
              </div>
            )}
            {collapsed && <div className="h-1" />}
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                collapsed={collapsed}
              />
            ))}
            <div className={cn('border-t border-gray-100 dark:border-white/[0.06]', collapsed ? 'my-2 mx-1' : 'my-2')} />
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

        {/* Configuration section */}
        <div className={cn('border-t border-gray-100 dark:border-white/[0.06]', collapsed ? 'my-2 mx-1' : 'my-2')} />
        {!collapsed && (
          <div className="pt-1 pb-1.5">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 px-3 uppercase tracking-widest">
              {t('sidebar.configuration')}
            </p>
          </div>
        )}
        {configItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className={cn('border-t border-gray-200/60 dark:border-white/10 flex-shrink-0', collapsed ? 'p-2' : 'p-3')}>
        {collapsed ? (
          <LogoutIconButton label={t('sidebar.logout')} onLogout={() => logout()} />
        ) : (
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {t('sidebar.logout')}
          </button>
        )}
      </div>
    </aside>
  );
}

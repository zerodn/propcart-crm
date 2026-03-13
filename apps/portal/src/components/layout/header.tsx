'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/du-an', label: 'Dự án' },
  ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 bg-amber-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">PC</span>
          </div>
          <span className="font-bold text-base text-gray-900 uppercase tracking-wide leading-tight">
            PropCart
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  active
                    ? 'text-amber-700 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition p-2 rounded-lg hover:bg-gray-50"
            aria-label="Chọn ngôn ngữ"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">VI</span>
          </button>

          {/* Auth Section */}
          {!loading && user ? (
            // Logged in - show user menu
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition text-gray-900"
              >
                <div className="w-6 h-6 bg-amber-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.userId.substring(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user.role}</span>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">User ID</p>
                    <p className="text-xs text-gray-500 truncate">{user.userId}</p>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Settings className="w-4 h-4" />
                    Trang quản trị
                  </a>
                  <button
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                      router.push('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition border-t border-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Not logged in - show login button
            <Link
              href="/login"
              className="bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}


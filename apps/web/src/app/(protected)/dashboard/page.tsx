'use client';

import { Building2, Users, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, workspace, role, workspaceType } = useAuth();

  const quickActions = [
    { label: 'Danh sách Workspaces', href: '/workspaces', icon: Building2, desc: 'Quản lý và chuyển đổi workspace' },
    { label: 'Lời mời', href: '/invitations', icon: Mail, desc: 'Xem và xử lý lời mời' },
    { label: 'Thành viên', href: '/workspace/members', icon: Users, desc: 'Quản lý thành viên và mời thêm' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Chào mừng trở lại, {user?.phone ?? user?.email}</p>
      </div>

      {/* Workspace Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{workspace?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  workspaceType === 'COMPANY' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                )}>
                  {workspaceType === 'COMPANY' ? 'Doanh nghiệp' : 'Cá nhân'}
                </span>
                {role && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600')}>
                    {ROLE_LABELS[role] ?? role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">ID: <span className="font-mono text-gray-700">{workspace?.id}</span></p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Truy cập nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map(({ label, href, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

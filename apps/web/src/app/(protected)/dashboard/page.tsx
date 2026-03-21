'use client';

import { Building2, Users, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, workspace, role, workspaceType } = useAuth();
  const { t } = useI18n();

  usePageSetup({
    title: t('dashboard.title'),
    subtitle: t('dashboard.greeting', { phone: user?.phone ?? user?.email ?? '' }),
  });

  const quickActions = [
    {
      label: t('dashboard.workspacesListLabel'),
      href: '/workspaces',
      icon: Building2,
      desc: t('dashboard.workspacesListDesc'),
    },
    {
      label: t('dashboard.invitationsLabel'),
      href: '/invitations',
      icon: Mail,
      desc: t('dashboard.invitationsDesc'),
    },
    {
      label: t('dashboard.membersLabel'),
      href: '/workspace/members',
      icon: Users,
      desc: t('dashboard.membersDesc'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#CFAF6E] rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{workspace?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    workspaceType === 'COMPANY'
                      ? 'bg-[#CFAF6E]/15 text-[#0B1F3A]'
                      : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {workspaceType === 'COMPANY'
                    ? t('workspace.companyType')
                    : t('workspace.personalType')}
                </span>
                {role && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {ROLE_LABELS[role] ?? role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ID: <span className="font-mono text-gray-700">{workspace?.id}</span>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t('dashboard.quickActionsTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map(({ label, href, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#CFAF6E] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-[#F5F7FA] rounded-lg flex items-center justify-center group-hover:bg-[#CFAF6E]/15 transition-colors">
                  <Icon className="h-4 w-4 text-[#CFAF6E]" />
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#CFAF6E] group-hover:translate-x-0.5 transition-all" />
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

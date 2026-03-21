'use client';

import { Building2, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import type { WorkspaceItem } from '@/types';
import { cn } from '@/lib/utils';

interface WorkspaceCardProps {
  item: WorkspaceItem;
}

export function WorkspaceCard({ item }: WorkspaceCardProps) {
  const { workspace: current, switchWorkspace } = useAuth();
  const { t } = useI18n();
  const isActive = item.id === current?.id;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-5 transition-all',
        isActive
          ? 'border-[#CFAF6E] ring-2 ring-[#CFAF6E]/20'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isActive ? 'bg-[#CFAF6E]' : 'bg-gray-100',
            )}
          >
            {item.type === 'COMPANY' ? (
              <Building2 className={cn('h-5 w-5', isActive ? 'text-white' : 'text-gray-500')} />
            ) : (
              <User className={cn('h-5 w-5', isActive ? 'text-white' : 'text-gray-500')} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block',
                item.type === 'COMPANY' ? 'bg-[#CFAF6E]/15 text-[#0B1F3A]' : 'bg-gray-100 text-gray-600',
              )}
            >
              {item.type === 'COMPANY' ? t('workspace.card.typeBusiness') : t('workspace.card.typePersonal')}
            </span>
          </div>
        </div>
        {isActive && <CheckCircle2 className="h-5 w-5 text-[#CFAF6E] flex-shrink-0" />}
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-full',
            ROLE_COLORS[item.role] ?? 'bg-gray-100 text-gray-600',
          )}
        >
          {ROLE_LABELS[item.role] ?? item.role}
        </span>
        {isActive ? (
          <span className="text-xs text-[#CFAF6E] font-medium">{t('workspace.card.current')}</span>
        ) : (
          <button
            onClick={() => switchWorkspace(item.id)}
            className="text-xs font-medium text-[#CFAF6E] hover:text-[#0B1F3A] hover:underline"
          >
            {t('workspace.card.switchTo')}
          </button>
        )}
      </div>
    </div>
  );
}

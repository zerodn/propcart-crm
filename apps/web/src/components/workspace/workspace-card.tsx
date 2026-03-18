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
          ? 'border-blue-300 ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isActive ? 'bg-blue-600' : 'bg-gray-100',
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
                item.type === 'COMPANY' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
              )}
            >
              {item.type === 'COMPANY' ? t('workspace.card.typeBusiness') : t('workspace.card.typePersonal')}
            </span>
          </div>
        </div>
        {isActive && <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />}
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
          <span className="text-xs text-blue-600 font-medium">{t('workspace.card.current')}</span>
        ) : (
          <button
            onClick={() => switchWorkspace(item.id)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {t('workspace.card.switchTo')}
          </button>
        )}
      </div>
    </div>
  );
}

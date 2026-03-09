'use client';

import { Building2 } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { WorkspaceCard } from '@/components/workspace/workspace-card';
import { GridSkeleton } from '@/components/common/skeleton';

export default function WorkspacesPage() {
  const { t } = useI18n();
  const { workspaces, isLoading, error } = useWorkspaces();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('workspaces.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('workspaces.subtitle')}</p>
      </div>

      {isLoading && <GridSkeleton cols={3} rows={1} />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && workspaces.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">{t('workspaces.emptyState')}</p>
        </div>
      )}

      {!isLoading && workspaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((item) => (
            <WorkspaceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

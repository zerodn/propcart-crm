'use client';

import { Building2 } from 'lucide-react';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { WorkspaceCard } from '@/components/workspace/workspace-card';

export default function WorkspacesPage() {
  const { workspaces, isLoading, error } = useWorkspaces();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Workspaces</h1>
        <p className="text-sm text-gray-500 mt-0.5">Các workspace bạn là thành viên</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && workspaces.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Không có workspace nào</p>
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

'use client';

import { useState } from 'react';
import { Shield, Loader2, Check, X } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';

export default function PermissionsPage() {
  const { t } = useI18n();
  const { roles, permissions, isLoading, error, assignPermission, removePermission } =
    usePermissions();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, typeof permissions>,
  );

  const handleTogglePermission = async (
    roleId: string,
    permissionId: string,
    hasPermission: boolean,
  ) => {
    setAssigningId(`${roleId}-${permissionId}`);
    try {
      if (hasPermission) {
        await removePermission(roleId, permissionId);
      } else {
        await assignPermission(roleId, permissionId);
      }
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('permissions.title')}</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">{t('permissions.subtitle')}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-3 bg-gray-100 rounded flex-1" />
                    <div className="h-3 w-3 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && roles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Shield className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">Chưa có vai trò nào</p>
          <p className="text-sm text-gray-500 mt-1">Hãy tạo vai trò trước để gán quyền</p>
        </div>
      )}

      {/* Roles & Permissions Table */}
      {!isLoading && roles.length > 0 && permissions.length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([module, modulePerms]) => (
            <div key={module} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 px-1">{module}</h3>

              {modulePerms.map((permission) => (
                <div key={permission.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{permission.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{permission.code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {roles.map((role) => {
                      const hasPermission = role.permissions?.some((p) => p.id === permission.id);
                      const isAssigning = assigningId === `${role.id}-${permission.id}`;

                      return (
                        <button
                          key={role.id}
                          onClick={() =>
                            handleTogglePermission(role.id, permission.id, !!hasPermission)
                          }
                          disabled={isAssigning}
                          className={cn(
                            'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                            hasPermission
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          )}
                          title={`Vai trò: ${ROLE_LABELS[role.code] || role.name}`}
                        >
                          <span className="truncate">{ROLE_LABELS[role.code] || role.name}</span>
                          {isAssigning ? (
                            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                          ) : hasPermission ? (
                            <Check className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <X className="h-3 w-3 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && roles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            <span className="font-medium">{roles.length}</span> vai trò •{' '}
            <span className="font-medium">{permissions.length}</span> quyền hạn
          </p>
        </div>
      )}
    </div>
  );
}

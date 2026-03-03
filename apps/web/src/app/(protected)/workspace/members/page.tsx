'use client';

import { useState } from 'react';
import { Users, UserPlus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { InviteModal } from '@/components/workspace/invite-modal';
import { useInvitations } from '@/hooks/use-invitations';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

export default function MembersPage() {
  const { workspace, role, user } = useAuth();
  const { invitations, isLoading: invLoading, refetch } = useInvitations();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';

  // Sent invitations (from this workspace) — approximated as pending invitations visible
  const sentInvitations = invitations.filter((i) => i.workspaceId === workspace?.id && i.status === 0);

  const handleCancel = async (invId: string) => {
    try {
      await apiClient.delete(`/workspaces/${workspace?.id}/invitations/${invId}`);
      toast.success('Đã hủy lời mời');
      refetch();
    } catch {
      toast.error('Không thể hủy lời mời');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thành viên</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý thành viên workspace</p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Mời thành viên
          </button>
        )}
      </div>

      {/* Current user info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          Thông tin của bạn
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold">
            {(user?.phone ?? user?.email ?? '??').slice(-4, -2)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.phone ?? user?.email}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {role && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600')}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending invitations sent from this workspace */}
      {isAdminOrOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Lời mời đang chờ
            {sentInvitations.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">{sentInvitations.length}</span>
            )}
          </h3>

          {invLoading && <div className="text-sm text-gray-400">Đang tải...</div>}

          {!invLoading && sentInvitations.length === 0 && (
            <p className="text-sm text-gray-400">Không có lời mời nào đang chờ</p>
          )}

          <div className="space-y-2">
            {sentInvitations.map((inv) => {
              const daysLeft = Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invitedPhone}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[inv.role.code] ?? 'bg-gray-100')}>
                        {ROLE_LABELS[inv.role.code] ?? inv.role.name}
                      </span>
                      <span className="text-xs text-gray-400">Còn {daysLeft} ngày</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancel(inv.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hủy lời mời"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

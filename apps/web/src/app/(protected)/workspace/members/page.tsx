'use client';

import { useState } from 'react';
import { Users, UserPlus, Trash2, Clock, XCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { InviteModal } from '@/components/workspace/invite-modal';
import { useWorkspaceInvitations, useDeclinedInvitations } from '@/hooks/use-invitations';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useI18n } from '@/providers/i18n-provider';

export default function MembersPage() {
  const { workspace, role, user } = useAuth();
  const { t } = useI18n();
  const { invitations, isLoading: invLoading, refetch } = useWorkspaceInvitations(workspace?.id);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [declinedPage, setDeclinedPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const {
    invitations: declinedInvitations,
    isLoading: declinedLoading,
    meta: declinedMeta,
  } = useDeclinedInvitations(workspace?.id, declinedPage, 10);
  const { members, isLoading: membersLoading } = useWorkspaceMembers(workspace?.id, memberSearch);

  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 break-words">{t('members.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('members.subtitle')}</p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t('members.invite')}
          </button>
        )}
      </div>

      {/* Workspace members list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            Danh sách nhân sự
            {members.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                {members.length}
              </span>
            )}
          </h3>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo SĐT hoặc email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {membersLoading && <div className="text-sm text-gray-400">Đang tải...</div>}

        {!membersLoading && members.length === 0 && (
          <p className="text-sm text-gray-400">
            {memberSearch ? 'Không tìm thấy nhân sự nào' : 'Chưa có nhân sự nào'}
          </p>
        )}

        <div className="grid gap-3">
          {members.map((member) => {
            const joinedDate = new Date(member.joinedAt).toLocaleDateString('vi-VN');
            const displayName = member.user.phone || member.user.email || 'N/A';
            const initials = displayName.slice(-4, -2);
            return (
              <div
                key={member.id}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold">
                  {initials}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 break-words">
                    {displayName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium',
                        ROLE_COLORS[member.role.code] ?? 'bg-gray-100',
                      )}
                    >
                      {ROLE_LABELS[member.role.code] ?? member.role.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      • Tham gia {joinedDate}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations sent from this workspace */}
      {isAdminOrOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            {t('members.pending')}
            {invitations.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">
                {invitations.length}
              </span>
            )}
          </h3>

          {invLoading && <div className="text-sm text-gray-400">{t('members.loading')}</div>}

          {!invLoading && invitations.length === 0 && (
            <p className="text-sm text-gray-400">{t('members.no_pending')}</p>
          )}

          <div className="grid gap-3">
            {invitations.map((inv) => {
              const daysLeft = Math.ceil(
                (new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );
              return (
                <div
                  key={inv.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-words">
                      {inv.invitedPhone}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full font-medium',
                          ROLE_COLORS[inv.role.code] ?? 'bg-gray-100',
                        )}
                      >
                        {ROLE_LABELS[inv.role.code] ?? inv.role.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        • Còn {daysLeft} ngày
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancel(inv.id)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Declined invitations history */}
      {isAdminOrOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            Lời mời bị từ chối
            {declinedMeta.total > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                {declinedMeta.total}
              </span>
            )}
          </h3>

          {declinedLoading && <div className="text-sm text-gray-400">Đang tải...</div>}

          {!declinedLoading && declinedInvitations.length === 0 && (
            <p className="text-sm text-gray-400">Chưa có lời mời bị từ chối</p>
          )}

          <div className="grid gap-3">
            {declinedInvitations.map((inv) => {
              const declinedDate = inv.respondedAt
                ? new Date(inv.respondedAt).toLocaleDateString('vi-VN')
                : '';
              return (
                <div
                  key={inv.id}
                  className="flex items-start gap-4 p-4 border border-red-200 bg-red-50/30 rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-words">
                      {inv.invitedPhone}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full font-medium',
                          ROLE_COLORS[inv.role.code] ?? 'bg-gray-100',
                        )}
                      >
                        {ROLE_LABELS[inv.role.code] ?? inv.role.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        • Từ chối ngày {declinedDate}
                      </span>
                    </div>
                    {inv.declineReason && (
                      <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs text-gray-600">
                        <span className="font-medium">Lý do:</span> {inv.declineReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {declinedMeta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Trang {declinedMeta.page} / {declinedMeta.totalPages} (Tổng: {declinedMeta.total})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeclinedPage((p) => Math.max(1, p - 1))}
                  disabled={declinedPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Trước
                </button>
                <button
                  onClick={() => setDeclinedPage((p) => Math.min(declinedMeta.totalPages, p + 1))}
                  disabled={declinedPage === declinedMeta.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} onSuccess={refetch} />
      )}
    </div>
  );
}

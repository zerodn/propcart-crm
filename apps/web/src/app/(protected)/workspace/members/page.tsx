'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  UserCog,
  Upload,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { InviteModal } from '@/components/workspace/invite-modal';
import { MemberEditDialog } from '@/components/workspace/member-edit-dialog';
import { MemberAddDialog } from '@/components/workspace/member-add-dialog';
import { MemberImportDialog } from '@/components/workspace/member-import-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useWorkspaceInvitations, useDeclinedInvitations } from '@/hooks/use-invitations';
import { useWorkspaceMembers, useWorkspaceRoles } from '@/hooks/use-workspace-members';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import type { WorkspaceMember } from '@/hooks/use-workspace-members';
import { Skeleton } from '@/components/common/skeleton';
import {
  BaseDataGrid,
  type DataGridColumn,
  type DataGridAction,
} from '@/components/common/base-data-grid';

export default function MembersPage() {
  const { workspace, role, user } = useAuth();
  const { t } = useI18n();
  const { invitations, isLoading: invLoading, refetch } = useWorkspaceInvitations(workspace?.id);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);
  const [declinedPage, setDeclinedPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const MEMBER_PAGE_SIZE = 10;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<{
    id: string;
    phone: string;
  } | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const {
    invitations: declinedInvitations,
    isLoading: declinedLoading,
    meta: declinedMeta,
  } = useDeclinedInvitations(workspace?.id, declinedPage, 10);
  const {
    members,
    isLoading: membersLoading,
    meta: membersMeta,
    refetch: refetchMembers,
  } = useWorkspaceMembers(workspace?.id, memberSearch, memberPage, MEMBER_PAGE_SIZE);
  const { roles } = useWorkspaceRoles(workspace?.id);

  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';

  usePageSetup({
    title: t('members.title'),
    subtitle: t('members.subtitle'),
    actions: isAdminOrOwner ? (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Thêm nhân sự
        </button>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {t('members.invite')}
        </button>
      </div>
    ) : undefined,
  });

  const handleCancel = (invId: string, phone: string) => {
    setInvitationToCancel({ id: invId, phone });
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    if (!invitationToCancel) return;
    setIsCanceling(true);
    try {
      await apiClient.delete(`/workspaces/${workspace?.id}/invitations/${invitationToCancel.id}`);
      toast.success('Đã hủy lời mời');
      setShowCancelConfirm(false);
      setInvitationToCancel(null);
      refetch();
    } catch {
      toast.error('Không thể hủy lời mời');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleEditMember = (member: WorkspaceMember) => {
    setEditingMember(member);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    toast.success('Cập nhật thành công');
    refetchMembers();
  };

  const handleExport = async () => {
    if (!workspace?.id) return;
    setIsExporting(true);
    try {
      const response = await apiClient.get(`/workspaces/${workspace.id}/members/export`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const date = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `nhan-su-${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel thành công');
    } catch {
      toast.error('Không thể xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleStatus = async (member: WorkspaceMember) => {
    try {
      const newStatus = member.status === 1 ? 0 : 1;
      await apiClient.patch(`/workspaces/${workspace?.id}/members/${member.id}`, {
        status: newStatus,
      });
      toast.success(newStatus === 1 ? 'Đã kích hoạt nhân sự' : 'Đã vô hiệu hóa nhân sự');
      refetchMembers();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const memberColumns: DataGridColumn<WorkspaceMember>[] = [
    {
      key: 'contact',
      label: 'Thông tin liên hệ',
      render: (_v, row) => {
        const phone = row.workspacePhone || row.user.phone || '';
        const email = row.workspaceEmail || row.user.email || '';
        return (
          <div className="text-sm">
            {phone && <p className="font-medium text-gray-900">{phone}</p>}
            {email && <p className="text-gray-600 text-xs">{email}</p>}
            {!phone && !email && <p className="text-gray-400">Chưa có</p>}
          </div>
        );
      },
    },
    {
      key: 'name',
      label: 'Tên',
      render: (_v, row) => {
        const fullName = row.displayName || row.user.fullName || '---';
        const initials = fullName.slice(0, 2).toUpperCase();
        const isCurrentUser = row.userId === user?.id;
        return (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold overflow-hidden">
              {row.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{fullName}</p>
              {isCurrentUser && <span className="text-xs text-blue-600">(Bạn)</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      label: 'Vai trò',
      render: (_v, row) => (
        <span
          className={cn(
            'inline-block text-xs px-2.5 py-1 rounded-full font-medium',
            ROLE_COLORS[row.role.code] ?? 'bg-gray-100',
          )}
        >
          {ROLE_LABELS[row.role.code] ?? row.role.name}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (_v, row) =>
        row.status === 1 ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            Vô hiệu
          </span>
        ),
    },
    {
      key: 'joinedAt',
      label: 'Tham gia',
      render: (_v, row) => (
        <span className="text-gray-600">
          {new Date(row.joinedAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  const memberActions: DataGridAction<WorkspaceMember>[] = isAdminOrOwner
    ? [
        {
          icon: <Edit2 className="h-3.5 w-3.5" />,
          label: 'Chỉnh sửa thông tin',
          onClick: (row) => handleEditMember(row),
          variant: 'primary',
        },
        {
          icon: <UserCog className="h-3.5 w-3.5" />,
          label: 'Vô hiệu hóa',
          onClick: (row) => handleToggleStatus(row),
          show: (row) => row.userId !== user?.id && row.status === 1,
        },
        {
          icon: <UserCog className="h-3.5 w-3.5" />,
          label: 'Kích hoạt',
          onClick: (row) => handleToggleStatus(row),
          show: (row) => row.userId !== user?.id && row.status === 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Workspace members list */}
      <BaseDataGrid<WorkspaceMember>
        data={members}
        columns={memberColumns}
        actions={memberActions}
        isLoading={membersLoading}
        emptyMessage={memberSearch ? 'Không tìm thấy nhân sự nào' : 'Chưa có nhân sự nào'}
        emptyIcon={<Users className="h-10 w-10 text-gray-300" />}
        title="Danh sách nhân sự"
        titleIcon={<Users className="h-4 w-4 text-gray-400" />}
        badgeCount={membersMeta.total}
        searchValue={memberSearch}
        onSearchChange={(v) => {
          setMemberSearch(v);
          setMemberPage(1);
        }}
        searchPlaceholder="Tìm theo SĐT hoặc email..."
        headerActions={
          isAdminOrOwner ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportDialog(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          ) : undefined
        }
        pageSize={MEMBER_PAGE_SIZE}
        totalItems={membersMeta.total}
        currentPage={memberPage}
        onPageChange={setMemberPage}
      />

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

          {invLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                      <span className="text-xs text-gray-500">• Còn {daysLeft} ngày</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancel(inv.id, inv.invitedPhone)}
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
                      <span className="text-xs text-gray-500">• Từ chối ngày {declinedDate}</span>
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
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={refetch}
        />
      )}

      {showEditDialog && editingMember && (
        <MemberEditDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingMember(null);
          }}
          onSuccess={handleEditSuccess}
          workspaceId={workspace?.id || ''}
          member={editingMember}
          availableRoles={Array.isArray(roles) ? roles : []}
        />
      )}

      {showAddDialog && (
        <MemberAddDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            refetchMembers();
          }}
          workspaceId={workspace?.id || ''}
          availableRoles={Array.isArray(roles) ? roles : []}
        />
      )}

      {showImportDialog && (
        <MemberImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onSuccess={() => {
            refetchMembers();
          }}
          workspaceId={workspace?.id || ''}
        />
      )}

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Hủy lời mời"
        message={`Bạn có chắc chắn muốn hủy lời mời cho ${invitationToCancel?.phone}? Họ sẽ không thể tham gia workspace bằng lời mời này nữa.`}
        confirmText="Hủy lời mời"
        cancelText="Đóng"
        isDangerous
        isLoading={isCanceling}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setShowCancelConfirm(false);
          setInvitationToCancel(null);
        }}
      />
    </div>
  );
}

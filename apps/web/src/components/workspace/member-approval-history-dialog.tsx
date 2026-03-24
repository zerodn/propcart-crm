'use client';

import { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  UserX,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';
import type { JoinRequestAdmin } from '@/types';
import type { WorkspaceMember } from '@/hooks/use-workspace-members';
import { BaseDialog } from '@/components/common/base-dialog';

interface MemberApprovalHistoryDialogProps {
  workspaceId: string;
  member: WorkspaceMember;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    PENDING: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      label: t('workspace.joinRequest.statusPending'),
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      cls: 'bg-green-50 text-green-700 border-green-200',
      label: t('workspace.joinRequest.statusApproved'),
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      cls: 'bg-red-50 text-red-700 border-red-200',
      label: t('workspace.joinRequest.statusRejected'),
      icon: <XCircle className="h-3 w-3" />,
    },
    CANCELLED: {
      cls: 'bg-gray-100 text-gray-500 border-gray-200',
      label: t('workspace.joinRequest.statusCancelled'),
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const config = map[status] ?? map.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function RequestCard({ req }: { req: JoinRequestAdmin }) {
  const { t } = useI18n();
  const [showDocs, setShowDocs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={req.status} />
            <span className="text-sm text-gray-500">
              {t('members.approvalHistory.requestedAt')}:{' '}
              {new Date(req.createdAt).toLocaleString('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          </div>

          {req.message && (
            <p className="mt-2 text-sm text-gray-600 italic bg-gray-50 rounded-lg px-3 py-2">
              &ldquo;{req.message}&rdquo;
            </p>
          )}

          {/* Reviewer info */}
          {req.reviewer && req.reviewedAt && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{t('members.approvalHistory.reviewer')}:</span>
              <span>{req.reviewer.fullName ?? '---'}</span>
              <span className="text-gray-300">·</span>
              <span>
                {new Date(req.reviewedAt).toLocaleString('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          )}

          {/* Rejection reason */}
          {req.status === 'REJECTED' && req.rejectionReason && (
            <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{req.rejectionReason}</span>
            </div>
          )}

          {/* Action links */}
          <div className="flex items-center gap-3 mt-2">
            {req.documents.length > 0 && (
              <button
                onClick={() => setShowDocs((v) => !v)}
                className="inline-flex items-center gap-1 text-sm text-[#CFAF6E] hover:underline"
              >
                <FileText className="h-4 w-4" />
                {req.documents.length} {t('members.approvalHistory.documents')}
              </button>
            )}
            {req.rejectionHistory.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="inline-flex items-center gap-1 text-sm text-red-500 hover:underline"
              >
                <UserX className="h-4 w-4" />
                {t('workspace.joinRequest.rejectionHistoryBtn', {
                  count: req.rejectionHistory.length,
                })}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Documents */}
      {showDocs && req.documents.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-1.5">
          <p className="text-sm font-medium text-gray-500 mb-2">
            {t('members.approvalHistory.documents')}
          </p>
          {req.documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
            >
              <FileText className="h-4 w-4 text-[#CFAF6E] flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate flex-1">{doc.fileName}</span>
              <span className="text-sm text-[#CFAF6E] hover:underline ml-auto">
                {t('workspace.joinRequest.viewDocument')}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Rejection history */}
      {showHistory && req.rejectionHistory.length > 0 && (
        <div className="border-t border-red-100 px-4 py-3 bg-red-50/50 space-y-2">
          <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-3">
            <History className="h-4 w-4" />
            {t('members.approvalHistory.rejectionHistory')}
          </p>
          {req.rejectionHistory.map((h, idx) => (
            <div key={h.id} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                <UserX className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="flex-1 pb-2 border-b border-red-100 last:border-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-medium text-gray-700">
                    {h.reviewer?.fullName ?? '---'}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">
                    {new Date(h.rejectedAt).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-medium">
                    #{idx + 1}
                  </span>
                </div>
                {h.reason ? (
                  <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{h.reason}&rdquo;</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-400 italic">
                    {t('members.approvalHistory.noReason')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MemberApprovalHistoryDialog({
  workspaceId,
  member,
  onClose,
}: MemberApprovalHistoryDialogProps) {
  const { t } = useI18n();
  const [requests, setRequests] = useState<JoinRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const displayName = member.displayName || member.user.fullName || '---';
  const phone = member.workspacePhone || member.user.phone || '---';
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiClient
      .get(`/workspaces/${workspaceId}/members/${member.userId}/approval-history`)
      .then((res) => {
        if (!cancelled) setRequests(res.data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, member.userId]);

  return (
    <BaseDialog
      isOpen
      onClose={onClose}
      maxWidth="4xl"
      headerContent={
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-[#CFAF6E]/15 rounded-full flex items-center justify-center text-[#0B1F3A] text-sm font-semibold overflow-hidden">
            {member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#0B1F3A]">
              {t('members.approvalHistory.title')}
            </h2>
            <p className="text-sm text-gray-500">
              {displayName} · {phone}
            </p>
          </div>
        </div>
      }
      footer={
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t('common.close')}
        </button>
      }
    >
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#CFAF6E]" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 justify-center py-16 text-sm text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{t('members.error.loadFailed')}</span>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <History className="h-12 w-12 text-gray-200" />
            <p className="text-base text-gray-400">{t('members.approvalHistory.noHistory')}</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <>
            <p className="text-sm text-gray-500 font-medium">
              {t('members.approvalHistory.requestCount', { count: requests.length })}
            </p>
            {requests.map((req) => (
              <RequestCard key={req.id} req={req} />
            ))}
          </>
        )}
      </div>
    </BaseDialog>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  Loader2,
  Check,
  X,
  ChevronDown,
  ImageIcon,
  Phone,
  History,
  UserX,
} from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type { JoinRequestAdmin } from '@/types';

interface JoinRequestsPanelProps {
  workspaceId: string;
}

type FilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const labelMap: Record<string, string> = {
    PENDING: t('workspace.joinRequest.statusPending'),
    APPROVED: t('workspace.joinRequest.statusApproved'),
    REJECTED: t('workspace.joinRequest.statusRejected'),
    CANCELLED: t('workspace.joinRequest.statusCancelled'),
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? map.PENDING}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

interface RejectInlineProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function RejectInline({ onConfirm, onCancel, loading }: RejectInlineProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  return (
    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 space-y-2">
      <p className="text-xs font-medium text-red-700">{t('workspace.joinRequest.adminRejectDialogTitle')}</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t('workspace.joinRequest.adminRejectReasonPlaceholder')}
        rows={2}
        className="w-full px-2.5 py-2 text-xs rounded border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={() => onConfirm(reason)}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          {t('workspace.joinRequest.adminRejectConfirm')}
        </button>
      </div>
    </div>
  );
}

interface RequestRowProps {
  req: JoinRequestAdmin;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  approving: boolean;
  rejecting: boolean;
}

function RequestRow({ req, onApprove, onReject, approving, rejecting }: RequestRowProps) {
  const { t } = useI18n();
  const [showReject, setShowReject] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const initials = (req.user.fullName ?? '??').slice(0, 2).toUpperCase();
  const hasHistory = req.rejectionHistory && req.rejectionHistory.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Row header */}
      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        {req.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={req.user.avatarUrl}
            alt={req.user.fullName ?? ''}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#CFAF6E]/15 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#0B1F3A]">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{req.user.fullName ?? '---'}</p>
            <StatusBadge status={req.status} />
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-gray-400">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs">{req.user.phone ?? '---'}</span>
          </div>
          {req.message && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.message}</p>
          )}
          {req.status === 'REJECTED' && req.rejectionReason && (
            <p className="text-xs text-red-500 mt-1">{req.rejectionReason}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-400">
              {t('workspace.joinRequest.requestedAt')}: {new Date(req.createdAt).toLocaleDateString('vi-VN')}
            </span>
            {req.documents.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-[#CFAF6E] hover:underline"
              >
                <FileText className="h-3 w-3" />
                {req.documents.length} {t('workspace.joinRequest.documentsTitle')}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
            {hasHistory && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
              >
                <History className="h-3 w-3" />
                {t('workspace.joinRequest.rejectionHistoryBtn', { count: req.rejectionHistory.length })}
                <ChevronDown className={`h-3 w-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Actions — only for PENDING */}
        {req.status === 'PENDING' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onApprove(req.id)}
              disabled={approving || rejecting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              aria-label={t('workspace.joinRequest.adminApprove')}
            >
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {t('workspace.joinRequest.adminApprove')}
            </button>
            <button
              onClick={() => setShowReject((v) => !v)}
              disabled={approving || rejecting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              aria-label={t('workspace.joinRequest.adminReject')}
            >
              <X className="h-3.5 w-3.5" />
              {t('workspace.joinRequest.adminReject')}
            </button>
          </div>
        )}
      </div>

      {/* Reject inline form */}
      {showReject && (
        <div className="px-4 pb-4">
          <RejectInline
            loading={rejecting}
            onCancel={() => setShowReject(false)}
            onConfirm={(reason) => {
              onReject(req.id, reason);
              setShowReject(false);
            }}
          />
        </div>
      )}

      {/* Rejection history expanded */}
      {showHistory && hasHistory && (
        <div className="border-t border-red-100 px-4 py-3 bg-red-50/50 space-y-2">
          <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mb-3">
            <History className="h-3.5 w-3.5" />
            {t('workspace.joinRequest.rejectionHistoryTitle')}
          </p>
          {req.rejectionHistory.map((h, idx) => (
            <div key={h.id} className="flex gap-3 text-xs">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                <UserX className="h-3 w-3 text-red-500" />
              </div>
              <div className="flex-1 pb-2 border-b border-red-100 last:border-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-700">{h.reviewer?.fullName ?? '---'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">
                    {new Date(h.rejectedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    #{idx + 1}
                  </span>
                </div>
                {h.reason ? (
                  <p className="mt-1 text-gray-600 italic">"{h.reason}"</p>
                ) : (
                  <p className="mt-1 text-gray-400 italic">{t('workspace.joinRequest.rejectionNoReason')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents expanded */}
      {expanded && req.documents.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 mb-2">{t('workspace.joinRequest.documentsTitle')}</p>
          {req.documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
            >
              <FileText className="h-4 w-4 text-[#CFAF6E] flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate flex-1">{doc.fileName}</span>
              <span className="text-xs text-[#CFAF6E] hover:underline ml-auto">
                {t('workspace.joinRequest.viewDocument')}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function JoinRequestsPanel({ workspaceId }: JoinRequestsPanelProps) {
  const { t } = useI18n();
  const [requests, setRequests] = useState<JoinRequestAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('PENDING');

  // Track per-request loading states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchRequests = useCallback(
    async (status?: FilterTab) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (status && status !== 'ALL') params.status = status;
        const { data: res } = await apiClient.get(`/workspaces/${workspaceId}/join-requests`, {
          params,
        });
        setRequests(res?.data ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    fetchRequests(filter);
  }, [fetchRequests, filter]);

  const handleApprove = async (requestId: string) => {
    setApprovingId(requestId);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/join-requests/${requestId}/approve`);
      toast.success(t('workspace.joinRequest.adminApproveSuccess'));
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'APPROVED' } : r)),
      );
    } catch {
      toast.error(t('workspace.joinRequest.adminApproveError'));
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    setRejectingId(requestId);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/join-requests/${requestId}/reject`, {
        reason: reason || undefined,
      });
      toast.success(t('workspace.joinRequest.adminRejectSuccess'));
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'REJECTED', rejectionReason: reason || null } : r)),
      );
    } catch {
      toast.error(t('workspace.joinRequest.adminRejectError'));
    } finally {
      setRejectingId(null);
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'PENDING', label: t('workspace.joinRequest.filterPending') },
    { key: 'ALL', label: t('workspace.joinRequest.filterAll') },
    { key: 'APPROVED', label: t('workspace.joinRequest.filterApproved') },
    { key: 'REJECTED', label: t('workspace.joinRequest.filterRejected') },
  ];

  return (
    <div className="glass-content-card rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-[#0B1F3A] flex items-center gap-2">
          <Users className="h-4 w-4 text-[#CFAF6E]" />
          {t('workspace.joinRequest.adminTitle')}
        </h3>
        <button
          onClick={() => fetchRequests(filter)}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '↻ Làm mới'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.key
                ? 'border-[#CFAF6E] text-[#CFAF6E]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#CFAF6E]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10">
          <ImageIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('workspace.joinRequest.adminEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestRow
              key={req.id}
              req={req}
              approving={approvingId === req.id}
              rejecting={rejectingId === req.id}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

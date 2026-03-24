'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Loader2, FileImage, AlertCircle } from 'lucide-react';
import { BaseDialog } from '@/components/common/base-dialog';
import { useI18n } from '@/providers/i18n-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type { WorkspaceMember } from '@/hooks/use-workspace-members';

interface KycDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
  documentType: string;
}

interface KycMemberData {
  kycStatus: string;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycRejectionReason: string | null;
  user: {
    id: string;
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
  };
  documents: KycDocument[];
}

interface KycReviewDialogProps {
  workspaceId: string;
  member: WorkspaceMember;
  onClose: () => void;
  onReviewed: () => void;
}

export function KycReviewDialog({ workspaceId, member, onClose, onReviewed }: KycReviewDialogProps) {
  const { t } = useI18n();
  const [data, setData] = useState<KycMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const { data: res } = await apiClient.get(
          `/workspaces/${workspaceId}/members/${member.userId}/kyc-documents`,
        );
        setData(res.data);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId, member.userId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/members/${member.userId}/kyc/approve`);
      toast.success(t('kyc.approveSuccess'));
      setShowApproveConfirm(false);
      onReviewed();
    } catch {
      toast.error(t('kyc.approveError'));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/members/${member.userId}/kyc/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      toast.success(t('kyc.rejectSuccess'));
      setShowRejectDialog(false);
      onReviewed();
    } catch {
      toast.error(t('kyc.rejectError'));
    } finally {
      setRejecting(false);
    }
  };

  const kycStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      NONE: { cls: 'bg-gray-100 text-gray-500', label: t('kyc.statusNone') },
      SUBMITTED: { cls: 'bg-amber-100 text-amber-700', label: t('kyc.statusSubmitted') },
      APPROVED: { cls: 'bg-green-100 text-green-700', label: t('kyc.statusApproved') },
      REJECTED: { cls: 'bg-red-100 text-red-700', label: t('kyc.statusRejected') },
    };
    const cfg = map[status] ?? map.NONE;
    return (
      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  const memberName =
    member.displayName || member.user.fullName || member.user.phone || '---';

  return (
    <>
      <BaseDialog
        isOpen
        onClose={onClose}
        maxWidth="2xl"
        title={t('kyc.adminTitle')}
        headerContent={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0B1F3A] flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-[#CFAF6E]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0B1F3A]">{t('kyc.adminTitle')}</h2>
              <p className="text-xs text-[#9CA3AF]">{memberName}</p>
            </div>
          </div>
        }
        footer={
          data && data.kycStatus === 'SUBMITTED' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRejectDialog(true)}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <XCircle className="h-4 w-4 inline mr-1.5" />
                {t('kyc.rejectBtn')}
              </button>
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                {t('kyc.approveBtn')}
              </button>
            </div>
          ) : undefined
        }
      >
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#CFAF6E]" />
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-gray-500">{t('kyc.loadError')}</p>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-5">
            {/* Status + dates */}
            <div className="flex items-center gap-4 flex-wrap">
              {kycStatusBadge(data.kycStatus)}
              {data.kycSubmittedAt && (
                <span className="text-xs text-gray-500">
                  Nộp:{' '}
                  {new Date(data.kycSubmittedAt).toLocaleString('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
              {data.kycReviewedAt && (
                <span className="text-xs text-gray-500">
                  Duyệt:{' '}
                  {new Date(data.kycReviewedAt).toLocaleString('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </div>

            {/* Rejection reason */}
            {data.kycRejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-0.5">{t('kyc.rejectionReason')}</p>
                  <p className="text-xs text-red-600">{data.kycRejectionReason}</p>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <p className="text-sm font-semibold text-[#0B1F3A] mb-3">
                CCCD / CMND ({data.documents.length} ảnh)
              </p>
              {data.documents.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                  {t('kyc.noDocuments')}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {data.documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setPreviewUrl(doc.fileUrl)}
                      className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 h-40 flex items-center justify-center hover:border-[#CFAF6E] transition-colors"
                      aria-label={doc.fileName}
                    >
                      {doc.fileType?.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.fileUrl}
                          alt={doc.fileName}
                          className="object-contain h-full w-full p-1"
                        />
                      ) : (
                        <FileImage className="h-10 w-10 text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </BaseDialog>

      {/* Image preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="KYC"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"
            aria-label="Đóng"
          >
            <XCircle className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      {/* Approve confirm */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        onCancel={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        isLoading={approving}
        title={t('kyc.approveBtn')}
        message={t('kyc.approveConfirm')}
        confirmText={t('kyc.approveBtn')}
      />

      {/* Reject dialog */}
      {showRejectDialog && (
        <BaseDialog
          isOpen
          onClose={() => setShowRejectDialog(false)}
          maxWidth="sm"
          title={t('kyc.rejectConfirm')}
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
              >
                Huỷ
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('kyc.rejectBtn')}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700">
              {t('kyc.rejectReasonLabel')}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('kyc.rejectReasonPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]/30 focus:border-[#CFAF6E]"
            />
          </div>
        </BaseDialog>
      )}
    </>
  );
}

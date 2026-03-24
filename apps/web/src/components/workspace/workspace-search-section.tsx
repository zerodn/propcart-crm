'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Building2, MapPin, CheckCircle2, Clock, XCircle, Loader2, ImageIcon, RotateCcw, Shield } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { JoinRequestDialog } from './join-request-dialog';
import { KycRequiredDialog } from './kyc-required-dialog';
import type { WorkspaceSearchResult, JoinRequest } from '@/types';

interface WorkspaceSearchSectionProps {
  userFullName: string | null;
  userPhone: string | null;
  existingWorkspaceIds: string[];
  userAddressLine?: string | null;
  userProvinceCode?: string;
  userProvinceName?: string;
  userWardCode?: string;
  userWardName?: string;
}

type StatusBadgeType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

function StatusBadge({ status }: { status: StatusBadgeType }) {
  const { t } = useI18n();
  const map: Record<StatusBadgeType, { cls: string; label: string }> = {
    PENDING: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      label: t('workspace.joinRequest.statusPending'),
    },
    APPROVED: {
      cls: 'bg-green-50 text-green-700 border-green-200',
      label: t('workspace.joinRequest.statusApproved'),
    },
    REJECTED: {
      cls: 'bg-red-50 text-red-700 border-red-200',
      label: t('workspace.joinRequest.statusRejected'),
    },
    CANCELLED: {
      cls: 'bg-gray-100 text-gray-500 border-gray-200',
      label: t('workspace.joinRequest.statusCancelled'),
    },
  };
  const cfg = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function WorkspaceCard({
  ws,
  pending,
  existingWorkspaceIds,
  onRequestClick,
}: {
  ws: WorkspaceSearchResult;
  pending: boolean; // request currently being sent
  existingWorkspaceIds: string[];
  onRequestClick: (ws: WorkspaceSearchResult) => void;
}) {
  const { t } = useI18n();
  const isAlreadyMember = existingWorkspaceIds.includes(ws.id);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#CFAF6E]/50 transition-colors">
      {ws.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ws.logoUrl} alt={ws.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-[#CFAF6E]/10 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-6 w-6 text-[#CFAF6E]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0B1F3A] truncate">{ws.name}</p>
        {ws.code && <p className="text-xs text-gray-400 mt-0.5">{ws.code}</p>}
        {ws.address && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-gray-300 flex-shrink-0" />
            <p className="text-xs text-gray-400 truncate">{ws.address}</p>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        {isAlreadyMember ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('workspace.joinRequest.alreadyMember')}
          </div>
        ) : (
          <button
            onClick={() => onRequestClick(ws)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CFAF6E] text-white text-xs font-medium hover:bg-[#B89655] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {t('workspace.joinRequest.joinBtn')}
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkspaceSearchSection({
  userFullName,
  userPhone,
  existingWorkspaceIds,
  userAddressLine,
  userProvinceCode,
  userProvinceName,
  userWardCode,
  userWardName,
}: WorkspaceSearchSectionProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);

  // Dialog state
  const [dialogWorkspace, setDialogWorkspace] = useState<WorkspaceSearchResult | null>(null);
  const [resendData, setResendData] = useState<{
    initialMessage: string | null;
    addressLine: string | null;
    provinceCode?: string;
    provinceName?: string;
    wardCode?: string;
    wardName?: string;
    previousDocCount: number;
  } | null>(null);

  // For cancelling requests
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // KYC dialog (profile-page non-blocking usage)
  const [kycDialogWorkspaceId, setKycDialogWorkspaceId] = useState<string | null>(null);
  const [kycDialogStatus, setKycDialogStatus] = useState<'NONE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null>(null);
  const [kycDialogRejectionReason, setKycDialogRejectionReason] = useState<string | null>(null);
  const [kycFetchingId, setKycFetchingId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load my requests on mount
  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    setMyRequestsLoading(true);
    try {
      const { data: res } = await apiClient.get('/me/join-requests');
      setMyRequests(res?.data ?? []);
    } catch {
      // silent
    } finally {
      setMyRequestsLoading(false);
    }
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const { data: res } = await apiClient.get('/workspaces/search', {
        params: { q: q.trim() },
      });
      setResults(res?.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 400);
  };

  const handleSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      await apiClient.delete(`/me/join-requests/${requestId}`);
      toast.success(t('workspace.joinRequest.cancelSuccess'));
      setMyRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
      if (code === 'REQUEST_NOT_PENDING') {
        toast.error(t('workspace.joinRequest.cancelNotPending'), { duration: 5000 });
        // Refresh to show the actual current status
        fetchMyRequests();
      } else {
        toast.error(t('workspace.joinRequest.cancelError'));
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleDialogSuccess = () => {
    setDialogWorkspace(null);
    setResendData(null);
    fetchMyRequests();
  };

  const handleResendRequest = (req: JoinRequest) => {
    setResendData({
      initialMessage: req.message,
      addressLine: req.addressLine,
      provinceCode: req.provinceCode ?? undefined,
      provinceName: req.provinceName ?? undefined,
      wardCode: req.wardCode ?? undefined,
      wardName: req.wardName ?? undefined,
      previousDocCount: req.documents.length,
    });
    setDialogWorkspace(req.workspace);
  };

  const handleKycClick = async (workspaceId: string) => {
    setKycFetchingId(workspaceId);
    try {
      const { data: res } = await apiClient.get(`/workspaces/${workspaceId}/me/kyc`);
      const status = res?.data?.kycStatus ?? 'NONE';
      const rejectionReason = res?.data?.kycRejectionReason ?? null;
      setKycDialogStatus(status);
      setKycDialogRejectionReason(rejectionReason);
      setKycDialogWorkspaceId(workspaceId);
    } catch {
      toast.error(t('kyc.loadError'));
    } finally {
      setKycFetchingId(null);
    }
  };

  // Determine if a search result workspace has a pending request already from myRequests
  const getPendingRequestWsIds = () => new Set(myRequests.filter((r) => r.status === 'PENDING').map((r) => r.workspaceId));

  const pendingWsIds = getPendingRequestWsIds();

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h3 className="text-base font-semibold text-[#0B1F3A]">{t('workspace.joinRequest.searchTitle')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('workspace.joinRequest.searchDescription')}</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('workspace.joinRequest.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E] text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-medium hover:bg-[#0F2A52] disabled:opacity-50 transition-colors"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t('workspace.joinRequest.searchBtn')}
        </button>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div>
          {searching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#CFAF6E]" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{t('workspace.joinRequest.noResults')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  ws={ws}
                  pending={false}
                  existingWorkspaceIds={[...existingWorkspaceIds, ...Array.from(pendingWsIds)]}
                  onRequestClick={(w) => {
                    if (pendingWsIds.has(w.id)) {
                      toast.info(t('workspace.joinRequest.pendingRequest'));
                      return;
                    }
                    setDialogWorkspace(w);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Requests */}
      <div>
        <h4 className="text-sm font-semibold text-[#0B1F3A] mb-3">{t('workspace.joinRequest.myRequestsTitle')}</h4>
        {myRequestsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải...</span>
          </div>
        ) : myRequests.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">{t('workspace.joinRequest.myRequestsEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                {req.workspace?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={req.workspace.logoUrl} alt={req.workspace.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[#CFAF6E]/10 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-4 w-4 text-[#CFAF6E]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {req.workspace?.name ?? req.workspaceId}
                    </p>
                    <StatusBadge status={req.status as StatusBadgeType} />
                  </div>
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                      {req.rejectionReason}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                {req.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    disabled={cancellingId === req.id}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    aria-label={t('workspace.joinRequest.cancelBtn')}
                  >
                    {cancellingId === req.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {t('workspace.joinRequest.cancelBtn')}
                  </button>
                )}
                {req.status === 'REJECTED' && (
                  <button
                    onClick={() => handleResendRequest(req)}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0B1F3A] border border-[#CFAF6E] rounded-lg hover:bg-[#CFAF6E]/10 transition-colors"
                    aria-label={t('workspace.joinRequest.resendBtn')}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t('workspace.joinRequest.resendBtn')}
                  </button>
                )}
                {req.status === 'APPROVED' && req.workspace?.requireKyc && (
                  <button
                    onClick={() => handleKycClick(req.workspaceId)}
                    disabled={kycFetchingId === req.workspaceId}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#0B1F3A] border border-[#CFAF6E] rounded-lg hover:bg-[#CFAF6E]/10 disabled:opacity-50 transition-colors"
                    aria-label={t('kyc.infoAction')}
                  >
                    {kycFetchingId === req.workspaceId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Shield className="h-3 w-3 text-[#CFAF6E]" />
                    )}
                    {t('kyc.infoAction')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogWorkspace && (
        <JoinRequestDialog
          workspace={dialogWorkspace}
          userFullName={userFullName}
          userPhone={userPhone}
          userAddressLine={resendData?.addressLine ?? userAddressLine}
          userProvinceCode={resendData?.provinceCode ?? userProvinceCode}
          userProvinceName={resendData?.provinceName ?? userProvinceName}
          userWardCode={resendData?.wardCode ?? userWardCode}
          userWardName={resendData?.wardName ?? userWardName}
          initialMessage={resendData?.initialMessage}
          previousDocCount={resendData?.previousDocCount}
          onClose={() => { setDialogWorkspace(null); setResendData(null); }}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* KYC Dialog (profile-page non-blocking) */}
      {kycDialogWorkspaceId && kycDialogStatus !== null && (
        <KycRequiredDialog
          workspaceId={kycDialogWorkspaceId}
          kycStatus={kycDialogStatus}
          kycRejectionReason={kycDialogRejectionReason}
          onKycSubmitted={() => {
            setKycDialogStatus('SUBMITTED');
          }}
          onClose={() => {
            setKycDialogWorkspaceId(null);
            setKycDialogStatus(null);
            setKycDialogRejectionReason(null);
          }}
        />
      )}
    </div>
  );
}

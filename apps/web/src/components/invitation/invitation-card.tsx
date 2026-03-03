'use client';

import { useState } from 'react';
import { Building2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import type { Invitation } from '@/types';
import { cn } from '@/lib/utils';

interface InvitationCardProps {
  invitation: Invitation;
  onUpdate: () => void;
}

export function InvitationCard({ invitation, onUpdate }: InvitationCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const expiresAt = new Date(invitation.expiresAt);
  const isExpired = expiresAt < new Date();
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await apiClient.post(`/invitations/${invitation.token}/accept`);
      toast.success(`Đã tham gia workspace "${invitation.workspace.name}"`);
      onUpdate();
    } catch {
      toast.error('Không thể chấp nhận lời mời');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await apiClient.post(`/invitations/${invitation.token}/decline`);
      toast.success('Đã từ chối lời mời');
      onUpdate();
    } catch {
      toast.error('Không thể từ chối lời mời');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{invitation.workspace.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {invitation.workspace.type === 'COMPANY' ? 'Doanh nghiệp' : 'Cá nhân'}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[invitation.role.code] ?? 'bg-gray-100 text-gray-600')}>
              {ROLE_LABELS[invitation.role.code] ?? invitation.role.name}
            </span>
            <span className={cn('flex items-center gap-1 text-xs', isExpired ? 'text-red-500' : daysLeft <= 1 ? 'text-orange-500' : 'text-gray-400')}>
              <Clock className="h-3 w-3" />
              {isExpired ? 'Đã hết hạn' : `Còn ${daysLeft} ngày`}
            </span>
          </div>
        </div>
      </div>

      {invitation.status === 0 && !isExpired && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Chấp nhận
          </button>
          <button
            onClick={handleDecline}
            disabled={accepting || declining}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {declining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Từ chối
          </button>
        </div>
      )}

      {(invitation.status !== 0 || isExpired) && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          {invitation.status === 1 && '✓ Đã chấp nhận'}
          {invitation.status === 2 && '✗ Đã từ chối'}
          {invitation.status === 4 && 'Đã hủy'}
          {isExpired && invitation.status === 0 && 'Lời mời đã hết hạn'}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Loader2, GitMerge, UserCircle2, Mail, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';
import apiClient from '@/lib/api-client';
import type { User, Workspace } from '@/types';

export interface MergeSuggestion {
  mergeToken: string;
  googleAccount: {
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface MergeAccountDialogProps {
  suggestion: MergeSuggestion;
  /** Already-issued tokens from phone login — used to authorise accept-merge call */
  accessToken: string;
  onMerged: (accessToken: string, refreshToken: string, user: User, workspace: Workspace) => void;
  onSkip: () => void;
}

export function MergeAccountDialog({
  suggestion,
  accessToken,
  onMerged,
  onSkip,
}: MergeAccountDialogProps) {
  const { t } = useI18n();
  const [isMerging, setIsMerging] = useState(false);

  const handleMerge = async () => {
    setIsMerging(true);
    try {
      const { data } = await apiClient.post(
        '/auth/accept-merge',
        { merge_token: suggestion.mergeToken },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const { access_token, refresh_token, user, workspace } = data.data;
      toast.success(t('auth.merge.mergeSuccess'));
      onMerged(access_token, refresh_token, user, workspace);
    } catch {
      toast.error(t('auth.merge.mergeFailed'));
      setIsMerging(false);
    }
  };

  const { googleAccount } = suggestion;

  return (
    /* Overlay */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#CFAF6E]/15 flex items-center justify-center flex-shrink-0">
              <GitMerge className="h-5 w-5 text-[#CFAF6E]" />
            </div>
            <h2 className="text-base font-bold text-[#0B1F3A] font-heading">
              {t('auth.merge.title')}
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            {t('auth.merge.description')}
          </p>
        </div>

        {/* Google account preview */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t('auth.merge.googleAccountLabel')}
          </p>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#CFAF6E]/15 flex items-center justify-center flex-shrink-0">
              {googleAccount.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={googleAccount.avatarUrl}
                  alt={googleAccount.fullName ?? googleAccount.email}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-7 w-7 text-[#CFAF6E]" />
              )}
            </div>
            <div className="min-w-0">
              {googleAccount.fullName && (
                <p className="font-semibold text-[#0B1F3A] truncate">{googleAccount.fullName}</p>
              )}
              <p className="text-sm text-gray-500 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                {googleAccount.email}
              </p>
            </div>
          </div>
        </div>

        {/* What will happen */}
        <div className="px-6 pb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t('auth.merge.whatHappensLabel')}
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            {googleAccount.avatarUrl && (
              <li className="flex items-start gap-2">
                <ImageIcon className="h-4 w-4 text-[#CFAF6E] flex-shrink-0 mt-0.5" />
                <span>{t('auth.merge.benefitAvatar')}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <GitMerge className="h-4 w-4 text-[#CFAF6E] flex-shrink-0 mt-0.5" />
              <span>{t('auth.merge.benefitGoogleLogin')}</span>
            </li>
            <li className="flex items-start gap-2">
              <UserCircle2 className="h-4 w-4 text-[#CFAF6E] flex-shrink-0 mt-0.5" />
              <span>{t('auth.merge.benefitSingleAccount')}</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleMerge}
            disabled={isMerging}
            className="w-full flex items-center justify-center gap-2 h-11 px-4 bg-[#CFAF6E] text-white text-sm font-semibold rounded-xl hover:bg-[#B89655] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isMerging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="h-4 w-4" />
            )}
            {isMerging ? t('common.loading') : t('auth.merge.confirmButton')}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isMerging}
            className="w-full h-11 px-4 border border-gray-300 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {t('auth.merge.skipButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

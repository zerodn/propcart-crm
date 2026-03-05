'use client';

import { Mail } from 'lucide-react';
import { useInvitations } from '@/hooks/use-invitations';
import { InvitationCard } from '@/components/invitation/invitation-card';

export default function InvitationsPage() {
  const { invitations, isLoading, error, refetch } = useInvitations();
  const pending = invitations.filter((i) => i.status === 0 && new Date(i.expiresAt) > new Date());
  const history = invitations.filter((i) => !(i.status === 0 && new Date(i.expiresAt) > new Date()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Lời mời</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Lời mời tham gia workspace của bạn
          {pending.length > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-40" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && invitations.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Mail className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Không có lời mời nào</p>
          <p className="text-sm mt-1">Khi được mời vào workspace, lời mời sẽ xuất hiện ở đây</p>
        </div>
      )}

      {!isLoading && invitations.length > 0 && (
        <>
          {pending.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Lời mời đang chờ</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map((inv) => (
                  <InvitationCard key={inv.id} invitation={inv} onUpdate={refetch} />
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mt-6 mb-2">Lịch sử lời mời</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((inv) => (
                  <InvitationCard key={inv.id} invitation={inv} onUpdate={refetch} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

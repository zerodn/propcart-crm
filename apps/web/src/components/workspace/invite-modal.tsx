'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Loader2, X } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

const INVITABLE_ROLES = [
  { code: 'ADMIN', label: 'Quản trị viên' },
  { code: 'MANAGER', label: 'Quản lý' },
  { code: 'SALES', label: 'Kinh doanh' },
  { code: 'PARTNER', label: 'Đối tác' },
];

interface InviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const { workspace } = useAuth();
  const [phone, setPhone] = useState('');
  const [roleCode, setRoleCode] = useState('SALES');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !workspace?.id) return;

    setIsLoading(true);
    try {
      await apiClient.post(`/workspaces/${workspace.id}/invitations`, {
        phone: phone.trim(),
        role_code: roleCode,
      });
      toast.success(`Đã gửi lời mời đến ${phone}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'MEMBER_ALREADY_EXISTS') toast.error('Người dùng đã là thành viên');
      else if (code === 'INVITATION_ALREADY_PENDING') toast.error('Lời mời đã tồn tại');
      else if (code === 'ROLE_NOT_FOUND') toast.error('Vai trò không hợp lệ');
      else toast.error('Không thể gửi lời mời');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Mời thành viên</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
            <input
              type="tel"
              placeholder="+84901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Vai trò</label>
            <select
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {INVITABLE_ROLES.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !phone.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Đang gửi...' : 'Gửi lời mời'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

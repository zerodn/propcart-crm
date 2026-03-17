'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface MemberAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  availableRoles?: Array<{ id: string; code: string; name: string }> | null;
}

export function MemberAddDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  availableRoles = [],
}: MemberAddDialogProps) {
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [contractType, setContractType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hdldOptions, setHdldOptions] = useState<Array<{ value: string; label: string }>>([]);

  const rolesArray = Array.isArray(availableRoles) ? availableRoles : [];

  // Set default role when roles load
  useEffect(() => {
    if (rolesArray.length > 0 && !roleId) {
      const salesRole = rolesArray.find((r) => r.code === 'SALES');
      setRoleId(salesRole?.id || rolesArray[0].id);
    }
  }, [rolesArray]);

  // Load HDLD_TYPE catalog options
  useEffect(() => {
    const loadHdldOptions = async () => {
      try {
        const { data } = await apiClient.get(`/workspaces/${workspaceId}/catalogs?type=HDLD_TYPE`);
        const catalogs = Array.isArray(data?.data) ? data.data : [];
        const hdldCatalog = catalogs.find((c: Record<string, unknown>) => c.code === 'HDLD_TYPE');
        if (hdldCatalog && Array.isArray((hdldCatalog as Record<string, unknown>).values)) {
          const values = (hdldCatalog as { values: Array<{ value: string; label: string }> }).values;
          setHdldOptions(values.map((v) => ({ value: v.value, label: v.label })));
        }
      } catch {
        setHdldOptions([]);
      }
    };
    if (workspaceId) loadHdldOptions();
  }, [workspaceId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setDisplayName('');
      setWorkspaceEmail('');
      setContractType('');
      if (rolesArray.length > 0) {
        const salesRole = rolesArray.find((r) => r.code === 'SALES');
        setRoleId(salesRole?.id || rolesArray[0].id);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }
    if (!roleId) {
      toast.error('Vui lòng chọn vai trò');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/members`, {
        phone: phone.trim(),
        roleId,
        displayName: displayName.trim() || undefined,
        workspaceEmail: workspaceEmail.trim() || undefined,
        contractType: contractType || undefined,
      });
      toast.success('Đã thêm nhân sự thành công');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { code?: string; message?: string } } };
      const code = apiError.response?.data?.code;
      if (code === 'EMAIL_ALREADY_EXISTS') {
        toast.error(apiError.response?.data?.message || 'Email này đã được sử dụng bởi tài khoản khác');
      } else if (code === 'ALREADY_MEMBER') {
        toast.error(apiError.response?.data?.message || 'SĐT này đã là thành viên của workspace');
      } else {
        toast.error(apiError.response?.data?.message || 'Không thể thêm nhân sự');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm nhân sự"
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="member-add-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Thêm nhân sự
          </button>
        </>
      }
    >
      <form id="member-add-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            Nhập số điện thoại nhân sự. Nếu chưa có tài khoản, hệ thống sẽ tự động tạo và thêm vào workspace.
          </p>
        </div>

        {/* Phone — required */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Số điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nhập số điện thoại đăng ký tài khoản"
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoFocus
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên hiển thị</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Để trống dùng tên tài khoản"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email trong workspace
            </label>
            <input
              type="email"
              value={workspaceEmail}
              onChange={(e) => setWorkspaceEmail(e.target.value)}
              placeholder="Email làm việc (không bắt buộc)"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
            >
              {rolesArray.length === 0 && <option value="">Đang tải vai trò...</option>}
              {rolesArray.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contract type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hợp đồng lao động
            </label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
            >
              <option value="">-- Chọn loại hợp đồng --</option>
              {hdldOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Mã nhân viên sẽ được tự động tạo. Nếu SĐT chưa có tài khoản, tài khoản mới sẽ được khởi tạo tự động.
        </p>
      </form>
    </BaseDialog>
  );
}

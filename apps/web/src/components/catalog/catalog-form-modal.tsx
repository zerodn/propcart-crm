'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';
import { useAuth } from '../../providers/auth-provider';

interface Catalog {
  id: string;
  type: string;
  code: string;
  name: string;
  values?: Array<any>;
}

interface Props {
  catalog?: Catalog | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CatalogFormModal({ catalog, onClose, onSuccess }: Props) {
  const { workspace } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CUSTOM',
    code: '',
    name: '',
  });

  useEffect(() => {
    if (catalog) {
      setFormData({
        type: catalog.type || 'CUSTOM',
        code: catalog.code || '',
        name: catalog.name || '',
      });
    }
  }, [catalog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;

    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      if (catalog?.id) {
        // Update existing
        await apiClient.patch(
          `/workspaces/${workspace.id}/catalogs/${catalog.id}`,
          formData
        );
        toast.success('Danh mục cập nhật thành công');
      } else {
        // Create new
        await apiClient.post(
          `/workspaces/${workspace.id}/catalogs`,
          formData
        );
        toast.success('Danh mục tạo thành công');
      }
      onSuccess();
    } catch (err: any) {
      console.error('Form submission error:', err);
      toast.error(err.response?.data?.message || 'Không thể lưu danh mục');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {catalog ? 'Sửa danh mục' : 'Tạo danh mục mới'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại danh mục
            </label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CUSTOM">Tùy chỉnh</option>
              <option value="ROLE">Vai trò</option>
              <option value="DEPARTMENT">Phòng ban</option>
              <option value="PROPERTY_TYPE">Loại bất động sản</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã danh mục *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              placeholder="VD: ROLE, DEPARTMENT"
              disabled={!!catalog}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên danh mục *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Vai trò nhân viên"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

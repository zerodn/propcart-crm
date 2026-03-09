'use client';

import { useState, useEffect } from 'react';
import { BaseDialog } from '@/components/common/base-dialog';
import { useI18n } from '@/providers/i18n-provider';
import { PropertyWarehouse } from '@/hooks/use-warehouse';

interface WarehouseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  warehouseTypes: Array<{ value: string; label: string }>;
  editingWarehouse?: PropertyWarehouse;
  isSubmitting?: boolean;
}

export function WarehouseForm({
  isOpen,
  onClose,
  onSubmit,
  warehouseTypes,
  editingWarehouse,
  isSubmitting = false,
}: WarehouseFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: '',
    code: '',
    type: '',
    description: '',
    status: 1,
    latitude: '',
    longitude: '',
    provinceCode: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
    fullAddress: '',
  });

  useEffect(() => {
    if (editingWarehouse) {
      setForm({
        name: editingWarehouse.name || '',
        code: editingWarehouse.code || '',
        type: editingWarehouse.type || '',
        description: editingWarehouse.description || '',
        status: editingWarehouse.status,
        latitude: editingWarehouse.latitude?.toString() || '',
        longitude: editingWarehouse.longitude?.toString() || '',
        provinceCode: editingWarehouse.provinceCode || '',
        provinceName: editingWarehouse.provinceName || '',
        wardCode: editingWarehouse.wardCode || '',
        wardName: editingWarehouse.wardName || '',
        fullAddress: editingWarehouse.fullAddress || '',
      });
    } else {
      setForm({
        name: '',
        code: '',
        type: '',
        description: '',
        status: 1,
        latitude: '',
        longitude: '',
        provinceCode: '',
        provinceName: '',
        wardCode: '',
        wardName: '',
        fullAddress: '',
      });
    }
  }, [editingWarehouse, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      code: form.code,
      type: form.type,
      description: form.description || undefined,
      status: form.status,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      provinceCode: form.provinceCode || undefined,
      provinceName: form.provinceName || undefined,
      wardCode: form.wardCode || undefined,
      wardName: form.wardName || undefined,
      fullAddress: form.fullAddress || undefined,
    };
    
    // Remove undefined values for cleaner request
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) delete data[key];
    });
    
    console.log('Warehouse form data:', data);
    await onSubmit(data);
  };

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title={editingWarehouse ? 'Chỉnh sửa kho hàng' : 'Tạo kho hàng'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên kho *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Kho hàng chính"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mã kho *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: WH001"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Loại kho *</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Chọn loại kho --</option>
            {warehouseTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mô tả chi tiết kho hàng..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vĩ độ</label>
            <input
              type="number"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              step="0.000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10.776589"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kinh độ</label>
            <input
              type="number"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              step="0.000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="106.696721"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh thành phố</label>
          <input
            type="text"
            value={form.provinceName}
            onChange={(e) => setForm({ ...form, provinceName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="VD: Hồ Chí Minh"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phường/Xã</label>
          <input
            type="text"
            value={form.wardName}
            onChange={(e) => setForm({ ...form, wardName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="VD: Phường 1"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ đầy đủ</label>
          <input
            type="text"
            value={form.fullAddress}
            onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="VD: 123 Nguyễn Hữu Cảnh..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Hoạt động</option>
            <option value={0}>Tạm dừng</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </BaseDialog>
  );
}

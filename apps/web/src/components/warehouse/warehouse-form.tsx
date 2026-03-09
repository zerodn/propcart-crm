'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/providers/i18n-provider';
import { PropertyWarehouse } from '@/hooks/use-warehouse';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';

interface WarehouseFormProps {
  onSubmit: (data: any) => Promise<void>;
  warehouseTypes: Array<{ value: string; label: string }>;
  editingWarehouse?: PropertyWarehouse;
  isSubmitting?: boolean;
  formId?: string;
}

export function WarehouseForm({
  onSubmit,
  warehouseTypes,
  editingWarehouse,
  isSubmitting = false,
  formId = 'warehouse-form',
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
    fullAddress: '',
  });

  const [locationData, setLocationData] = useState<LocationFormData>({
    provinceCode: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
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
        fullAddress: editingWarehouse.fullAddress || '',
      });
      setLocationData({
        provinceCode: editingWarehouse.provinceCode || '',
        provinceName: editingWarehouse.provinceName || '',
        wardCode: editingWarehouse.wardCode || '',
        wardName: editingWarehouse.wardName || '',
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
        fullAddress: '',
      });
      setLocationData({
        provinceCode: '',
        provinceName: '',
        wardCode: '',
        wardName: '',
      });
    }
  }, [editingWarehouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only send fields that backend expects
    const data: any = {
      name: form.name.trim(),
      code: form.code.trim(),
      type: form.type.trim(),
    };
    
    // Add optional fields only if they have values
    if (form.description?.trim()) data.description = form.description.trim();
    if (form.latitude) data.latitude = parseFloat(form.latitude);
    if (form.longitude) data.longitude = parseFloat(form.longitude);
    
    // Location data from PersonalInfoForm
    if (locationData.provinceCode) data.provinceCode = locationData.provinceCode;
    if (locationData.provinceName) data.provinceName = locationData.provinceName;
    if (locationData.wardCode) data.wardCode = locationData.wardCode;
    if (locationData.wardName) data.wardName = locationData.wardName;
    
    if (form.fullAddress?.trim()) data.fullAddress = form.fullAddress.trim();
    
    console.log('Warehouse form data to send:', data);
    await onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tên kho *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">-- Chọn loại kho --</option>
          {warehouseTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Vĩ độ</label>
          <input
            type="number"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            step="0.000001"
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="106.696721"
          />
        </div>
      </div>

      {/* Location Selection */}
      <div>
        <PersonalInfoForm
          data={locationData}
          onChange={setLocationData}
          isDisabled={isSubmitting}
          hideHeader={true}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ</label>
        <input
          type="text"
          value={form.fullAddress}
          onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="VD: 123 Nguyễn Hữu Cảnh..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value={1}>Hoạt động</option>
          <option value={0}>Tạm dừng</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="Mô tả chi tiết kho hàng..."
          rows={3}
        />
      </div>
    </form>
  );
}

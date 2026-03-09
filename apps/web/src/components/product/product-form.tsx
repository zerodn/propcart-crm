'use client';

import { useEffect, useState } from 'react';
import { PropertyProduct } from '@/hooks/use-product';

interface ProductFormProps {
  onSubmit: (data: any) => Promise<void>;
  editingProduct?: PropertyProduct;
  warehouseOptions: Array<{ value: string; label: string }>;
  isSubmitting?: boolean;
  formId?: string;
}

export function ProductForm({
  onSubmit,
  editingProduct,
  warehouseOptions,
  isSubmitting = false,
  formId = 'product-form',
}: ProductFormProps) {
  const [form, setForm] = useState({
    propertyType: '',
    zone: '',
    block: '',
    unitCode: '',
    direction: '',
    area: '',
    warehouseId: '',
    priceWithoutVat: '',
    priceWithVat: '',
    promotionProgram: '',
    priceSheetUrl: '',
    salesPolicyUrl: '',
    layoutPlanUrl: '',
    cartLink: '',
    callPhone: '',
    zaloPhone: '',
    transactionStatus: 'AVAILABLE',
    note: '',
    isInterested: false,
    isShared: false,
  });

  useEffect(() => {
    if (editingProduct) {
      setForm({
        propertyType: editingProduct.propertyType || '',
        zone: editingProduct.zone || '',
        block: editingProduct.block || '',
        unitCode: editingProduct.unitCode || '',
        direction: editingProduct.direction || '',
        area: editingProduct.area?.toString() || '',
        warehouseId: editingProduct.warehouseId || '',
        priceWithoutVat: editingProduct.priceWithoutVat?.toString() || '',
        priceWithVat: editingProduct.priceWithVat?.toString() || '',
        promotionProgram: editingProduct.promotionProgram || '',
        priceSheetUrl: editingProduct.priceSheetUrl || '',
        salesPolicyUrl: editingProduct.salesPolicyUrl || '',
        layoutPlanUrl: editingProduct.layoutPlanUrl || '',
        cartLink: editingProduct.cartLink || '',
        callPhone: editingProduct.callPhone || '',
        zaloPhone: editingProduct.zaloPhone || '',
        transactionStatus: editingProduct.transactionStatus || 'AVAILABLE',
        note: editingProduct.note || '',
        isInterested: !!editingProduct.isInterested,
        isShared: !!editingProduct.isShared,
      });
      return;
    }

    setForm({
      propertyType: '',
      zone: '',
      block: '',
      unitCode: '',
      direction: '',
      area: '',
      warehouseId: '',
      priceWithoutVat: '',
      priceWithVat: '',
      promotionProgram: '',
      priceSheetUrl: '',
      salesPolicyUrl: '',
      layoutPlanUrl: '',
      cartLink: '',
      callPhone: '',
      zaloPhone: '',
      transactionStatus: 'AVAILABLE',
      note: '',
      isInterested: false,
      isShared: false,
    });
  }, [editingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      propertyType: form.propertyType.trim(),
      unitCode: form.unitCode.trim(),
      warehouseId: form.warehouseId,
      transactionStatus: form.transactionStatus,
      isInterested: form.isInterested,
      isShared: form.isShared,
    };

    if (form.zone.trim()) data.zone = form.zone.trim();
    if (form.block.trim()) data.block = form.block.trim();
    if (form.direction.trim()) data.direction = form.direction.trim();
    if (form.area) data.area = parseFloat(form.area);
    if (form.priceWithoutVat) data.priceWithoutVat = parseFloat(form.priceWithoutVat);
    if (form.priceWithVat) data.priceWithVat = parseFloat(form.priceWithVat);
    if (form.promotionProgram.trim()) data.promotionProgram = form.promotionProgram.trim();
    if (form.priceSheetUrl.trim()) data.priceSheetUrl = form.priceSheetUrl.trim();
    if (form.salesPolicyUrl.trim()) data.salesPolicyUrl = form.salesPolicyUrl.trim();
    if (form.layoutPlanUrl.trim()) data.layoutPlanUrl = form.layoutPlanUrl.trim();
    if (form.cartLink.trim()) data.cartLink = form.cartLink.trim();
    if (form.callPhone.trim()) data.callPhone = form.callPhone.trim();
    if (form.zaloPhone.trim()) data.zaloPhone = form.zaloPhone.trim();
    if (form.note.trim()) data.note = form.note.trim();

    await onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Loại hình BĐS *</label>
          <input
            type="text"
            value={form.propertyType}
            onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="VD: Căn hộ"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mã căn *</label>
          <input
            type="text"
            value={form.unitCode}
            onChange={(e) => setForm({ ...form, unitCode: e.target.value })}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="VD: A1-1208"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phân khu</label>
          <input
            type="text"
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Dãy / Block</label>
          <input
            type="text"
            value={form.block}
            onChange={(e) => setForm({ ...form, block: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hướng</label>
          <input
            type="text"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Diện tích (m2)</label>
          <input
            type="number"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Kho hàng *</label>
          <select
            value={form.warehouseId}
            onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">-- Chọn kho --</option>
            {warehouseOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Giá bán chưa VAT</label>
          <input
            type="number"
            value={form.priceWithoutVat}
            onChange={(e) => setForm({ ...form, priceWithoutVat: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Giá bán gồm VAT</label>
          <input
            type="number"
            value={form.priceWithVat}
            onChange={(e) => setForm({ ...form, priceWithVat: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Chương trình ưu đãi</label>
        <textarea
          value={form.promotionProgram}
          onChange={(e) => setForm({ ...form, promotionProgram: e.target.value })}
          disabled={isSubmitting}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phiếu tính giá (URL)</label>
          <input
            type="url"
            value={form.priceSheetUrl}
            onChange={(e) => setForm({ ...form, priceSheetUrl: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Chính sách bán hàng (URL)</label>
          <input
            type="url"
            value={form.salesPolicyUrl}
            onChange={(e) => setForm({ ...form, salesPolicyUrl: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mặt bằng căn (URL)</label>
          <input
            type="url"
            value={form.layoutPlanUrl}
            onChange={(e) => setForm({ ...form, layoutPlanUrl: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Quản lý giỏ hàng (Link)</label>
          <input
            type="url"
            value={form.cartLink}
            onChange={(e) => setForm({ ...form, cartLink: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Call</label>
          <input
            type="text"
            value={form.callPhone}
            onChange={(e) => setForm({ ...form, callPhone: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Zalo</label>
          <input
            type="text"
            value={form.zaloPhone}
            onChange={(e) => setForm({ ...form, zaloPhone: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái giao dịch</label>
          <select
            value={form.transactionStatus}
            onChange={(e) => setForm({ ...form, transactionStatus: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="AVAILABLE">Chưa book</option>
            <option value="BOOKED">Book căn</option>
          </select>
        </div>
        <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isInterested}
            onChange={(e) => setForm({ ...form, isInterested: e.target.checked })}
            disabled={isSubmitting}
          />
          Quan tâm
        </label>
        <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isShared}
            onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
            disabled={isSubmitting}
          />
          Chia sẻ sản phẩm
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          disabled={isSubmitting}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
    </form>
  );
}

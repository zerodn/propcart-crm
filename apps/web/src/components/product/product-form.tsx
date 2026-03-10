'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { PropertyProduct, ProductDocument } from '@/hooks/use-product';

interface ProductFormProps {
  onSubmit: (data: any) => Promise<void>;
  onUploadFiles: (files: File[]) => Promise<Array<{ fileName: string; fileUrl: string }>>;
  editingProduct?: PropertyProduct;
  warehouseOptions: Array<{ value: string; label: string }>;
  directionOptions: Array<{ value: string; label: string }>;
  transactionStatusOptions: Array<{ value: string; label: string }>;
  memberOptions: Array<{ value: string; label: string }>;
  isSubmitting?: boolean;
  formId?: string;
}

const DOCUMENT_TYPES = [
  { value: 'PRICE_SHEET', label: 'Phieu tinh gia' },
  { value: 'SALES_POLICY', label: 'Chinh sach ban hang' },
  { value: 'LAYOUT_PLAN', label: 'Mat bang can' },
];

function toCurrencyInput(value?: number) {
  if (value === undefined || value === null) return '';
  return new Intl.NumberFormat('vi-VN').format(value);
}

function parseCurrencyInput(value: string) {
  const numeric = value.replace(/[^\d]/g, '');
  return numeric ? Number(numeric) : undefined;
}

function formatCurrencyInput(value: string) {
  const numeric = value.replace(/[^\d]/g, '');
  if (!numeric) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(numeric));
}

export function ProductForm({
  onSubmit,
  onUploadFiles,
  editingProduct,
  warehouseOptions,
  directionOptions,
  transactionStatusOptions,
  memberOptions,
  isSubmitting = false,
  formId = 'product-form',
}: ProductFormProps) {
  const [form, setForm] = useState({
    name: '',
    unitCode: '',
    warehouseId: '',
    propertyType: '',
    zone: '',
    block: '',
    direction: '',
    area: '',
    priceWithoutVat: '',
    priceWithVat: '',
    promotionProgram: '',
    callPhone: '',
    zaloPhone: '',
    transactionStatus: '',
    note: '',
  });
  const [policyImageUrls, setPolicyImageUrls] = useState<string[]>([]);
  const [productDocuments, setProductDocuments] = useState<ProductDocument[]>([]);
  const [contactMemberIds, setContactMemberIds] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState('PRICE_SHEET');
  const [isUploadingPolicy, setIsUploadingPolicy] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name || '',
        unitCode: editingProduct.unitCode || '',
        warehouseId: editingProduct.warehouseId || '',
        propertyType: editingProduct.propertyType || '',
        zone: editingProduct.zone || '',
        block: editingProduct.block || '',
        direction: editingProduct.direction || '',
        area: editingProduct.area?.toString() || '',
        priceWithoutVat: toCurrencyInput(editingProduct.priceWithoutVat),
        priceWithVat: toCurrencyInput(editingProduct.priceWithVat),
        promotionProgram: editingProduct.promotionProgram || '',
        callPhone: editingProduct.callPhone || '',
        zaloPhone: editingProduct.zaloPhone || '',
        transactionStatus: editingProduct.transactionStatus || '',
        note: editingProduct.note || '',
      });
      setPolicyImageUrls(editingProduct.policyImageUrls || []);
      setProductDocuments(editingProduct.productDocuments || []);
      setContactMemberIds(editingProduct.contactMemberIds || []);
      return;
    }

    setForm({
      name: '',
      unitCode: '',
      warehouseId: '',
      propertyType: '',
      zone: '',
      block: '',
      direction: '',
      area: '',
      priceWithoutVat: '',
      priceWithVat: '',
      promotionProgram: '',
      callPhone: '',
      zaloPhone: '',
      transactionStatus: transactionStatusOptions[0]?.value || 'AVAILABLE',
      note: '',
    });
    setPolicyImageUrls([]);
    setProductDocuments([]);
    setContactMemberIds([]);
  }, [editingProduct, transactionStatusOptions]);

  const selectedMemberSet = useMemo(() => new Set(contactMemberIds), [contactMemberIds]);

  const handlePolicyUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploadingPolicy(true);
    try {
      const uploaded = await onUploadFiles(Array.from(files));
      setPolicyImageUrls((prev) => [...prev, ...uploaded.map((item) => item.fileUrl)]);
    } finally {
      setIsUploadingPolicy(false);
    }
  };

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploadingDocument(true);
    try {
      const uploaded = await onUploadFiles(Array.from(files));
      setProductDocuments((prev) => [
        ...prev,
        ...uploaded.map((item) => ({
          documentType,
          fileName: item.fileName,
          fileUrl: item.fileUrl,
        })),
      ]);
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      name: form.name.trim(),
      unitCode: form.unitCode.trim(),
      propertyType: form.propertyType.trim(),
      transactionStatus: form.transactionStatus,
      policyImageUrls,
      productDocuments,
      contactMemberIds,
    };

    if (form.warehouseId.trim()) data.warehouseId = form.warehouseId.trim();
    if (form.zone.trim()) data.zone = form.zone.trim();
    if (form.block.trim()) data.block = form.block.trim();
    if (form.direction.trim()) data.direction = form.direction.trim();
    if (form.area.trim()) data.area = Number(form.area);

    const priceWithoutVat = parseCurrencyInput(form.priceWithoutVat);
    const priceWithVat = parseCurrencyInput(form.priceWithVat);
    if (priceWithoutVat !== undefined) data.priceWithoutVat = priceWithoutVat;
    if (priceWithVat !== undefined) data.priceWithVat = priceWithVat;

    if (form.promotionProgram.trim()) data.promotionProgram = form.promotionProgram.trim();
    if (form.callPhone.trim()) data.callPhone = form.callPhone.trim();
    if (form.zaloPhone.trim()) data.zaloPhone = form.zaloPhone.trim();
    if (form.note.trim()) data.note = form.note.trim();

    await onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4 lg:col-span-2">
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">1. Thong tin san pham</h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kho hang</label>
              <select
                value={form.warehouseId}
                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- Chon kho --</option>
                {warehouseOptions.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ma san pham *</label>
                <input
                  type="text"
                  value={form.unitCode}
                  onChange={(e) => setForm({ ...form, unitCode: e.target.value })}
                  required
                  disabled={isSubmitting}
                  placeholder="VD: TK2-P01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ten san pham *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                  placeholder="VD: Can ho 2PN+ - Toa TK2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Loai hinh BDS *</label>
                <input
                  type="text"
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  required
                  disabled={isSubmitting}
                  placeholder="VD: Can ho chung cu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phan khu</label>
                <input
                  type="text"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Day / Block</label>
                <input
                  type="text"
                  value={form.block}
                  onChange={(e) => setForm({ ...form, block: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Huong</label>
                <select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">-- Chon huong --</option>
                  {directionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dien tich (m2)</label>
                <input
                  type="number"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">2. Thong tin gia</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gia ban chua VAT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.priceWithoutVat}
                  onChange={(e) =>
                    setForm({ ...form, priceWithoutVat: formatCurrencyInput(e.target.value) })
                  }
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gia ban gom VAT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.priceWithVat}
                  onChange={(e) => setForm({ ...form, priceWithVat: formatCurrencyInput(e.target.value) })}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">3. Chinh sach ban hang</h3>
            <textarea
              value={form.promotionProgram}
              onChange={(e) => setForm({ ...form, promotionProgram: e.target.value })}
              disabled={isSubmitting}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Mo ta chuong trinh uu dai"
            />
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer text-sm">
                {isUploadingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Tai len nhieu hinh anh chinh sach
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePolicyUpload(e.target.files)}
                  disabled={isSubmitting || isUploadingPolicy}
                />
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {policyImageUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative border rounded overflow-hidden">
                    <img src={url} alt="policy" className="w-full h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => setPolicyImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">5. Thong tin lien he</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">So dien thoai</label>
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

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nhan su lien he (chon nhieu)</label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {memberOptions.map((member) => (
                  <label key={member.value} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedMemberSet.has(member.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setContactMemberIds((prev) => [...prev, member.value]);
                        } else {
                          setContactMemberIds((prev) => prev.filter((id) => id !== member.value));
                        }
                      }}
                    />
                    {member.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">6. Trang thai giao dich</h3>
            <select
              value={form.transactionStatus}
              onChange={(e) => setForm({ ...form, transactionStatus: e.target.value })}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {transactionStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">7. Ghi chu</h3>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3 space-y-3 h-fit">
          <h3 className="text-sm font-semibold text-gray-900">4. Tai lieu san pham</h3>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {DOCUMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg cursor-pointer text-sm">
              {isUploadingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Tai tai lieu
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleDocumentUpload(e.target.files)}
                disabled={isSubmitting || isUploadingDocument}
              />
            </label>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {productDocuments.map((doc, idx) => (
              <div key={`${doc.fileUrl}-${idx}`} className="border border-gray-200 rounded-lg p-2 text-sm">
                <div className="font-medium text-gray-800">{doc.fileName}</div>
                <div className="text-xs text-gray-500">{doc.documentType}</div>
                <div className="mt-1 flex items-center gap-2">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">
                    Xem tai lieu
                  </a>
                  <button
                    type="button"
                    onClick={() => setProductDocuments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 text-xs"
                  >
                    Xoa
                  </button>
                </div>
              </div>
            ))}
            {!productDocuments.length && (
              <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg p-3 text-center">
                Chua co tai lieu nao
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

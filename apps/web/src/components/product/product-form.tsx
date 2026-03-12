'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Upload,
  X,
  ChevronDown,
  Check,
  Eye,
  Download,
  Trash2,
  Search,
} from 'lucide-react';
import { PropertyProduct, ProductDocument, ProductImageItem } from '@/hooks/use-product';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { BaseImagePreviewDialog } from '@/components/common/base-image-preview-dialog';
import { DocumentPreviewDialog } from '@/components/common/document-preview-dialog';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

interface MemberSearchItem {
  value: string;
  label: string;
  phone?: string;
  email?: string;
}

interface ProductDocumentWithSize extends ProductDocument {
  fileSize?: number;
}

interface ProductImageWithThumb extends ProductImageItem {
  originalFileName?: string;
  fileSize?: number;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface ProductFormProps {
  workspaceId: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onUploadFiles: (files: File[]) => Promise<Array<{ fileName: string; fileUrl: string }>>;
  editingProduct?: PropertyProduct;
  warehouseOptions: Array<{ value: string; label: string }>;
  propertyTypeOptions: Array<{ value: string; label: string }>;
  directionOptions: Array<{ value: string; label: string }>;
  transactionStatusOptions: Array<{ value: string; label: string }>;
  tagOptions: Array<{ value: string; label: string; color?: string }>;
  documentTypeOptions: Array<{ value: string; label: string }>;
  memberOptions: Array<{ value: string; label: string }>;
  isSubmitting?: boolean;
  formId?: string;
  isReadOnly?: boolean;
}

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

function inferMimeType(fileName?: string, fileUrl?: string) {
  const source = `${fileName || ''} ${fileUrl || ''}`.toLowerCase();

  if (source.includes('.pdf')) return 'application/pdf';
  if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.bmp|\.svg)/.test(source)) return 'image/*';

  return 'application/octet-stream';
}

export function ProductForm({
  workspaceId,
  onSubmit,
  onUploadFiles,
  editingProduct,
  warehouseOptions,
  propertyTypeOptions,
  directionOptions,
  transactionStatusOptions,
  tagOptions,
  documentTypeOptions,
  memberOptions,
  isSubmitting = false,
  formId = 'product-form',
  isReadOnly = false,
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
    isContactForPrice: false,
    isHidden: false,
    promotionProgram: '',
    callPhone: '',
    zaloPhone: '',
    transactionStatus: '',
    note: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<ProductImageWithThumb[]>([]);
  const [productDocuments, setProductDocuments] = useState<ProductDocumentWithSize[]>([]);
  const [contactMemberIds, setContactMemberIds] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [documentType, setDocumentType] = useState(documentTypeOptions[0]?.value || '');
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [memberKeyword, setMemberKeyword] = useState('');
  const [memberResults, setMemberResults] = useState<MemberSearchItem[]>([]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const [tagButtonWidth, setTagButtonWidth] = useState(0);

  const previewDocument = previewIndex !== null ? productDocuments[previewIndex] : null;
  const previewDocumentMimeType = inferMimeType(
    previewDocument?.fileName,
    previewDocument?.fileUrl,
  );
  const isPreviewingImageDocument = Boolean(
    previewDocument && previewDocumentMimeType.startsWith('image/'),
  );

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
        isContactForPrice: editingProduct.isContactForPrice || false,
        isHidden: editingProduct.isHidden || false,
        promotionProgram: editingProduct.promotionProgram || '',
        callPhone: editingProduct.callPhone || '',
        zaloPhone: editingProduct.zaloPhone || '',
        transactionStatus: editingProduct.transactionStatus || '',
        note: editingProduct.note || '',
      });
      setTags(editingProduct.tags || []);
      setProductImages(
        (editingProduct.policyImageUrls || []).map((item) => ({
          ...item,
          originalFileName: item.fileName || '',
          fileSize: undefined,
        })),
      );
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
      isContactForPrice: false,
      isHidden: false,
      promotionProgram: '',
      callPhone: '',
      zaloPhone: '',
      transactionStatus: transactionStatusOptions[0]?.value || 'AVAILABLE',
      note: '',
    });
    setTags([]);
    setProductImages([]);
    setProductDocuments([]);
    setContactMemberIds([]);
  }, [editingProduct, transactionStatusOptions]);

  const selectedMemberSet = useMemo(() => new Set(contactMemberIds), [contactMemberIds]);
  const selectedMemberLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of memberOptions) map.set(item.value, item.label);
    for (const item of memberResults) map.set(item.value, item.label);
    return map;
  }, [memberOptions, memberResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }

      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!workspaceId || isReadOnly || !isMemberDropdownOpen) {
      return;
    }

    const timer = setTimeout(async () => {
      const q = memberKeyword.trim();

      if (!q) {
        setMemberResults(
          memberOptions.slice(0, 20).map((item) => ({
            value: item.value,
            label: item.label,
          })),
        );
        return;
      }

      try {
        setIsSearchingMembers(true);
        const { data } = await apiClient.get(
          `/workspaces/${workspaceId}/departments/member-search`,
          {
            params: { q },
          },
        );

        const items = Array.isArray(data?.data) ? data.data : [];
        const mapped = items
          .map((item: { userId?: string; name?: string; phone?: string; email?: string }) => ({
            value: item.userId || '',
            label: item.name || item.phone || item.email || item.userId || 'N/A',
            phone: item.phone,
            email: item.email,
          }))
          .filter((item: MemberSearchItem) => Boolean(item.value));

        setMemberResults(mapped);
      } catch {
        setMemberResults([]);
      } finally {
        setIsSearchingMembers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [workspaceId, memberKeyword, memberOptions, isReadOnly, isMemberDropdownOpen]);

  const toggleContactMember = (userId: string) => {
    if (selectedMemberSet.has(userId)) {
      setContactMemberIds((prev) => prev.filter((id) => id !== userId));
      return;
    }

    setContactMemberIds((prev) => [...prev, userId]);
  };

  // Track combobox width to compute how many selected tags can be displayed.
  useEffect(() => {
    const button = tagButtonRef.current;
    if (!button) return;

    const updateWidth = () => setTagButtonWidth(button.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  const getTagOption = (tagValue: string) => {
    return tagOptions.find((opt) => opt.value === tagValue);
  };

  const getFirstTagColor = () => {
    if (!tags.length) return undefined;
    const firstTag = getTagOption(tags[0]);
    return firstTag?.color;
  };

  const toggleTag = (tagValue: string) => {
    if (tags.includes(tagValue)) {
      setTags((prev) => prev.filter((t) => t !== tagValue));
    } else {
      setTags((prev) => [...prev, tagValue]);
    }
  };

  const tagDisplay = useMemo(() => {
    if (!tags.length) return { visible: [] as string[], hiddenCount: 0 };

    // Keep space for chevron and button paddings.
    const available = Math.max(tagButtonWidth - 64, 120);
    const gap = 6;
    const removeIconWidth = 14;
    const badgePadding = 24;
    const plusBadgeBaseWidth = 42;

    let used = 0;
    const visible: string[] = [];

    for (let i = 0; i < tags.length; i += 1) {
      const tagValue = tags[i];
      const label = getTagOption(tagValue)?.label || tagValue;
      const estimatedBadgeWidth = Math.max(56, label.length * 7 + badgePadding + removeIconWidth);
      const remaining = tags.length - (i + 1);
      const reserveForPlus = remaining > 0 ? plusBadgeBaseWidth : 0;
      const nextUsed = used + (visible.length > 0 ? gap : 0) + estimatedBadgeWidth;

      // Always keep at least the first selected item visible.
      if (visible.length === 0) {
        visible.push(tagValue);
        used = nextUsed;
        continue;
      }

      if (nextUsed + reserveForPlus > available) break;

      visible.push(tagValue);
      used = nextUsed;
    }

    return {
      visible,
      hiddenCount: Math.max(tags.length - visible.length, 0),
    };
  }, [tags, tagButtonWidth, tagOptions]);

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploadingDocument(true);
    try {
      const fileArray = Array.from(files);
      const uploaded = await onUploadFiles(fileArray);
      setProductDocuments((prev) => [
        ...prev,
        ...uploaded.map((item, idx) => ({
          documentType,
          fileName: item.fileName,
          fileUrl: item.fileUrl,
          fileSize: fileArray[idx]?.size,
        })),
      ]);
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const createThumbnailFile = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    const imageBitmap = await createImageBitmap(file);
    const maxWidth = 480;
    const targetWidth = Math.min(maxWidth, imageBitmap.width);
    const ratio = targetWidth / imageBitmap.width;
    const targetHeight = Math.max(1, Math.round(imageBitmap.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      imageBitmap.close();
      throw new Error('Khong the tao thumbnail');
    }

    context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    imageBitmap.close();

    const thumbBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Khong the xuat thumbnail'));
            return;
          }
          resolve(blob);
        },
        'image/webp',
        0.78,
      );
    });

    return new File([thumbBlob], `thumb-${Date.now()}-${index}.webp`, { type: 'image/webp' });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const originalFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!originalFiles.length) return;

    setIsUploadingImages(true);
    try {
      const thumbnailFiles = await Promise.all(
        originalFiles.map((file, idx) => createThumbnailFile(file, idx)),
      );

      const [uploadedOriginals, uploadedThumbs] = await Promise.all([
        onUploadFiles(originalFiles),
        onUploadFiles(thumbnailFiles),
      ]);

      setProductImages((prev) => [
        ...prev,
        ...uploadedOriginals.map((item, idx) => ({
          fileName: originalFiles[idx]?.name || item.fileName,
          originalFileName: originalFiles[idx]?.name || item.fileName,
          originalUrl: item.fileUrl,
          thumbnailUrl: uploadedThumbs[idx]?.fileUrl || item.fileUrl,
          fileSize: originalFiles[idx]?.size,
        })),
      ]);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleDocumentTypeChange = (idx: number, newType: string) => {
    setProductDocuments((prev) =>
      prev.map((doc, i) => (i === idx ? { ...doc, documentType: newType } : doc)),
    );
  };

  const triggerDownload = (url: string, fileName?: string) => {
    const link = document.createElement('a');
    link.href = url;
    if (fileName) {
      link.download = fileName;
    }
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const extractExtension = (fileName?: string, fileUrl?: string) => {
    const fromName = (fileName || '').trim();
    const lastDotFromName = fromName.lastIndexOf('.');
    if (lastDotFromName > 0 && lastDotFromName < fromName.length - 1) {
      return fromName.slice(lastDotFromName + 1).toLowerCase();
    }

    if (!fileUrl) return '';

    try {
      const path = new URL(fileUrl).pathname;
      const basename = path.split('/').pop() || '';
      const lastDot = basename.lastIndexOf('.');
      if (lastDot > 0 && lastDot < basename.length - 1) {
        return basename.slice(lastDot + 1).toLowerCase();
      }
    } catch {
      const cleanedUrl = fileUrl.split('?')[0].split('#')[0];
      const basename = cleanedUrl.split('/').pop() || '';
      const lastDot = basename.lastIndexOf('.');
      if (lastDot > 0 && lastDot < basename.length - 1) {
        return basename.slice(lastDot + 1).toLowerCase();
      }
    }

    return '';
  };

  const buildObfuscatedFileName = (fileName?: string, fileUrl?: string) => {
    const ext = extractExtension(fileName, fileUrl);
    const randomToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return ext ? `tai-lieu-${randomToken}.${ext}` : `tai-lieu-${randomToken}`;
  };

  const handleDownloadDocument = async (fileUrl?: string, fileName?: string) => {
    if (!fileUrl) return;

    const obfuscatedFileName = buildObfuscatedFileName(fileName, fileUrl);

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl, obfuscatedFileName);

      // Delay revoke so browser has enough time to start download.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Fallback when fetch/CORS fails: still try browser download directly.
      triggerDownload(fileUrl, obfuscatedFileName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: Record<string, unknown> = {
      name: form.name.trim(),
      unitCode: form.unitCode.trim(),
      propertyType: form.propertyType.trim(),
      transactionStatus: form.transactionStatus,
      isContactForPrice: form.isContactForPrice,
      isHidden: form.isHidden,
      tags,
      policyImageUrls: productImages.map((img) => ({
        fileName: img.fileName || img.originalFileName || '',
        originalUrl: img.originalUrl,
        thumbnailUrl: img.thumbnailUrl || img.originalUrl,
      })),
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
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="space-y-4 lg:col-span-6">
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Thông tin sản phẩm</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ma san pham *
                </label>
                <input
                  type="text"
                  value={form.unitCode}
                  onChange={(e) => setForm({ ...form, unitCode: e.target.value })}
                  required
                  disabled={isSubmitting || isReadOnly}
                  placeholder="VD: TK2-P01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ten san pham *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={isSubmitting || isReadOnly}
                  placeholder="VD: Can ho 2PN+ - Toa TK2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Loai hinh BDS *
                </label>
                <select
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  required
                  disabled={isSubmitting || isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">-- Chon loai hinh --</option>
                  {propertyTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phan khu</label>
                <input
                  type="text"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  disabled={isSubmitting || isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Day / Block</label>
                <input
                  type="text"
                  value={form.block}
                  onChange={(e) => setForm({ ...form, block: e.target.value })}
                  disabled={isSubmitting || isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Huong</label>
                <select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  disabled={isSubmitting || isReadOnly}
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
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Trang thai giao dich
                </label>
                <select
                  value={form.transactionStatus}
                  onChange={(e) => setForm({ ...form, transactionStatus: e.target.value })}
                  disabled={isSubmitting || isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {transactionStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kho hang</label>
                <select
                  value={form.warehouseId}
                  onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                  disabled={isSubmitting || isReadOnly}
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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nhan san pham
                </label>
                <div className="relative" ref={tagDropdownRef}>
                  <button
                    ref={tagButtonRef}
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    disabled={isSubmitting || isReadOnly || tagOptions.length === 0}
                    className="w-full min-h-[40px] px-3 py-2 border-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2"
                    style={
                      tags.length > 0 && getFirstTagColor()
                        ? {
                            borderColor: getFirstTagColor(),
                            backgroundColor: `${getFirstTagColor()}08`,
                          }
                        : {
                            borderColor: '#d1d5db',
                          }
                    }
                  >
                    <div className="flex-1 flex flex-wrap gap-1 items-center">
                      {tags.length > 0 ? (
                        tagDisplay.visible.map((tag) => {
                          const tagOption = getTagOption(tag);
                          return (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded-full border flex-shrink-0"
                              style={
                                tagOption?.color
                                  ? {
                                      backgroundColor: `${tagOption.color}20`,
                                      borderColor: tagOption.color,
                                      color: tagOption.color,
                                    }
                                  : {
                                      backgroundColor: '#eff6ff',
                                      borderColor: '#3b82f6',
                                      color: '#3b82f6',
                                    }
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {tagOption?.label || tag}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTags((prev) => prev.filter((t) => t !== tag));
                                }}
                                className="rounded-full hover:bg-black/10 p-0.5"
                                aria-label={`Xoa nhan ${tagOption?.label || tag}`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-gray-500">
                          {tagOptions.length > 0 ? 'Chon nhan' : 'Chua co nhan'}
                        </span>
                      )}
                      {tagDisplay.hiddenCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-gray-300 bg-gray-100 text-gray-600 flex-shrink-0">
                          +{tagDisplay.hiddenCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  </button>

                  {isTagDropdownOpen && tagOptions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {tagOptions.map((tag) => {
                        const isChecked = tags.includes(tag.value);
                        return (
                          <label
                            key={tag.value}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTag(tag.value)}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                  isChecked ? 'border-current' : 'border-gray-300'
                                }`}
                                style={
                                  isChecked && tag.color
                                    ? {
                                        borderColor: tag.color,
                                        backgroundColor: tag.color,
                                      }
                                    : {}
                                }
                              >
                                {isChecked && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                            <span
                              className="flex-1 text-sm"
                              style={
                                isChecked && tag.color
                                  ? {
                                      color: tag.color,
                                      fontWeight: 500,
                                    }
                                  : {}
                              }
                            >
                              {tag.label}
                            </span>
                            {tag.color && (
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{
                                  backgroundColor: tag.color,
                                  borderColor: tag.color,
                                }}
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Giá giao dịch</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gia truoc VAT (chua gom VAT)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 5,000,000"
                  value={form.priceWithoutVat}
                  onChange={(e) =>
                    setForm({ ...form, priceWithoutVat: formatCurrencyInput(e.target.value) })
                  }
                  disabled={isSubmitting || isReadOnly || form.isContactForPrice}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gia sau VAT (da gom VAT)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 5,500,000"
                  value={form.priceWithVat}
                  onChange={(e) =>
                    setForm({ ...form, priceWithVat: formatCurrencyInput(e.target.value) })
                  }
                  disabled={isSubmitting || isReadOnly || form.isContactForPrice}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Dien tich (m2)
                </label>
                <input
                  type="number"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  disabled={isSubmitting || isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isContactForPrice}
                  onChange={(e) => setForm({ ...form, isContactForPrice: e.target.checked })}
                  disabled={isSubmitting || isReadOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Lien he (khong hien thi gia)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isHidden}
                  onChange={(e) => setForm({ ...form, isHidden: e.target.checked })}
                  disabled={isSubmitting || isReadOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Sản phẩm ẩn</span>
              </label>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Giới thiệu sản phẩm</h3>
            <RichTextEditor
              value={form.note}
              onChange={(value) => setForm({ ...form, note: value })}
              minHeight="200px"
              disabled={isSubmitting || isReadOnly}
            />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 h-fit">
            <h3 className="text-sm font-semibold text-gray-900">Hình ảnh sản phẩm</h3>
            <label
              className={cn(
                'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm w-full',
                isSubmitting || isReadOnly || isUploadingImages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-700 cursor-pointer',
              )}
            >
              {isUploadingImages ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Tải hình ảnh sản phẩm
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
                disabled={isSubmitting || isReadOnly || isUploadingImages}
              />
            </label>

            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {productImages.map((image, idx) => (
                <div
                  key={`${image.originalUrl}-${idx}`}
                  className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-3"
                >
                  <img
                    src={image.thumbnailUrl || image.originalUrl}
                    alt={image.fileName || `Hinh ${idx + 1}`}
                    className="h-14 w-14 rounded object-cover border border-gray-200 bg-gray-50"
                  />

                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium text-gray-800 text-sm truncate"
                      title={image.fileName || image.originalFileName}
                    >
                      {image.fileName || image.originalFileName || `Hình ${idx + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatFileSize(image.fileSize)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImageIndex(idx);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Xem ảnh"
                      disabled={!image.originalUrl}
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadDocument(
                          image.originalUrl,
                          image.fileName || image.originalFileName,
                        )
                      }
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Tải ảnh gốc"
                      disabled={!image.originalUrl}
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProductImages((prev) =>
                          prev.filter((_, imageIndex) => imageIndex !== idx),
                        )
                      }
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Xóa"
                      disabled={isSubmitting || isReadOnly}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}

              {!productImages.length && (
                <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg p-3 text-center">
                  Chưa có hình ảnh sản phẩm
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3 h-fit">
            <h3 className="text-sm font-semibold text-gray-900">Tài liệu sản phẩm</h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={isSubmitting || isReadOnly}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {documentTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <label
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                  isSubmitting || isReadOnly || isUploadingDocument
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-700 cursor-pointer',
                )}
              >
                {isUploadingDocument ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Tai tai lieu
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleDocumentUpload(e.target.files)}
                  disabled={isSubmitting || isReadOnly || isUploadingDocument}
                />
              </label>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {productDocuments.map((doc, idx) => (
                <div
                  key={`${doc.fileUrl}-${idx}`}
                  className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-3"
                >
                  {/* Left: File name & size */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium text-gray-800 text-sm truncate"
                      title={doc.fileName}
                    >
                      {doc.fileName}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatFileSize(doc.fileSize)}
                    </div>
                  </div>

                  {/* Right: Document type dropdown */}
                  <select
                    value={doc.documentType}
                    onChange={(e) => handleDocumentTypeChange(idx, e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white min-w-[130px]"
                    disabled={isSubmitting || isReadOnly}
                  >
                    {documentTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  {/* Action icons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Xem"
                      disabled={isSubmitting || isReadOnly}
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc.fileUrl, doc.fileName)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Tải xuống"
                      disabled={!doc.fileUrl}
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmIdx(idx)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Xóa"
                      disabled={isSubmitting || isReadOnly}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
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

            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Thông tin liên hệ</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    So dien thoai
                  </label>
                  <input
                    type="text"
                    value={form.callPhone}
                    onChange={(e) => setForm({ ...form, callPhone: e.target.value })}
                    disabled={isSubmitting || isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Zalo</label>
                  <input
                    type="text"
                    value={form.zaloPhone}
                    onChange={(e) => setForm({ ...form, zaloPhone: e.target.value })}
                    disabled={isSubmitting || isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chọn nhân sự</label>
                <div className="relative" ref={memberDropdownRef}>
                  <div className="rounded-lg border border-gray-300 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={memberKeyword}
                        onChange={(e) => {
                          setMemberKeyword(e.target.value);
                          setIsMemberDropdownOpen(true);
                        }}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        placeholder="Tìm theo tên, SĐT, email"
                        disabled={isSubmitting || isReadOnly}
                        className="w-full border-none p-0 text-sm outline-none placeholder:text-gray-400"
                      />
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-gray-400 transition-transform',
                          isMemberDropdownOpen && 'rotate-180',
                        )}
                      />
                    </div>

                    {contactMemberIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {contactMemberIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                          >
                            {selectedMemberLabelMap.get(id) || id}
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => toggleContactMember(id)}
                                className="rounded-full p-0.5 hover:bg-blue-100"
                                aria-label="Xóa nhân sự liên hệ"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isMemberDropdownOpen && !isReadOnly && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {isSearchingMembers ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tìm nhân sự...
                        </div>
                      ) : memberResults.length > 0 ? (
                        memberResults.map((member) => {
                          const checked = selectedMemberSet.has(member.value);
                          return (
                            <button
                              key={member.value}
                              type="button"
                              onClick={() => toggleContactMember(member.value)}
                              className={cn(
                                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                                checked && 'bg-blue-50 text-blue-700',
                              )}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{member.label}</p>
                                <p className="truncate text-xs text-gray-500">
                                  SĐT: {member.phone || '---'} | Email: {member.email || '---'}
                                </p>
                              </div>
                              {checked && <Check className="h-4 w-4 flex-shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Không tìm thấy nhân sự phù hợp
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BaseImagePreviewDialog
        isOpen={previewImageIndex !== null}
        items={productImages.map((image, idx) => ({
          src: image.originalUrl,
          title: image.fileName || image.originalFileName || `Hình ${idx + 1}`,
          downloadFileName: image.fileName || image.originalFileName || `hinh-${idx + 1}`,
        }))}
        currentIndex={previewImageIndex}
        onClose={() => setPreviewImageIndex(null)}
        onChangeIndex={setPreviewImageIndex}
        onDownload={(item) => handleDownloadDocument(item.src, item.downloadFileName)}
      />

      <BaseImagePreviewDialog
        isOpen={previewIndex !== null && isPreviewingImageDocument}
        items={productDocuments.map((doc, idx) => ({
          src: doc.fileUrl,
          title: doc.fileName || `Tài liệu ${idx + 1}`,
          downloadFileName: doc.fileName || `tai-lieu-${idx + 1}`,
        }))}
        currentIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onChangeIndex={setPreviewIndex}
        onDownload={(item) => handleDownloadDocument(item.src, item.downloadFileName)}
      />

      <DocumentPreviewDialog
        isOpen={previewIndex !== null && !isPreviewingImageDocument}
        isLoading={false}
        fileName={previewDocument?.fileName || 'Tai lieu'}
        mimeType={previewDocumentMimeType}
        previewUrl={previewDocument?.fileUrl || ''}
        currentNumber={previewIndex !== null ? previewIndex + 1 : undefined}
        totalCount={productDocuments.length}
        onClose={() => setPreviewIndex(null)}
        onDownload={() => {
          if (!previewDocument) return;
          void handleDownloadDocument(previewDocument.fileUrl, previewDocument.fileName);
        }}
        onPrev={() => {
          setPreviewIndex((prev) => {
            if (prev === null || productDocuments.length <= 1) return prev;
            return prev > 0 ? prev - 1 : productDocuments.length - 1;
          });
        }}
        onNext={() => {
          setPreviewIndex((prev) => {
            if (prev === null || productDocuments.length <= 1) return prev;
            return prev < productDocuments.length - 1 ? prev + 1 : 0;
          });
        }}
        canPrev={productDocuments.length > 1}
        canNext={productDocuments.length > 1}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmIdx !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmIdx(null)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa file{' '}
              <strong>{productDocuments[deleteConfirmIdx]?.fileName}</strong> không?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmIdx(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setProductDocuments((prev) => prev.filter((_, i) => i !== deleteConfirmIdx));
                  setDeleteConfirmIdx(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

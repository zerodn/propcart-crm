'use client';

import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { Project, CreateProjectPayload, PlanningStat, ProjectContact } from '@/hooks/use-project';
import { ProjectMediaUploadManager, MediaItem } from './project-media-upload-manager';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { BaseDialog } from '@/components/common/base-dialog';
import { uploadFileToTemp } from '@/lib/api-upload';
import { IconPicker } from '@/components/common/icon-picker';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STEPS = [
  'Tổng quan',
  'Vị trí',
  'Pháp lý',
  'Ảnh 360',
  'Quỹ căn',
  'Mặt bằng quỹ căn',
  'Tòa nhà',
  'Chính sách bán hàng',
  'Tiến độ',
  'Tài liệu',
];

const DISPLAY_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Công khai' },
];

const SALE_STATUS_OPTIONS = [
  { value: 'COMING_SOON', label: 'Sắp mở bán' },
  { value: 'ON_SALE', label: 'Đang mở bán' },
  { value: 'SOLD_OUT', label: 'Đã bán hết' },
];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface MemberOption {
  value: string;
  label: string;
}

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingProject?: Project | null;
  projectType: 'LOW_RISE' | 'HIGH_RISE';
  ownerOptions: MemberOption[];
  saleStatusOptions: MemberOption[];
  onSubmit: (
    payload: Partial<CreateProjectPayload>,
    options?: { closeAfterSave?: boolean; projectId?: string; silent?: boolean },
  ) => Promise<Project | null>;
  isSubmitting: boolean;
  uploadImage: (file: File) => Promise<string | null>;
  accessToken: string;
  workspaceId?: string; // kept for future use
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function ProjectForm({
  isOpen,
  onClose,
  editingProject,
  projectType,
  ownerOptions,
  saleStatusOptions,
  onSubmit,
  isSubmitting,
  uploadImage,
  accessToken,
}: ProjectFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(editingProject?.id ?? null);

  // ── Upload handler ────────────────────────────────────────
  const handleUploadFile = async (file: File): Promise<string | null> => {
    // Use temp upload if we have accessToken, fallback to uploadImage
    if (accessToken) {
      return uploadFileToTemp(file, accessToken);
    }
    return uploadImage(file);
  };

  // ── Form State ────────────────────────────────────────────
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [displayStatus, setDisplayStatus] = useState('DRAFT');
  const [saleStatus, setSaleStatus] = useState('COMING_SOON');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [overviewHtml, setOverviewHtml] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  
  // Media items
  const [bannerItems, setBannerItems] = useState<MediaItem[]>([]);
  const [zoneItems, setZoneItems] = useState<MediaItem[]>([]);
  const [productItems, setProductItems] = useState<MediaItem[]>([]);
  const [amenityItems, setAmenityItems] = useState<MediaItem[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  
  // Planning stats & contacts
  const [planningStats, setPlanningStats] = useState<PlanningStat[]>([]);
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [newContactForm, setNewContactForm] = useState<ProjectContact>({ name: '' });
  const isUploading = uploadingCount > 0;

  const handleUploadingChange = (uploading: boolean) => {
    setUploadingCount((prev) => Math.max(0, prev + (uploading ? 1 : -1)));
  };

  const projectTypeLabel = projectType === 'LOW_RISE' ? 'Dự án thấp tầng' : 'Dự án cao tầng';

  const buildOverviewPayload = (): CreateProjectPayload => {
    const sanitizedContacts = contacts
      .map((contact) => ({
        name: (contact.name ?? '').trim(),
        title: contact.title?.trim() || undefined,
        phone: contact.phone?.trim() || undefined,
        imageUrl: contact.imageUrl?.trim() || undefined,
        description: contact.description?.trim() || undefined,
      }))
      .filter((contact) => contact.name.length > 0);

    return {
    name: name.trim(),
    projectType,
    ownerId: ownerId || undefined,
    displayStatus,
    saleStatus,
    bannerUrl: bannerItems[0]?.originalUrl || undefined,
    bannerUrls: bannerItems.length > 0 ? bannerItems.map((item) => item.originalUrl) : undefined,
    overviewHtml: overviewHtml || undefined,
    address: address || undefined,
    province: province || undefined,
    district: district || undefined,
    zoneImageUrl: zoneItems[0]?.originalUrl || undefined,
    productImageUrl: productItems[0]?.originalUrl || undefined,
    amenityImageUrl: amenityItems[0]?.originalUrl || undefined,
    videoUrl: videoUrl || undefined,
    videoDescription: videoDescription || undefined,
    contacts: sanitizedContacts.length > 0 ? sanitizedContacts : undefined,
    planningStats: planningStats.filter((s) => s.label && s.value),
    };
  };

  const getStepPayload = (step: number): Partial<CreateProjectPayload> => {
    if (step === 0) {
      return buildOverviewPayload();
    }
    return {};
  };

  // Sync editing project into form only when dialog opens or target project changes.
  // Avoid re-initializing on each successful save, because that resets currentStep.
  useEffect(() => {
    if (isOpen && editingProject) {
      setDraftProjectId(editingProject.id);
      setName(editingProject.name ?? '');
      setOwnerId(editingProject.ownerId ?? '');
      setDisplayStatus(editingProject.displayStatus ?? 'DRAFT');
      setSaleStatus(editingProject.saleStatus ?? 'COMING_SOON');
      setAddress(editingProject.address ?? '');
      setProvince(editingProject.province ?? '');
      setDistrict(editingProject.district ?? '');
      setVideoUrl(editingProject.videoUrl ?? '');
      setOverviewHtml(editingProject.overviewHtml ?? '');
      setVideoDescription(editingProject.videoDescription ?? '');
      
      // Sync media items
      if (editingProject.bannerUrls && editingProject.bannerUrls.length > 0) {
        setBannerItems(
          editingProject.bannerUrls.map((url, idx) => ({
            fileName: `Banner ${idx + 1}`,
            originalUrl: url,
            thumbnailUrl: url,
          })),
        );
      } else if (editingProject.bannerUrl) {
        setBannerItems([{ fileName: 'Banner 1', originalUrl: editingProject.bannerUrl, thumbnailUrl: editingProject.bannerUrl }]);
      } else {
        setBannerItems([]);
      }
      if (editingProject.zoneImageUrl) {
        setZoneItems([{ fileName: 'Phân khu', originalUrl: editingProject.zoneImageUrl, thumbnailUrl: editingProject.zoneImageUrl }]);
      } else {
        setZoneItems([]);
      }
      if (editingProject.productImageUrl) {
        setProductItems([{ fileName: 'Sản phẩm', originalUrl: editingProject.productImageUrl, thumbnailUrl: editingProject.productImageUrl }]);
      } else {
        setProductItems([]);
      }
      if (editingProject.amenityImageUrl) {
        setAmenityItems([{ fileName: 'Tiện ích', originalUrl: editingProject.amenityImageUrl, thumbnailUrl: editingProject.amenityImageUrl }]);
      } else {
        setAmenityItems([]);
      }

      setPlanningStats(editingProject.planningStats ?? []);
      setContacts(editingProject.contacts ?? []);
    } else if (isOpen && !editingProject) {
      setDraftProjectId(null);
      // Reset form for new project
      setName('');
      setOwnerId('');
      setDisplayStatus('DRAFT');
      setSaleStatus('COMING_SOON');
      setAddress('');
      setProvince('');
      setDistrict('');
      setVideoUrl('');
      setOverviewHtml('');
      setVideoDescription('');
      setBannerItems([]);
      setZoneItems([]);
      setProductItems([]);
      setAmenityItems([]);
      setPlanningStats([]);
      setContacts([]);
      setNewContactForm({ name: '' });
    }
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen, editingProject?.id]);

  // ── Planning Stats Handlers ────────────────────────────────
  const addPlanningStat = () => setPlanningStats((p) => [...p, { label: '', icon: '', value: '' }]);
  const updatePlanningStat = (i: number, field: keyof PlanningStat, val: string) =>
    setPlanningStats((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  const removePlanningStat = (i: number) => setPlanningStats((p) => p.filter((_, idx) => idx !== i));
  const movePlanningStat = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= planningStats.length) return;
    const arr = [...planningStats];
    [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
    setPlanningStats(arr);
  };

  // ── Contact Handlers ───────────────────────────────────────
  const addContact = () => {
    if (newContactForm.name.trim()) {
      setContacts((c) => [...c, newContactForm]);
      setNewContactForm({ name: '' });
    }
  };
  const removeContact = (i: number) => setContacts((c) => c.filter((_, idx) => idx !== i));

  // ── Form Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    const payload = buildOverviewPayload();
    const saved = await onSubmit(payload, {
      closeAfterSave: true,
      projectId: draftProjectId ?? undefined,
      silent: false,
    });
    if (saved?.id) {
      setDraftProjectId(saved.id);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 0 && !name.trim()) {
      toast.error('Vui lòng nhập tên dự án trước khi tiếp tục');
      return;
    }

    if (isUploading) {
      toast.error('Vui lòng chờ tải ảnh hoàn tất trước khi tiếp tục');
      return;
    }

    const payload = getStepPayload(currentStep);
    const saved = await onSubmit(payload, {
      closeAfterSave: false,
      projectId: draftProjectId ?? undefined,
      silent: true,
    });

    if (!saved) return;

    if (saved.id && saved.id !== draftProjectId) {
      setDraftProjectId(saved.id);
    }

    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  if (!isOpen) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const isOverviewStep = currentStep === 0;
  const footer = (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          Bước {currentStep + 1}/{STEPS.length}
        </span>
        <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
        {!isFirstStep && (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </button>
        )}
        {isLastStep ? (
          <button
            type="button"
            disabled={isSubmitting || !name.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingProject || draftProjectId ? 'Lưu thay đổi' : 'Tạo dự án'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || isUploading || (isOverviewStep && !name.trim())}
            onClick={handleNextStep}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Tiếp tục <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${editingProject ? 'Chỉnh sửa dự án' : 'Thêm mới dự án'} - ${projectTypeLabel}`}
      maxWidth="6xl"
      footer={footer}
    >
      <div className="flex h-[65vh] border border-gray-200 rounded-xl overflow-hidden bg-white">
          {/* Sidebar steps */}
          <aside className="w-48 flex-shrink-0 border-r border-gray-200 py-4 overflow-y-auto">
            <ul className="space-y-0.5 px-2">
              {STEPS.map((step, i) => (
                <li key={step}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      i === currentStep
                        ? 'bg-amber-50 text-amber-700 border-l-2 border-amber-500 rounded-l-none'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {step}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {isOverviewStep ? (
              <>
                <h3 className="text-base font-semibold text-gray-900 pb-1">
                  Thông tin tổng quan dự án
                </h3>

                {/* Row: Tên + Chủ dự án */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tên dự án <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập tên dự án"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Chủ dự án
                    </label>
                    <select
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="">Chọn chủ dự án</option>
                      {ownerOptions.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row: Trạng thái */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Trạng thái hiển thị <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={displayStatus}
                      onChange={(e) => setDisplayStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      {DISPLAY_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Trạng thái bán <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={saleStatus}
                      onChange={(e) => setSaleStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      {(saleStatusOptions.length > 0 ? saleStatusOptions : SALE_STATUS_OPTIONS).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Thông số quy hoạch */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Thông số quy hoạch
                    </label>
                    <button
                      type="button"
                      onClick={addPlanningStat}
                      className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm dòng
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="w-8 px-2 py-2" />
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 w-2/5">Nhãn thông số</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-600 w-1/5">Biểu tượng</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 w-2/5">Giá trị</th>
                          <th className="w-8 px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {planningStats.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-xs text-gray-400">
                              Chưa có thông số nào. Nhấn "+ Thêm dòng" để thêm.
                            </td>
                          </tr>
                        ) : (
                          planningStats.map((stat, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  {i > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => movePlanningStat(i, i - 1)}
                                      className="text-gray-400 hover:text-gray-600"
                                      aria-label="Move up"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {i < planningStats.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => movePlanningStat(i, i + 1)}
                                      className="text-gray-400 hover:text-gray-600"
                                      aria-label="Move down"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                  <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={stat.label}
                                  onChange={(e) => updatePlanningStat(i, 'label', e.target.value)}
                                  placeholder="Nhập thông số"
                                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <IconPicker
                                  value={stat.icon ?? ''}
                                  onChange={(v) => updatePlanningStat(i, 'icon', v)}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={stat.value}
                                  onChange={(e) => updatePlanningStat(i, 'value', e.target.value)}
                                  placeholder="Giá trị"
                                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removePlanningStat(i)}
                                  className="text-red-400 hover:text-red-600"
                                  aria-label="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Banner upload */}
                <ProjectMediaUploadManager
                  label="Hình ảnh banner *"
                  hint="Dung lượng mỗi tệp tối đa 20MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910×735px."
                  items={bannerItems}
                  onItemsChange={setBannerItems}
                  uploadFn={handleUploadFile}
                  maxFiles={10}
                  maxFileSizeMB={20}
                  showMultiple={true}
                  showPrimaryLabel={true}
                  onUploadingChange={handleUploadingChange}
                />

                {/* Address fields */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nhập địa chỉ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tỉnh / Thành</label>
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Nhập tỉnh/thành"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Quận / Huyện</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Nhập quận/huyện"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Tổng quan dự án with RichTextEditor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tổng quan dự án <span className="text-red-500">*</span>
                  </label>
                  <RichTextEditor
                    value={overviewHtml}
                    onChange={setOverviewHtml}
                    placeholder="Nhập mô tả"
                  />
                </div>

                {/* Phân khu, Sản phẩm, Tiện ích uploads */}
                <ProjectMediaUploadManager
                  label="Phân khu"
                  hint="Dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910×735px."
                  items={zoneItems}
                  onItemsChange={setZoneItems}
                  uploadFn={handleUploadFile}
                  maxFiles={10}
                  showMultiple={true}
                  onUploadingChange={handleUploadingChange}
                />

                <ProjectMediaUploadManager
                  label="Sản phẩm *"
                  hint="Dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910×735px."
                  items={productItems}
                  onItemsChange={setProductItems}
                  uploadFn={handleUploadFile}
                  maxFiles={10}
                  showMultiple={true}
                  onUploadingChange={handleUploadingChange}
                />

                <ProjectMediaUploadManager
                  label="Tiện ích"
                  hint="Dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910×735px."
                  items={amenityItems}
                  onItemsChange={setAmenityItems}
                  uploadFn={handleUploadFile}
                  maxFiles={10}
                  showMultiple={true}
                  onUploadingChange={handleUploadingChange}
                />

                {/* Video giới thiệu section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Video giới thiệu</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Link video
                    </label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Nhập link video"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mô tả video
                    </label>
                    <RichTextEditor
                      value={videoDescription}
                      onChange={setVideoDescription}
                      placeholder="Nhập mô tả video"
                    />
                  </div>
                </div>

                {/* Thông tin liên hệ section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Thông tin liên hệ</h3>

                  {/* Contact table */}
                  {contacts.length > 0 && (
                    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Hình đại diện</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Tên liên hệ</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Chức vụ</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Số điện thoại</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map((contact, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2.5">
                                {contact.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={contact.imageUrl}
                                    alt={contact.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-gray-900">{contact.name}</td>
                              <td className="px-3 py-2.5 text-sm text-gray-600">{contact.title || '—'}</td>
                              <td className="px-3 py-2.5 text-sm text-gray-600">{contact.phone || '—'}</td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeContact(i)}
                                  className="text-red-400 hover:text-red-600"
                                  aria-label="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add contact form */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newContactForm.name}
                        onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                        placeholder="Tên liên hệ"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={newContactForm.title || ''}
                          onChange={(e) => setNewContactForm({ ...newContactForm, title: e.target.value })}
                          placeholder="Chức vụ"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                        <input
                          type="text"
                          value={newContactForm.phone || ''}
                          onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                          placeholder="Số điện thoại"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={addContact}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Placeholder for other steps */
              <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-300">{currentStep + 1}</span>
                </div>
                <p className="text-sm font-medium">{STEPS[currentStep]}</p>
                <p className="text-xs text-center max-w-xs">
                  Chức năng này đang được phát triển và sẽ sớm ra mắt.
                </p>
              </div>
            )}
          </div>
        </div>
    </BaseDialog>
  );
}

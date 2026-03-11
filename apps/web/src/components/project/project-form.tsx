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
  Search,
  ChevronDown,
  Check,
  Camera,
} from 'lucide-react';
import { Project, CreateProjectPayload, PlanningStat, ProjectContact, MediaItem } from '@/hooks/use-project';
import { ProjectMediaUploadManager } from './project-media-upload-manager';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { BaseDialog } from '@/components/common/base-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { uploadFileToTemp } from '@/lib/api-upload';
import apiClient from '@/lib/api-client';
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

interface MemberSearchItem {
  value: string;
  label: string;
  phone?: string;
  email?: string;
}

interface LocationItem {
  code: number;
  name: string;
}

interface ProvinceV2Detail {
  code: number;
  name: string;
  wards: Array<{ code: number; name: string }>;
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
  workspaceId,
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
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [wardLoading, setWardLoading] = useState(false);
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
  const [uploadingContactIndex, setUploadingContactIndex] = useState<number | null>(null);
  const [deleteContactIndex, setDeleteContactIndex] = useState<number | null>(null);
  const [workspaceMemberOptions, setWorkspaceMemberOptions] = useState<MemberSearchItem[]>([]);
  const [memberKeyword, setMemberKeyword] = useState('');
  const [memberResults, setMemberResults] = useState<MemberSearchItem[]>([]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
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
        zaloPhone: contact.zaloPhone?.trim() || contact.phone?.trim() || undefined,
        imageUrl: contact.imageUrl?.trim() || undefined,
      }))
      .filter((contact) => contact.name.length > 0);

    return {
    name: name.trim(),
    projectType,
    ownerId: ownerId || undefined,
    displayStatus,
    saleStatus,
    bannerUrl: bannerItems[0]?.originalUrl || undefined,
    bannerUrls: bannerItems.length > 0 ? bannerItems : undefined,
    overviewHtml: overviewHtml || undefined,
    address: address || undefined,
    province: province || undefined,
    district: district || undefined,
    zoneImageUrl: zoneItems[0]?.originalUrl || undefined,
    zoneImages: zoneItems.length > 0 ? zoneItems : undefined,
    productImageUrl: productItems[0]?.originalUrl || undefined,
    productImages: productItems.length > 0 ? productItems : undefined,
    amenityImageUrl: amenityItems[0]?.originalUrl || undefined,
    amenityImages: amenityItems.length > 0 ? amenityItems : undefined,
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
      setProvinceCode('');
      setWardCode('');
      setWards([]);
      setVideoUrl(editingProject.videoUrl ?? '');
      setOverviewHtml(editingProject.overviewHtml ?? '');
      setVideoDescription(editingProject.videoDescription ?? '');
      
      // Sync media items — prefer full MediaItem[] (with fileName/description), fall back to URL strings
      if (editingProject.bannerUrls && editingProject.bannerUrls.length > 0) {
        setBannerItems(
          editingProject.bannerUrls.map((item, idx) => ({
            fileName: item.fileName || `Banner ${idx + 1}`,
            originalUrl: item.originalUrl,
            thumbnailUrl: item.thumbnailUrl || item.originalUrl,
            description: item.description,
          })),
        );
      } else if (editingProject.bannerUrl) {
        setBannerItems([{ fileName: 'Banner 1', originalUrl: editingProject.bannerUrl, thumbnailUrl: editingProject.bannerUrl }]);
      } else {
        setBannerItems([]);
      }
      if (editingProject.zoneImages && editingProject.zoneImages.length > 0) {
        setZoneItems(editingProject.zoneImages.map((item) => ({
          fileName: item.fileName || 'Mặt bằng',
          originalUrl: item.originalUrl,
          thumbnailUrl: item.thumbnailUrl || item.originalUrl,
          description: item.description,
        })));
      } else if (editingProject.zoneImageUrl) {
        setZoneItems([{ fileName: 'Mặt bằng', originalUrl: editingProject.zoneImageUrl, thumbnailUrl: editingProject.zoneImageUrl }]);
      } else {
        setZoneItems([]);
      }
      if (editingProject.productImages && editingProject.productImages.length > 0) {
        setProductItems(editingProject.productImages.map((item) => ({
          fileName: item.fileName || 'Sản phẩm',
          originalUrl: item.originalUrl,
          thumbnailUrl: item.thumbnailUrl || item.originalUrl,
          description: item.description,
        })));
      } else if (editingProject.productImageUrl) {
        setProductItems([{ fileName: 'Sản phẩm', originalUrl: editingProject.productImageUrl, thumbnailUrl: editingProject.productImageUrl }]);
      } else {
        setProductItems([]);
      }
      if (editingProject.amenityImages && editingProject.amenityImages.length > 0) {
        setAmenityItems(editingProject.amenityImages.map((item) => ({
          fileName: item.fileName || 'Tiện ích',
          originalUrl: item.originalUrl,
          thumbnailUrl: item.thumbnailUrl || item.originalUrl,
          description: item.description,
        })));
      } else if (editingProject.amenityImageUrl) {
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
      setProvinceCode('');
      setWardCode('');
      setWards([]);
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
      setDeleteContactIndex(null);
      setWorkspaceMemberOptions([]);
      setMemberKeyword('');
      setMemberResults([]);
      setIsMemberDropdownOpen(false);
    }
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen, editingProject?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const loadProvinces = async () => {
      setLocationLoading(true);
      try {
        const response = await fetch('https://provinces.open-api.vn/api/v2/?depth=1');
        const provinceList = (await response.json()) as LocationItem[];
        setProvinces(provinceList || []);
      } catch (err) {
        console.error('Failed to load provinces:', err);
      } finally {
        setLocationLoading(false);
      }
    };

    loadProvinces();
  }, [isOpen]);

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      return;
    }

    const loadWards = async () => {
      setWardLoading(true);
      try {
        const response = await fetch(`https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`);
        const payload = (await response.json()) as ProvinceV2Detail;
        const wardList = (payload.wards || []).map((item) => ({ code: item.code, name: item.name }));
        setWards(wardList);
      } catch (err) {
        console.error('Failed to load wards:', err);
      } finally {
        setWardLoading(false);
      }
    };

    loadWards();
  }, [provinceCode]);

  useEffect(() => {
    if (!province || provinceCode || provinces.length === 0) return;
    const matchedProvince = provinces.find((p) => p.name.toLowerCase() === province.toLowerCase());
    if (matchedProvince) {
      setProvinceCode(String(matchedProvince.code));
    }
  }, [province, provinceCode, provinces]);

  useEffect(() => {
    if (!district || wardCode || wards.length === 0) return;
    const matchedWard = wards.find((w) => w.name.toLowerCase() === district.toLowerCase());
    if (matchedWard) {
      setWardCode(String(matchedWard.code));
    }
  }, [district, wardCode, wards]);

  useEffect(() => {
    if (!workspaceId || !isOpen) return;

    const loadWorkspaceMemberOptions = async () => {
      try {
        const { data } = await apiClient.get(`/workspaces/${workspaceId}/departments/member-options`);
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped = items
          .map((item: { userId?: string; phone?: string; email?: string; user?: { phone?: string; email?: string; fullName?: string }; displayName?: string }) => ({
            value: item.userId || '',
            label: item.displayName || item.user?.fullName || item.phone || item.user?.phone || item.email || item.user?.email || item.userId || 'N/A',
            phone: item.phone || item.user?.phone,
            email: item.email || item.user?.email,
          }))
          .filter((item: MemberSearchItem) => Boolean(item.value));
        setWorkspaceMemberOptions(mapped);
      } catch {
        setWorkspaceMemberOptions([]);
      }
    };

    void loadWorkspaceMemberOptions();
  }, [workspaceId, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!workspaceId || !isOpen || !isMemberDropdownOpen) return;

    const timer = setTimeout(async () => {
      const q = memberKeyword.trim();

      if (!q) {
        setMemberResults(workspaceMemberOptions.slice(0, 20));
        return;
      }

      try {
        setIsSearchingMembers(true);
        const { data } = await apiClient.get(`/workspaces/${workspaceId}/departments/member-search`, {
          params: { q },
        });

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
  }, [workspaceId, isOpen, isMemberDropdownOpen, memberKeyword, workspaceMemberOptions]);

  const handleProvinceChange = (code: string) => {
    const selectedProvince = provinces.find((p) => String(p.code) === code);
    setProvinceCode(code);
    setProvince(selectedProvince?.name ?? '');
    setWardCode('');
    setDistrict('');
    setWards([]);
  };

  const handleWardChange = (code: string) => {
    const selectedWard = wards.find((w) => String(w.code) === code);
    setWardCode(code);
    setDistrict(selectedWard?.name ?? '');
  };

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
      const normalizedPhone = newContactForm.phone?.trim() || undefined;
      setContacts((c) => [
        ...c,
        {
          ...newContactForm,
          phone: normalizedPhone,
          zaloPhone: newContactForm.zaloPhone?.trim() || normalizedPhone,
        },
      ]);
      setNewContactForm({ name: '' });
    }
  };

  const addContactFromMember = (member: MemberSearchItem) => {
    const normalizedName = (member.label || '').trim().toLowerCase();
    const normalizedPhone = (member.phone || '').trim();
    const duplicated = contacts.some(
      (c) =>
        (c.name || '').trim().toLowerCase() === normalizedName &&
        (c.phone || '').trim() === normalizedPhone,
    );

    if (!duplicated) {
      setContacts((c) => [
        ...c,
        {
          name: member.label,
          phone: member.phone,
          zaloPhone: member.phone,
        },
      ]);
    }

    setMemberKeyword('');
    setIsMemberDropdownOpen(false);
  };

  const updateContact = (index: number, field: keyof ProjectContact, value: string) => {
    setContacts((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'phone') {
          const prevPhone = (item.phone || '').trim();
          const prevZalo = (item.zaloPhone || '').trim();
          const shouldSyncZalo = !prevZalo || prevZalo === prevPhone;
          return {
            ...item,
            phone: value,
            ...(shouldSyncZalo ? { zaloPhone: value } : {}),
          };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const handleContactAvatarUpload = async (index: number, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh');
      return;
    }

    try {
      setUploadingContactIndex(index);
      const url = await handleUploadFile(file);
      if (!url) {
        toast.error('Upload ảnh đại diện thất bại');
        return;
      }
      updateContact(index, 'imageUrl', url);
    } finally {
      setUploadingContactIndex(null);
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
    <>
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

                {/* Row: Tên + Trạng thái hiển thị + Trạng thái bán */}
                <div className="grid grid-cols-3 gap-4">
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

                {/* Row: Chủ dự án */}
                <div className="grid grid-cols-1 gap-4">
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

                {/* Address fields */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tỉnh/Thành phố</label>
                    <select
                      value={provinceCode}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      disabled={locationLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 bg-white"
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      {provinces.map((item) => (
                        <option key={item.code} value={String(item.code)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phường/Xã</label>
                    <select
                      value={wardCode}
                      onChange={(e) => handleWardChange(e.target.value)}
                      disabled={!provinceCode || locationLoading || wardLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 bg-white"
                    >
                      <option value="">Chọn phường/xã</option>
                      {wards.map((item) => (
                        <option key={item.code} value={String(item.code)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ chi tiết</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nhập địa chỉ chi tiết"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
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
                  label="Mặt bằng"
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
                      <table className="w-full text-sm table-fixed">
                        <colgroup>
                          <col className="w-[96px]" />
                          <col className="w-[28%]" />
                          <col className="w-[18%]" />
                          <col className="w-[18%]" />
                          <col className="w-[18%]" />
                          <col className="w-[44px]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-600">Hình đại diện</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Tên liên hệ</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Chức vụ</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Số điện thoại</th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">Zalo</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map((contact, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2.5">
                                <div className="relative w-10 h-10 mx-auto">
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

                                  <label className="absolute -right-1 -bottom-1 inline-flex items-center justify-center w-6 h-6 rounded-full border border-white bg-amber-600 text-white shadow-sm hover:bg-amber-700 cursor-pointer">
                                    {uploadingContactIndex === i ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Camera className="w-3 h-3" />
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        void handleContactAvatarUpload(i, file);
                                        e.currentTarget.value = '';
                                      }}
                                    />
                                  </label>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={contact.name || ''}
                                  onChange={(e) => updateContact(i, 'name', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  placeholder="Tên liên hệ"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={contact.title || ''}
                                  onChange={(e) => updateContact(i, 'title', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  placeholder="Chức vụ"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={contact.phone || ''}
                                  onChange={(e) => updateContact(i, 'phone', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  placeholder="Số điện thoại"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={contact.zaloPhone || ''}
                                  onChange={(e) => updateContact(i, 'zaloPhone', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  placeholder="Số zalo"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => setDeleteContactIndex(i)}
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
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Chọn nhân sự</label>
                        <div className="relative" ref={memberDropdownRef}>
                          <div className="rounded border border-gray-300 px-2 py-1.5 bg-white">
                            <div className="flex items-center gap-2">
                              <Search className="h-3.5 w-3.5 text-gray-400" />
                              <input
                                type="text"
                                value={memberKeyword}
                                onChange={(e) => {
                                  setMemberKeyword(e.target.value);
                                  setIsMemberDropdownOpen(true);
                                }}
                                onFocus={() => setIsMemberDropdownOpen(true)}
                                placeholder="Tìm theo tên, SĐT, email"
                                className="w-full border-none p-0 text-sm outline-none placeholder:text-gray-400"
                              />
                              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {isMemberDropdownOpen && (
                            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                              {isSearchingMembers ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Đang tìm nhân sự...
                                </div>
                              ) : memberResults.length > 0 ? (
                                memberResults.map((member) => {
                                  const exists = contacts.some(
                                    (c) =>
                                      (c.name || '').trim().toLowerCase() === member.label.trim().toLowerCase() &&
                                      (c.phone || '').trim() === (member.phone || '').trim(),
                                  );

                                  return (
                                    <button
                                      key={member.value}
                                      type="button"
                                      onClick={() => addContactFromMember(member)}
                                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate font-medium">{member.label}</p>
                                        <p className="truncate text-xs text-gray-500">
                                          SĐT: {member.phone || '---'} | Email: {member.email || '---'}
                                        </p>
                                      </div>
                                      {exists && <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">Không tìm thấy nhân sự phù hợp</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-medium text-gray-500">Hoặc</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>

                      <input
                        type="text"
                        value={newContactForm.name}
                        onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                        placeholder="Tên liên hệ"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                      <div className="grid grid-cols-4 gap-2">
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
                          onChange={(e) =>
                            setNewContactForm((prev) => {
                              const prevPhone = (prev.phone || '').trim();
                              const prevZalo = (prev.zaloPhone || '').trim();
                              const nextPhone = e.target.value;
                              const shouldSyncZalo = !prevZalo || prevZalo === prevPhone;
                              return {
                                ...prev,
                                phone: nextPhone,
                                ...(shouldSyncZalo ? { zaloPhone: nextPhone } : {}),
                              };
                            })
                          }
                          placeholder="Số điện thoại"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                        <input
                          type="text"
                          value={newContactForm.zaloPhone || ''}
                          onChange={(e) => setNewContactForm({ ...newContactForm, zaloPhone: e.target.value })}
                          placeholder="Số zalo"
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

      <ConfirmDialog
        isOpen={deleteContactIndex !== null}
        onCancel={() => setDeleteContactIndex(null)}
        onConfirm={() => {
          if (deleteContactIndex !== null) {
            removeContact(deleteContactIndex);
          }
          setDeleteContactIndex(null);
        }}
        title="Xóa liên hệ"
        message="Bạn có chắc muốn xóa liên hệ này?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
      />
    </>
  );
}

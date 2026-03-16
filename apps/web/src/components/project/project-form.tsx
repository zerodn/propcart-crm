import { RichTextEditor } from '@/components/common/RichTextEditor';
import { ProjectMediaUploadManager } from './project-media-upload-manager';
import { BaseDialog } from '@/components/common/base-dialog';
import { useRef, useState, useEffect } from 'react';
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
  MapPinned,
  MapPin,
  ExternalLink,
  Eye,
  Pencil,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { uploadFileToTemp, uploadProjectImage } from '@/lib/api-upload';
import {
  Project,
  CreateProjectPayload,
  MediaItem,
  PlanningStat,
  ProjectProgressUpdate,
  ProjectDocumentItem,
  ProjectContact,
  ProjectSubdivision,
  ProjectTower,
  TowerFundProduct,
  FloorPlanImage,
} from '@/hooks/use-project';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseSlideOver } from '@/components/common/base-slide-over';
import { BaseDataGrid } from '@/components/common/base-data-grid';
import { IconPicker } from '@/components/common/icon-picker';
import { TowerFloorPlanEditor } from './tower-floor-plan-editor';
import { TowerCamera360Viewer } from './tower-camera-360-viewer';
// ...existing code...

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STEPS = ['Tổng quan', 'Vị trí', 'Phân khu', 'Tiến độ', 'Tài liệu'];

const DISPLAY_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Công khai' },
];

const SALE_STATUS_OPTIONS = [
  { value: 'COMING_SOON', label: 'Sắp mở bán' },
  { value: 'ON_SALE', label: 'Đang mở bán' },
  { value: 'SOLD_OUT', label: 'Đã bán hết' },
];

function parseCoordinate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildCoordinatePreviewUrl(latitude: string, longitude: string): string | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  const delta = 0.008;
  const left = Math.max(-180, lng - delta);
  const right = Math.min(180, lng + delta);
  const top = Math.min(90, lat + delta);
  const bottom = Math.max(-90, lat - delta);

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function normalizeExternalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function buildGoogleMapPreviewUrl(value: string): string | null {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (!host.includes('google.')) return null;

    if (url.pathname.includes('/maps/d/embed')) {
      return url.toString();
    }

    if (url.pathname.includes('/maps/d/') && url.searchParams.get('mid')) {
      return `https://www.google.com/maps/d/embed?mid=${url.searchParams.get('mid')}`;
    }

    if (url.searchParams.get('output') === 'embed') {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

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

interface SubdivisionFormState {
  name: string;
  imageUrl: string;
  towerCount: string;
  unitCount: string;
  unitStandard: string;
  handoverDate: string;
  area: string;
  constructionStyle: string;
  ownershipType: string;
  descriptionHtml: string;
}

interface ProjectTowerRow {
  name: string;
  unitCount?: string;
  unitStandard?: string;
}

interface TowerFormState {
  name: string;
  floorCount: string;
  unitCount: string;
  elevatorCount: string;
  ownershipType: string;
  handoverStandard: string;
  constructionProgress: string;
  constructionStartDate: string;
  completionDate: string;
  latitude: string;
  longitude: string;
  googleMapUrl: string;
  locationDescriptionHtml: string;
  camera360Url: string;
  camera360Images: MediaItem[];
  salesPolicyImages: MediaItem[];
  fundProducts: TowerFundProduct[];
  floorPlanImages: FloorPlanImage[];
  descriptionHtml: string;
}

interface TowerProductOption {
  id: string;
  unitCode: string;
  name: string;
  warehouseId?: string;
  warehouseName?: string;
}

interface ProgressUpdateFormState {
  label: string;
  detailHtml: string;
  videos: { url: string; description: string }[];
  images: MediaItem[];
}

const TOWER_STEPS = [
  'Tổng quan',
  'Vị trí',
  'Camera 360',
  'Quỹ hàng',
  'Vị trí quỹ hàng',
  'Chính sách bán hàng',
];

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
  accessToken,
  workspaceId,
}: ProjectFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(editingProject?.id ?? null);

  // ── Upload handler ────────────────────────────────────────
  const handleUploadFile = async (file: File): Promise<string | null> => {
    // Use permanent project storage when workspaceId is available
    if (workspaceId) {
      return uploadProjectImage(workspaceId, file);
    }
    // Fallback to temp for pre-workspace scenarios
    return uploadFileToTemp(file, accessToken);
  };

  // ── Form State ────────────────────────────────────────────
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [displayStatus, setDisplayStatus] = useState('DRAFT');
  const [saleStatus, setSaleStatus] = useState('COMING_SOON');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [ward, setWard] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [googleMapUrl, setGoogleMapUrl] = useState('');
  const [locationDescriptionHtml, setLocationDescriptionHtml] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [wardLoading, setWardLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(editingProject?.videoUrl ?? '');
  const [overviewHtml, setOverviewHtml] = useState(editingProject?.overviewHtml ?? '');
  const [videoDescription, setVideoDescription] = useState(editingProject?.videoDescription ?? '');

  // Media items
  const [bannerItems, setBannerItems] = useState<MediaItem[]>([]);
  const [zoneItems, setZoneItems] = useState<MediaItem[]>([]);
  const [productItems, setProductItems] = useState<MediaItem[]>([]);
  const [amenityItems, setAmenityItems] = useState<MediaItem[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  // Planning stats & contacts
  const [planningStats, setPlanningStats] = useState<PlanningStat[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<ProjectProgressUpdate[]>([]);
  const [documentItems, setDocumentItems] = useState<ProjectDocumentItem[]>([]);
  const [draggedDocumentIndex, setDraggedDocumentIndex] = useState<number | null>(null);
  const [documentDeleteIndex, setDocumentDeleteIndex] = useState<number | null>(null);
  const [isProgressDrawerOpen, setIsProgressDrawerOpen] = useState(false);
  const [progressDrawerMode, setProgressDrawerMode] = useState<'create' | 'edit' | 'view'>(
    'create',
  );
  const [activeProgressIndex, setActiveProgressIndex] = useState<number | null>(null);
  const [progressDeleteIndex, setProgressDeleteIndex] = useState<number | null>(null);
  const [progressForm, setProgressForm] = useState<ProgressUpdateFormState>({
    label: '',
    detailHtml: '',
    videos: [],
    images: [],
  });
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [subdivisions, setSubdivisions] = useState<ProjectSubdivision[]>([]);
  const [isSubdivisionDialogOpen, setIsSubdivisionDialogOpen] = useState(false);
  const [subdivisionDialogMode, setSubdivisionDialogMode] = useState<'create' | 'edit' | 'view'>(
    'create',
  );
  const [activeSubdivisionIndex, setActiveSubdivisionIndex] = useState<number | null>(null);
  const [subdivisionForm, setSubdivisionForm] = useState<SubdivisionFormState>({
    name: '',
    imageUrl: '',
    towerCount: '',
    unitCount: '',
    unitStandard: '',
    handoverDate: '',
    area: '',
    constructionStyle: '',
    ownershipType: '',
    descriptionHtml: '',
  });
  const [subdivisionDeleteIndex, setSubdivisionDeleteIndex] = useState<number | null>(null);
  const [subdivisionCopyIndex, setSubdivisionCopyIndex] = useState<number | null>(null);
  const [isUploadingSubdivisionImage, setIsUploadingSubdivisionImage] = useState(false);
  const [isSavingSubdivision, setIsSavingSubdivision] = useState(false);
  const [selectedSubdivisionIndex, setSelectedSubdivisionIndex] = useState<number | null>(null);
  const [draggedSubdivisionIndex, setDraggedSubdivisionIndex] = useState<number | null>(null);
  const [draggedTowerIndex, setDraggedTowerIndex] = useState<number | null>(null);
  const [isTowerDrawerOpen, setIsTowerDrawerOpen] = useState(false);
  const [towerDrawerMode, setTowerDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [activeTowerIndex, setActiveTowerIndex] = useState<number | null>(null);
  const [towerDeleteIndex, setTowerDeleteIndex] = useState<number | null>(null);
  const [towerCopyIndex, setTowerCopyIndex] = useState<number | null>(null);
  const [towerCurrentStep, setTowerCurrentStep] = useState(0);
  const [isLoadingProjectLocation, setIsLoadingProjectLocation] = useState(false);
  const [isSavingTowerStep, setIsSavingTowerStep] = useState(false);
  const [isUploadingTowerMedia, setIsUploadingTowerMedia] = useState(false);
  const [isTowerProductDialogOpen, setIsTowerProductDialogOpen] = useState(false);
  const [isLoadingTowerProducts, setIsLoadingTowerProducts] = useState(false);
  const [towerProductKeyword, setTowerProductKeyword] = useState('');
  const [towerWarehouseFilter, setTowerWarehouseFilter] = useState<string>('');
  const [towerWarehouses, setTowerWarehouses] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [towerProducts, setTowerProducts] = useState<TowerProductOption[]>([]);
  const [floorPlanEditorOpen, setFloorPlanEditorOpen] = useState(false);
  const [floorPlanEditorIndex, setFloorPlanEditorIndex] = useState<number | null>(null);
  const [towerForm, setTowerForm] = useState<TowerFormState>({
    name: '',
    floorCount: '',
    unitCount: '',
    elevatorCount: '',
    ownershipType: '',
    handoverStandard: '',
    constructionProgress: '',
    constructionStartDate: '',
    completionDate: '',
    latitude: '',
    longitude: '',
    googleMapUrl: '',
    locationDescriptionHtml: '',
    camera360Url: '',
    camera360Images: [],
    salesPolicyImages: [],
    fundProducts: [],
    floorPlanImages: [],
    descriptionHtml: '',
  });
  const [newContactForm, setNewContactForm] = useState<ProjectContact>({ name: '' });
  const [uploadingContactIndex, setUploadingContactIndex] = useState<number | null>(null);
  const [deleteContactIndex, setDeleteContactIndex] = useState<number | null>(null);
  const [workspaceMemberOptions, setWorkspaceMemberOptions] = useState<MemberSearchItem[]>([]);
  const [memberKeyword, setMemberKeyword] = useState('');
  const [memberResults, setMemberResults] = useState<MemberSearchItem[]>([]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const subdivisionImageInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingCount > 0;

  const handleUploadingChange = (uploading: boolean) => {
    setUploadingCount((prev) => Math.max(0, prev + (uploading ? 1 : -1)));
  };

  const projectTypeLabel = projectType === 'LOW_RISE' ? 'Dự án thấp tầng' : 'Dự án cao tầng';
  const shouldIncludeEmptyCollections = Boolean(draftProjectId || editingProject?.id);

  const toCollectionField = <T,>(items: T[]): T[] | undefined => {
    if (items.length > 0) return items;
    return shouldIncludeEmptyCollections ? [] : undefined;
  };

  const coordinatePreviewUrl = buildCoordinatePreviewUrl(latitude, longitude);
  const googleMapPreviewUrl = buildGoogleMapPreviewUrl(googleMapUrl);
  const googleMapExternalUrl = normalizeExternalUrl(googleMapUrl);

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
      bannerUrls: toCollectionField(bannerItems),
      overviewHtml: overviewHtml || undefined,
      zoneImageUrl: zoneItems[0]?.originalUrl || undefined,
      zoneImages: toCollectionField(zoneItems),
      productImageUrl: productItems[0]?.originalUrl || undefined,
      productImages: toCollectionField(productItems),
      amenityImageUrl: amenityItems[0]?.originalUrl || undefined,
      amenityImages: toCollectionField(amenityItems),
      videoUrl: videoUrl || undefined,
      videoDescription: videoDescription || undefined,
      contacts: toCollectionField(sanitizedContacts),
      planningStats: toCollectionField(planningStats.filter((s) => s.label && s.value)),
      progressUpdates: toCollectionField(
        progressUpdates
          .map((item) => ({
            label: item.label.trim(),
            detailHtml: item.detailHtml || undefined,
            videoUrl:
              (!Array.isArray(item.videos) || item.videos.length === 0)
                ? item.videoUrl?.trim() || undefined
                : undefined,
            videos: Array.isArray(item.videos) && item.videos.length > 0 ? item.videos : undefined,
            images: item.images && item.images.length > 0 ? item.images : undefined,
          }))
          .filter((item) => item.label.length > 0),
      ),
      documentItems: toCollectionField(
        documentItems
          .map((item) => ({
            icon: item.icon?.trim() || undefined,
            documentType: item.documentType.trim(),
            documentUrl: normalizeExternalUrl(item.documentUrl)?.trim() || item.documentUrl.trim(),
          }))
          .filter((item) => item.documentType.length > 0 && item.documentUrl.length > 0),
      ),
      subdivisions: toCollectionField(subdivisions),
    };
  };

  const buildLocationPayload = (): Partial<CreateProjectPayload> => ({
    address: address.trim() || undefined,
    province: province.trim() || undefined,
    ward: ward.trim() || undefined,
    latitude: latitude.trim() || undefined,
    longitude: longitude.trim() || undefined,
    googleMapUrl: googleMapUrl.trim() || undefined,
    locationDescriptionHtml: locationDescriptionHtml || undefined,
  });

  // Build only the fields specific to the Overview step (exclude subdivisions, progressUpdates, documentItems)
  const buildOverviewStepPayload = (): Partial<CreateProjectPayload> => {
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
      bannerUrls: toCollectionField(bannerItems),
      // Always include overviewHtml and videoDescription (even when empty) so backend always persists the current value
      overviewHtml: overviewHtml || null,
      zoneImageUrl: zoneItems[0]?.originalUrl || undefined,
      zoneImages: toCollectionField(zoneItems),
      productImageUrl: productItems[0]?.originalUrl || undefined,
      productImages: toCollectionField(productItems),
      amenityImageUrl: amenityItems[0]?.originalUrl || undefined,
      amenityImages: toCollectionField(amenityItems),
      videoUrl: videoUrl || undefined,
      videoDescription: videoDescription || null,
      contacts: toCollectionField(sanitizedContacts),
      planningStats: toCollectionField(planningStats.filter((s) => s.label && s.value)),
      // NOTE: DO NOT include subdivisions, progressUpdates, documentItems here
      // Those are handled by their respective steps
    };
  };

  const buildFormPayload = (): CreateProjectPayload => ({
    ...buildOverviewPayload(),
    ...buildLocationPayload(),
  });

  const getStepPayload = (step: number): Partial<CreateProjectPayload> => {
    if (step === 0) {
      return buildOverviewStepPayload();
    }
    if (step === 1) {
      return buildLocationPayload();
    }
    if (step === 2) {
      return {
        subdivisions: toCollectionField(subdivisions),
      };
    }
    if (step === 3) {
      return {
        progressUpdates: toCollectionField(
          progressUpdates
            .map((item) => ({
              label: item.label.trim(),
              detailHtml: item.detailHtml || undefined,
              videoUrl:
                (!Array.isArray(item.videos) || item.videos.length === 0)
                  ? item.videoUrl?.trim() || undefined
                  : undefined,
              videos: Array.isArray(item.videos) && item.videos.length > 0 ? item.videos : undefined,
              images: item.images && item.images.length > 0 ? item.images : undefined,
            }))
            .filter((item) => item.label.length > 0),
        ),
      };
    }
    if (step === 4) {
      return {
        documentItems: toCollectionField(
          documentItems
            .map((item) => ({
              icon: item.icon?.trim() || undefined,
              documentType: item.documentType.trim(),
              documentUrl:
                normalizeExternalUrl(item.documentUrl)?.trim() || item.documentUrl.trim(),
            }))
            .filter((item) => item.documentType.length > 0 && item.documentUrl.length > 0),
        ),
      };
    }
    return {};
  };

  // Re-sync only overviewHtml and videoDescription when editingProject updates mid-session
  // (after a silent save, editingProject gets updated with latest from server)
  // This runs whenever editingProject changes but does NOT reset currentStep.
  useEffect(() => {
    if (!isOpen || !editingProject) return;
    if (editingProject.overviewHtml !== null && editingProject.overviewHtml !== undefined) {
      setOverviewHtml(editingProject.overviewHtml);
    }
    if (editingProject.videoDescription !== null && editingProject.videoDescription !== undefined) {
      setVideoDescription(editingProject.videoDescription);
    }
  }, [editingProject]);

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
      setWard(editingProject.ward ?? '');
      setLatitude(editingProject.latitude ?? '');
      setLongitude(editingProject.longitude ?? '');
      setGoogleMapUrl(editingProject.googleMapUrl ?? '');
      setLocationDescriptionHtml(editingProject.locationDescriptionHtml ?? '');
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
          }))
        );
      } else if (editingProject.bannerUrl) {
        setBannerItems([
          {
            fileName: 'Banner 1',
            originalUrl: editingProject.bannerUrl,
            thumbnailUrl: editingProject.bannerUrl,
          },
        ]);
      } else {
        setBannerItems([]);
      }
      if (editingProject.zoneImages && editingProject.zoneImages.length > 0) {
        setZoneItems(
          editingProject.zoneImages.map((item) => ({
            fileName: item.fileName || 'Mặt bằng',
            originalUrl: item.originalUrl,
            thumbnailUrl: item.thumbnailUrl || item.originalUrl,
            description: item.description,
          }))
        );
      } else if (editingProject.zoneImageUrl) {
        setZoneItems([
          {
            fileName: 'Mặt bằng',
            originalUrl: editingProject.zoneImageUrl,
            thumbnailUrl: editingProject.zoneImageUrl,
          },
        ]);
      } else {
        setZoneItems([]);
      }
      if (editingProject.productImages && editingProject.productImages.length > 0) {
        setProductItems(
          editingProject.productImages.map((item) => ({
            fileName: item.fileName || 'Sản phẩm',
            originalUrl: item.originalUrl,
            thumbnailUrl: item.thumbnailUrl || item.originalUrl,
            description: item.description,
          })),
        );
      } else if (editingProject.productImageUrl) {
        setProductItems([
          {
            fileName: 'Sản phẩm',
            originalUrl: editingProject.productImageUrl,
            thumbnailUrl: editingProject.productImageUrl,
          },
        ]);
      } else {
        setProductItems([]);
      }
      if (editingProject.amenityImages && editingProject.amenityImages.length > 0) {
        setAmenityItems(
          editingProject.amenityImages.map((item) => ({
            fileName: item.fileName || 'Tiện ích',
            originalUrl: item.originalUrl,
            thumbnailUrl: item.thumbnailUrl || item.originalUrl,
            description: item.description,
          })),
        );
      } else if (editingProject.amenityImageUrl) {
        setAmenityItems([
          {
            fileName: 'Tiện ích',
            originalUrl: editingProject.amenityImageUrl,
            thumbnailUrl: editingProject.amenityImageUrl,
          },
        ]);
      } else {
        setAmenityItems([]);
      }

      setPlanningStats(editingProject.planningStats ?? []);
      setProgressUpdates(editingProject.progressUpdates ?? []);
      setDocumentItems(editingProject.documentItems ?? []);
      setContacts(editingProject.contacts ?? []);
      setSubdivisions(editingProject.subdivisions ?? []);
      setSubdivisionDeleteIndex(null);
      setSubdivisionCopyIndex(null);
      setIsSubdivisionDialogOpen(false);
      setActiveSubdivisionIndex(null);
      setSelectedSubdivisionIndex(null);
      setIsTowerDrawerOpen(false);
      setActiveTowerIndex(null);
      setTowerDeleteIndex(null);
      setTowerCopyIndex(null);
    } else if (isOpen && !editingProject) {
      setDraftProjectId(null);
      // Reset form for new project
      setName('');
      setOwnerId('');
      setDisplayStatus('DRAFT');
      setSaleStatus('COMING_SOON');
      setAddress('');
      setProvince('');
      setWard('');
      setLatitude('');
      setLongitude('');
      setGoogleMapUrl('');
      setLocationDescriptionHtml('');
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
      setProgressUpdates([]);
      setDocumentItems([]);
      setContacts([]);
      setSubdivisions([]);
      setSubdivisionDeleteIndex(null);
      setSubdivisionCopyIndex(null);
      setIsSubdivisionDialogOpen(false);
      setActiveSubdivisionIndex(null);
      setSelectedSubdivisionIndex(null);
      setIsTowerDrawerOpen(false);
      setActiveTowerIndex(null);
      setTowerDeleteIndex(null);
      setTowerCopyIndex(null);
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
        const response = await fetch(
          `https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`,
        );
        const payload = (await response.json()) as ProvinceV2Detail;
        const wardList = (payload.wards || []).map((item) => ({
          code: item.code,
          name: item.name,
        }));
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
    if (!ward || wardCode || wards.length === 0) return;
    const matchedWard = wards.find((w) => w.name.toLowerCase() === ward.toLowerCase());
    if (matchedWard) {
      setWardCode(String(matchedWard.code));
    }
  }, [ward, wardCode, wards]);

  useEffect(() => {
    if (!workspaceId || !isOpen) return;

    const loadWorkspaceMemberOptions = async () => {
      try {
        const { data } = await apiClient.get(
          `/workspaces/${workspaceId}/departments/member-options`,
        );
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped = items
          .map(
            (item: {
              userId?: string;
              phone?: string;
              email?: string;
              user?: { phone?: string; email?: string; fullName?: string };
              displayName?: string;
            }) => ({
              value: item.userId || '',
              label:
                item.displayName ||
                item.user?.fullName ||
                item.phone ||
                item.user?.phone ||
                item.email ||
                item.user?.email ||
                item.userId ||
                'N/A',
              phone: item.phone || item.user?.phone,
              email: item.email || item.user?.email,
            }),
          )
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
  }, [workspaceId, isOpen, isMemberDropdownOpen, memberKeyword, workspaceMemberOptions]);

  // ── Auto-fill project location when entering Vị trí step in tower edit mode ──
  useEffect(() => {
    if (
      !workspaceId ||
      !isTowerDrawerOpen ||
      towerDrawerMode !== 'edit' ||
      towerCurrentStep !== 1 ||
      !draftProjectId
    )
      return;

    const loadProjectLocation = async () => {
      setIsLoadingProjectLocation(true);
      try {
        const { data } = await apiClient.get(
          `/workspaces/${workspaceId}/projects/${draftProjectId}`,
        );
        const project = data?.data ?? data;
        if (project) {
          setTowerForm((prev) => {
            if (
              prev.latitude ||
              prev.longitude ||
              prev.googleMapUrl ||
              prev.locationDescriptionHtml
            ) {
              return prev;
            }
            return {
              ...prev,
              latitude: String(project.latitude ?? ''),
              longitude: String(project.longitude ?? ''),
              googleMapUrl: String(project.googleMapUrl ?? ''),
              locationDescriptionHtml: String(project.locationDescriptionHtml ?? ''),
            };
          });
        }
      } catch {
        // silently ignore – project location unavailable
      } finally {
        setIsLoadingProjectLocation(false);
      }
    };

    void loadProjectLocation();
  }, [workspaceId, isTowerDrawerOpen, towerDrawerMode, towerCurrentStep, draftProjectId]);

  const handleProvinceChange = (code: string) => {
    const selectedProvince = provinces.find((p) => String(p.code) === code);
    setProvinceCode(code);
    setProvince(selectedProvince?.name ?? '');
    setWardCode('');
    setWard('');
    setWards([]);
  };

  const handleWardChange = (code: string) => {
    const selectedWard = wards.find((w) => String(w.code) === code);
    setWardCode(code);
    setWard(selectedWard?.name ?? '');
  };

  // ── Planning Stats Handlers ────────────────────────────────
  const addPlanningStat = () => setPlanningStats((p) => [...p, { label: '', icon: '', value: '' }]);
  const updatePlanningStat = (i: number, field: keyof PlanningStat, val: string) =>
    setPlanningStats((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  const removePlanningStat = (i: number) =>
    setPlanningStats((p) => p.filter((_, idx) => idx !== i));
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

  const openCreateSubdivision = () => {
    if (projectType === 'LOW_RISE') {
      setSelectedSubdivisionIndex(null);
      setTowerDrawerMode('create');
      setActiveTowerIndex(null);
      setTowerCurrentStep(0);
      setSubdivisionForm({
        name: '',
        imageUrl: '',
        towerCount: '1',
        unitCount: '',
        unitStandard: '',
        handoverDate: '',
        area: '',
        constructionStyle: '',
        ownershipType: '',
        descriptionHtml: '',
      });
      setTowerForm({
        name: '',
        floorCount: '',
        unitCount: '',
        elevatorCount: '',
        ownershipType: '',
        handoverStandard: '',
        constructionProgress: '',
        constructionStartDate: '',
        completionDate: '',
        latitude: '',
        longitude: '',
        googleMapUrl: '',
        locationDescriptionHtml: '',
        camera360Url: '',
        camera360Images: [],
        salesPolicyImages: [],
        fundProducts: [],
        floorPlanImages: [],
        descriptionHtml: '',
      });
      setIsTowerDrawerOpen(true);
      return;
    }

    setSubdivisionDialogMode('create');
    setActiveSubdivisionIndex(null);
    setSubdivisionForm({
      name: '',
      imageUrl: '',
      towerCount: '',
      unitCount: '',
      unitStandard: '',
      handoverDate: '',
      area: '',
      constructionStyle: '',
      ownershipType: '',
      descriptionHtml: '',
    });
    setIsSubdivisionDialogOpen(true);
  };

  const openSubdivisionDialog = (mode: 'edit' | 'view', index: number) => {
    const item = subdivisions[index];
    if (!item) return;
    setSubdivisionDialogMode(mode);
    setActiveSubdivisionIndex(index);
    setSubdivisionForm({
      name: item.name || '',
      imageUrl: item.imageUrl || '',
      towerCount: item.towerCount || '',
      unitCount: item.unitCount || '',
      unitStandard: item.unitStandard || '',
      handoverDate: item.handoverDate || '',
      area: item.area || '',
      constructionStyle: item.constructionStyle || '',
      ownershipType: item.ownershipType || '',
      descriptionHtml: item.descriptionHtml || '',
    });
    setIsSubdivisionDialogOpen(true);
  };

  const handleSubdivisionImageUpload = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ');
      return;
    }

    try {
      setIsUploadingSubdivisionImage(true);
      const url = await handleUploadFile(file);
      if (!url) {
        toast.error('Upload ảnh đại diện thất bại');
        return;
      }
      setSubdivisionForm((prev) => ({ ...prev, imageUrl: url }));
    } finally {
      setIsUploadingSubdivisionImage(false);
    }
  };

  const saveSubdivision = async () => {
    const existingSubdivision =
      subdivisionDialogMode === 'edit' && activeSubdivisionIndex !== null
        ? subdivisions[activeSubdivisionIndex]
        : undefined;

    const normalized: ProjectSubdivision = {
      // Preserve tower data and any other non-form fields that are not exposed in the edit form
      ...(existingSubdivision?.towers ? { towers: existingSubdivision.towers } : {}),
      name: subdivisionForm.name.trim(),
      imageUrl: subdivisionForm.imageUrl.trim() || undefined,
      towerCount: projectType === 'LOW_RISE' ? '1' : subdivisionForm.towerCount.trim() || undefined,
      unitCount: subdivisionForm.unitCount.trim() || subdivisionForm.towerCount.trim() || undefined,
      unitStandard: subdivisionForm.unitStandard.trim() || undefined,
      handoverDate: subdivisionForm.handoverDate || undefined,
      area: subdivisionForm.area.trim() || undefined,
      constructionStyle: subdivisionForm.constructionStyle.trim() || undefined,
      ownershipType: subdivisionForm.ownershipType.trim() || undefined,
      descriptionHtml: subdivisionForm.descriptionHtml || undefined,
    };

    if (!normalized.name) {
      toast.error('Vui lòng nhập tên phân khu');
      return;
    }

    const nextSubdivisions =
      subdivisionDialogMode === 'edit' && activeSubdivisionIndex !== null
        ? subdivisions.map((item, idx) => (idx === activeSubdivisionIndex ? normalized : item))
        : [...subdivisions, normalized];

    if (subdivisionDialogMode === 'edit') {
      setIsSavingSubdivision(true);
      try {
        const saved = await onSubmit(
          {
            subdivisions: nextSubdivisions,
          },
          {
            closeAfterSave: false,
            projectId: draftProjectId ?? undefined,
            silent: true,
          },
        );

        if (!saved) {
          return;
        }

        setSubdivisions(saved.subdivisions ?? nextSubdivisions);
        if (saved.id && saved.id !== draftProjectId) {
          setDraftProjectId(saved.id);
        }
      } finally {
        setIsSavingSubdivision(false);
      }
    } else {
      setSubdivisions(nextSubdivisions);
    }

    setIsSubdivisionDialogOpen(false);
    setActiveSubdivisionIndex(null);
  };

  const removeSubdivision = (index: number) => {
    setSubdivisions((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedSubdivisionIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const copySubdivision = (index: number) => {
    const sourceSubdivision = subdivisions[index];
    if (!sourceSubdivision) return;

    // Extract base name and find the highest sequential number
    const baseName = sourceSubdivision.name || 'Phân khu';
    const subdivisionNames = subdivisions.map((s) => s.name || '');

    // Regex to match name + number at the end
    const regex = new RegExp(`^${baseName}\\s*(\\d+)?$`);
    let highestNum = 0;

    subdivisionNames.forEach((name) => {
      const match = name.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highestNum) highestNum = num;
      }
    });

    // Create new subdivision with deep copy of towers
    const newSubdivisionName = `${baseName} ${highestNum + 1}`;
    const copiedSubdivision: ProjectSubdivision = {
      name: newSubdivisionName,
      imageUrl: sourceSubdivision.imageUrl,
      towerCount: sourceSubdivision.towerCount,
      unitCount: sourceSubdivision.unitCount,
      unitStandard: sourceSubdivision.unitStandard,
      handoverDate: sourceSubdivision.handoverDate,
      area: sourceSubdivision.area,
      constructionStyle: sourceSubdivision.constructionStyle,
      ownershipType: sourceSubdivision.ownershipType,
      descriptionHtml: sourceSubdivision.descriptionHtml,
      // Deep copy towers and all nested arrays
      towers: Array.isArray(sourceSubdivision.towers)
        ? sourceSubdivision.towers.map((tower) => ({
            ...tower,
            camera360Images: Array.isArray(tower.camera360Images)
              ? [...tower.camera360Images]
              : tower.camera360Images,
            salesPolicyImages: Array.isArray(tower.salesPolicyImages)
              ? [...tower.salesPolicyImages]
              : tower.salesPolicyImages,
            fundProducts: Array.isArray(tower.fundProducts)
              ? [...tower.fundProducts]
              : tower.fundProducts,
            floorPlanImages: Array.isArray(tower.floorPlanImages)
              ? [...tower.floorPlanImages]
              : tower.floorPlanImages,
          }))
        : sourceSubdivision.towers,
    };

    setSubdivisions((prev) => [...prev, copiedSubdivision]);
    toast.success(`Đã copy phân khu thành công`);
    setSubdivisionCopyIndex(null);
  };

  // ── Form Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    // On the final step (documents), only save documentItems
    // This follows the requirement: "Lưu thay đổi chỉ lưu dữ liệu của tab Tài liệu"
    // All other step data has been auto-saved during navigation
    const payload = isLastStep ? getStepPayload(currentStep) : buildFormPayload();
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
    if (!draftProjectId && !name.trim()) {
      toast.error('Vui lòng nhập tên dự án trước khi tiếp tục');
      return;
    }

    if (isUploading) {
      toast.error('Vui lòng chờ tải ảnh hoàn tất trước khi tiếp tục');
      return;
    }

    const payload = draftProjectId ? getStepPayload(currentStep) : buildFormPayload();
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

  const handlePrevStep = async () => {
    if (draftProjectId) {
      const payload = getStepPayload(currentStep);
      const saved = await onSubmit(payload, {
        closeAfterSave: false,
        projectId: draftProjectId,
        silent: true,
      });

      if (!saved) return;
    }

    setCurrentStep((s) => Math.max(0, s - 1));
  };

  if (!isOpen) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const isOverviewStep = currentStep === 0;
  const isLocationStep = currentStep === 1;
  const isSubdivisionStep = currentStep === 2;
  const isProgressStep = currentStep === 3;
  const isDocumentStep = currentStep === 4;

  const selectedSubdivision =
    selectedSubdivisionIndex !== null ? (subdivisions[selectedSubdivisionIndex] ?? null) : null;
  const towerCoordinatePreviewUrl = buildCoordinatePreviewUrl(
    towerForm.latitude,
    towerForm.longitude,
  );
  const towerGoogleMapPreviewUrl = buildGoogleMapPreviewUrl(towerForm.googleMapUrl);
  const towerGoogleMapExternalUrl = normalizeExternalUrl(towerForm.googleMapUrl);
  const towerCamera360PreviewUrl = normalizeExternalUrl(towerForm.camera360Url);

  // Load warehouses once when the product dialog opens
  useEffect(() => {
    if (!isTowerProductDialogOpen || !workspaceId) return;
    apiClient
      .get(`/workspaces/${workspaceId}/warehouses`, { params: { limit: 200 } })
      .then(({ data }) => {
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setTowerWarehouses(
          items.map((w: { id: string; name: string; code: string }) => ({
            id: w.id,
            name: w.name,
            code: w.code,
          })),
        );
      })
      .catch(() => setTowerWarehouses([]));
  }, [isTowerProductDialogOpen, workspaceId]);

  // Load products filtered by keyword + warehouse
  useEffect(() => {
    if (!isTowerProductDialogOpen) return;

    const timer = setTimeout(async () => {
      if (!workspaceId) {
        setTowerProducts([]);
        return;
      }

      try {
        setIsLoadingTowerProducts(true);
        const { data } = await apiClient.get(`/workspaces/${workspaceId}/products`, {
          params: {
            search: towerProductKeyword.trim() || undefined,
            warehouseId: towerWarehouseFilter || undefined,
          },
        });

        const rawItems = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped: TowerProductOption[] = rawItems.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          unitCode: item.unitCode as string,
          name: item.name as string,
          warehouseId:
            ((item.warehouse as { id?: string } | undefined)?.id as string | undefined) ||
            (item.warehouseId as string | undefined) ||
            undefined,
          warehouseName: (item.warehouse as { name?: string } | undefined)?.name || undefined,
        }));
        setTowerProducts(mapped);
      } catch {
        setTowerProducts([]);
      } finally {
        setIsLoadingTowerProducts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isTowerProductDialogOpen, towerProductKeyword, towerWarehouseFilter, workspaceId]);

  const getTowerRowsFromSubdivision = (
    subdivision: ProjectSubdivision | null,
  ): ProjectTowerRow[] => {
    if (!subdivision) return [];

    const maybeTowers = subdivision.towers;
    if (Array.isArray(maybeTowers)) {
      return maybeTowers.map((tower) => ({
        name: tower.name,
        unitCount: tower.unitCount,
        unitStandard: tower.handoverStandard,
      }));
    }

    const count = Number.parseInt(subdivision.towerCount ?? '', 10);
    if (!Number.isFinite(count) || count <= 0) {
      return [];
    }

    const prefix = (subdivision.name.match(/[A-Za-z]+/)?.[0] ?? 'T').toUpperCase();
    return Array.from({ length: count }, (_, idx) => ({
      name: `${prefix}${idx + 1}`,
      unitCount: subdivision.unitCount,
      unitStandard: subdivision.unitStandard,
    }));
  };

  const towerRows = getTowerRowsFromSubdivision(selectedSubdivision);

  const getEditableTowers = (subdivision: ProjectSubdivision | null): ProjectTower[] => {
    if (!subdivision) return [];
    if (Array.isArray(subdivision.towers)) {
      return subdivision.towers;
    }

    const generatedRows = getTowerRowsFromSubdivision(subdivision);
    return generatedRows.map((row) => ({
      name: row.name,
      unitCount: row.unitCount,
      handoverStandard: row.unitStandard,
    }));
  };

  const openTowerDrawer = () => {
    if (selectedSubdivisionIndex === null) {
      toast.error('Vui lòng chọn phân khu trước khi thêm tòa nhà');
      return;
    }
    setTowerDrawerMode('create');
    setActiveTowerIndex(null);
    setTowerCurrentStep(0);
    setTowerForm({
      name: '',
      floorCount: '',
      unitCount: '',
      elevatorCount: '',
      ownershipType: '',
      handoverStandard: '',
      constructionProgress: '',
      constructionStartDate: '',
      completionDate: '',
      latitude: editingProject?.latitude || '',
      longitude: editingProject?.longitude || '',
      googleMapUrl: editingProject?.googleMapUrl || '',
      locationDescriptionHtml: editingProject?.locationDescriptionHtml || '',
      camera360Url: '',
      camera360Images: [],
      salesPolicyImages: [],
      fundProducts: [],
      floorPlanImages: [],
      descriptionHtml: '',
    });
    setIsTowerDrawerOpen(true);
  };

  const closeTowerDrawer = () => {
    setIsTowerDrawerOpen(false);
    setTowerCurrentStep(0);
    setActiveTowerIndex(null);
    setIsTowerProductDialogOpen(false);
    setTowerProductKeyword('');
    setTowerWarehouseFilter('');
    setTowerWarehouses([]);
    setTowerProducts([]);
    setFloorPlanEditorOpen(false);
    setFloorPlanEditorIndex(null);
  };

  const addFundProductToTower = (product: TowerProductOption) => {
    setTowerForm((prev) => {
      const existed = prev.fundProducts.some((item) => item.productId === product.id);
      if (existed) return prev;

      return {
        ...prev,
        fundProducts: [
          ...prev.fundProducts,
          {
            productId: product.id,
            unitCode: product.unitCode,
            name: product.name,
            warehouseId: product.warehouseId,
            warehouseName: product.warehouseName,
          },
        ],
      };
    });
  };

  const removeFundProductFromTower = (productId: string) => {
    setTowerForm((prev) => ({
      ...prev,
      fundProducts: prev.fundProducts.filter((item) => item.productId !== productId),
    }));
  };

  const closeSubdivisionDrawer = () => {
    setIsSubdivisionDialogOpen(false);
    setActiveSubdivisionIndex(null);
  };

  const openTowerDrawerForRow = (mode: 'edit' | 'view', index: number) => {
    if (selectedSubdivisionIndex === null) return;
    const towers = getEditableTowers(subdivisions[selectedSubdivisionIndex] ?? null);
    const tower = towers[index];
    if (!tower) return;

    setTowerDrawerMode(mode);
    setActiveTowerIndex(index);
    setTowerCurrentStep(0);
    setTowerForm({
      name: tower.name || '',
      floorCount: tower.floorCount || '',
      unitCount: tower.unitCount || '',
      elevatorCount: tower.elevatorCount || '',
      ownershipType: tower.ownershipType || '',
      handoverStandard: tower.handoverStandard || '',
      constructionProgress: tower.constructionProgress || '',
      constructionStartDate: tower.constructionStartDate || '',
      completionDate: tower.completionDate || '',
      latitude: tower.latitude || '',
      longitude: tower.longitude || '',
      googleMapUrl: tower.googleMapUrl || '',
      locationDescriptionHtml: tower.locationDescriptionHtml || '',
      camera360Url: tower.camera360Url || '',
      camera360Images: Array.isArray(tower.camera360Images) ? tower.camera360Images : [],
      salesPolicyImages: Array.isArray(tower.salesPolicyImages) ? tower.salesPolicyImages : [],
      fundProducts: Array.isArray(tower.fundProducts) ? tower.fundProducts : [],
      floorPlanImages: Array.isArray(tower.floorPlanImages) ? tower.floorPlanImages : [],
      descriptionHtml: tower.descriptionHtml || '',
    });
    setIsTowerDrawerOpen(true);
  };

  const openSubdivisionTowerDrawer = (mode: 'edit' | 'view', index: number) => {
    const subdivision = subdivisions[index];
    if (!subdivision) return;

    const primaryTower = Array.isArray(subdivision.towers) ? subdivision.towers[0] : undefined;

    setSelectedSubdivisionIndex(index);
    setActiveSubdivisionIndex(index);
    setTowerDrawerMode(mode);
    setActiveTowerIndex(0);
    setTowerCurrentStep(0);
    setSubdivisionForm({
      name: subdivision.name || '',
      imageUrl: subdivision.imageUrl || '',
      towerCount: '1',
      unitCount: subdivision.unitCount || '',
      unitStandard: subdivision.unitStandard || '',
      handoverDate: subdivision.handoverDate || '',
      area: subdivision.area || '',
      constructionStyle: subdivision.constructionStyle || '',
      ownershipType: subdivision.ownershipType || '',
      descriptionHtml: subdivision.descriptionHtml || '',
    });
    setTowerForm({
      name: primaryTower?.name || subdivision.name || '',
      floorCount: primaryTower?.floorCount || '',
      unitCount: primaryTower?.unitCount || subdivision.unitCount || '',
      elevatorCount: primaryTower?.elevatorCount || '',
      ownershipType: primaryTower?.ownershipType || subdivision.ownershipType || '',
      handoverStandard: primaryTower?.handoverStandard || subdivision.unitStandard || '',
      constructionProgress: primaryTower?.constructionProgress || '',
      constructionStartDate: primaryTower?.constructionStartDate || '',
      completionDate: primaryTower?.completionDate || subdivision.handoverDate || '',
      latitude: primaryTower?.latitude || '',
      longitude: primaryTower?.longitude || '',
      googleMapUrl: primaryTower?.googleMapUrl || '',
      locationDescriptionHtml: primaryTower?.locationDescriptionHtml || '',
      camera360Url: primaryTower?.camera360Url || '',
      camera360Images: Array.isArray(primaryTower?.camera360Images)
        ? primaryTower.camera360Images
        : [],
      salesPolicyImages: Array.isArray(primaryTower?.salesPolicyImages)
        ? primaryTower.salesPolicyImages
        : [],
      fundProducts: Array.isArray(primaryTower?.fundProducts) ? primaryTower.fundProducts : [],
      floorPlanImages: Array.isArray(primaryTower?.floorPlanImages)
        ? primaryTower.floorPlanImages
        : [],
      descriptionHtml: primaryTower?.descriptionHtml || subdivision.descriptionHtml || '',
    });

    setIsTowerDrawerOpen(true);
  };

  const buildSubdivisionsWithTower = (tower: ProjectTower): ProjectSubdivision[] => {
    if (projectType === 'LOW_RISE') {
      const normalizedSubdivision: ProjectSubdivision = {
        name: subdivisionForm.name.trim(),
        imageUrl: subdivisionForm.imageUrl.trim() || undefined,
        towerCount: '1',
        unitCount: subdivisionForm.unitCount.trim() || undefined,
        unitStandard: subdivisionForm.unitStandard.trim() || undefined,
        handoverDate: subdivisionForm.handoverDate || undefined,
        area: subdivisionForm.area.trim() || undefined,
        constructionStyle: subdivisionForm.constructionStyle.trim() || undefined,
        ownershipType: subdivisionForm.ownershipType.trim() || undefined,
        descriptionHtml: subdivisionForm.descriptionHtml || undefined,
        towers: [{ ...tower }],
      };

      // FIX: Mirrors HIGH_RISE fix pattern.
      // Edit mode: always update at the tracked index (never append).
      if (towerDrawerMode === 'edit' && selectedSubdivisionIndex !== null) {
        return subdivisions.map((item, idx) =>
          idx === selectedSubdivisionIndex ? normalizedSubdivision : item,
        );
      }

      // Create mode step 2+: selectedSubdivisionIndex was set after first-step save,
      // so update the tracked index instead of appending a new record.
      if (selectedSubdivisionIndex !== null) {
        return subdivisions.map((item, idx) =>
          idx === selectedSubdivisionIndex ? normalizedSubdivision : item,
        );
      }

      // Create mode step 0 (first save): append new subdivision.
      return [...subdivisions, normalizedSubdivision];
    }

    if (selectedSubdivisionIndex === null) {
      return subdivisions;
    }

    return subdivisions.map((item, idx) => {
      if (idx !== selectedSubdivisionIndex) return item;

      const currentTowers = getEditableTowers(item);
      let nextTowers;
      if (towerDrawerMode === 'edit' && activeTowerIndex !== null) {
        nextTowers = currentTowers.map((existingTower, towerIdx) =>
          towerIdx === activeTowerIndex ? tower : existingTower
        );
      } else {
        // Prevent duplicate: check if tower with same name exists
        const exists = currentTowers.some(
          (t) =>
            t.name === tower.name &&
            t.latitude === tower.latitude &&
            t.longitude === tower.longitude,
        );
        nextTowers = exists
          ? currentTowers.map((existingTower) =>
              existingTower.name === tower.name &&
              existingTower.latitude === tower.latitude &&
              existingTower.longitude === tower.longitude
                ? tower
                : existingTower,
            )
          : [...currentTowers, tower];
      }
      return {
        ...item,
        towers: nextTowers,
        towerCount: String(nextTowers.length),
      };
    });
  };

  const persistTowerStep = async () => {
    if (projectType !== 'LOW_RISE' && selectedSubdivisionIndex === null) {
      toast.error('Không xác định được phân khu đang chọn');
      return false;
    }

    const normalizedTower: ProjectTower = {
      name: projectType === 'LOW_RISE' ? subdivisionForm.name.trim() : towerForm.name.trim(),
      floorCount: towerForm.floorCount.trim() || undefined,
      unitCount:
        projectType === 'LOW_RISE'
          ? subdivisionForm.unitCount.trim() || undefined
          : towerForm.unitCount.trim() || undefined,
      elevatorCount: towerForm.elevatorCount.trim() || undefined,
      ownershipType:
        projectType === 'LOW_RISE'
          ? subdivisionForm.ownershipType.trim() || undefined
          : towerForm.ownershipType.trim() || undefined,
      handoverStandard:
        projectType === 'LOW_RISE'
          ? subdivisionForm.unitStandard.trim() || undefined
          : towerForm.handoverStandard.trim() || undefined,
      constructionProgress: towerForm.constructionProgress.trim() || undefined,
      constructionStartDate: towerForm.constructionStartDate || undefined,
      completionDate:
        projectType === 'LOW_RISE'
          ? subdivisionForm.handoverDate || undefined
          : towerForm.completionDate || undefined,
      latitude: towerForm.latitude.trim() || undefined,
      longitude: towerForm.longitude.trim() || undefined,
      googleMapUrl: towerForm.googleMapUrl.trim() || undefined,
      locationDescriptionHtml: towerForm.locationDescriptionHtml || undefined,
      camera360Url: towerForm.camera360Url.trim() || undefined,
      camera360Images: towerForm.camera360Images.length > 0 ? towerForm.camera360Images : undefined,
      salesPolicyImages:
        towerForm.salesPolicyImages.length > 0 ? towerForm.salesPolicyImages : undefined,
      fundProducts: towerForm.fundProducts.length > 0 ? towerForm.fundProducts : undefined,
      floorPlanImages: towerForm.floorPlanImages.length > 0 ? towerForm.floorPlanImages : undefined,
      descriptionHtml:
        projectType === 'LOW_RISE'
          ? subdivisionForm.descriptionHtml || undefined
          : towerForm.descriptionHtml || undefined,
    };

    if (!normalizedTower.name) {
      toast.error(
        projectType === 'LOW_RISE' ? 'Vui lòng nhập tên phân khu' : 'Vui lòng nhập tên tòa nhà',
      );
      return false;
    }

    if (towerCurrentStep === 0 && projectType === 'LOW_RISE') {
      if (!subdivisionForm.name.trim()) {
        toast.error('Vui lòng nhập tên phân khu');
        return false;
      }
    }

    if (towerCurrentStep === 0 && projectType !== 'LOW_RISE') {
      if (!towerForm.floorCount.trim()) {
        toast.error('Vui lòng nhập số tầng');
        return false;
      }
      if (!towerForm.unitCount.trim()) {
        toast.error('Vui lòng nhập số căn hộ');
        return false;
      }
    }

    if (towerCurrentStep === 1) {
      if (!towerForm.latitude.trim()) {
        toast.error('Vui lòng nhập vĩ độ');
        return false;
      }
      if (!towerForm.longitude.trim()) {
        toast.error('Vui lòng nhập kinh độ');
        return false;
      }
    }

    if (towerCurrentStep === 2 && isUploadingTowerMedia) {
      toast.error('Vui lòng chờ tải ảnh 360 hoàn tất trước khi tiếp tục');
      return false;
    }

    const nextSubdivisions = buildSubdivisionsWithTower(normalizedTower);

    setIsSavingTowerStep(true);
    try {
      const payload = draftProjectId
        ? { subdivisions: nextSubdivisions }
        : {
            ...buildFormPayload(),
            subdivisions: nextSubdivisions,
          };

      const saved = await onSubmit(payload, {
        closeAfterSave: false,
        projectId: draftProjectId ?? undefined,
        silent: true,
      });

      if (!saved) {
        return false;
      }

      setSubdivisions(saved.subdivisions ?? nextSubdivisions);
      if (saved.id && saved.id !== draftProjectId) {
        setDraftProjectId(saved.id);
      }

      // FIX for LOW_RISE create mode: after the first-step save, track the index of the
      // newly created subdivision so subsequent steps update it instead of appending again.
      if (projectType === 'LOW_RISE' && towerDrawerMode === 'create' && selectedSubdivisionIndex === null) {
        const savedSubs = saved.subdivisions ?? nextSubdivisions;
        if (savedSubs.length > 0) {
          setSelectedSubdivisionIndex(savedSubs.length - 1);
        }
      }

      return true;
    } finally {
      setIsSavingTowerStep(false);
    }
  };

  const saveTowerToSubdivision = async () => {
    const ok = await persistTowerStep();
    if (!ok) return;

    if (towerCurrentStep < TOWER_STEPS.length - 1) {
      setTowerCurrentStep((step) => Math.min(TOWER_STEPS.length - 1, step + 1));
      return;
    }

    setIsTowerDrawerOpen(false);
    setActiveTowerIndex(null);
    setTowerCurrentStep(0);
  };

  const handleTowerPrevStep = async () => {
    const ok = await persistTowerStep();
    if (!ok) return;

    setTowerCurrentStep((step) => Math.max(0, step - 1));
  };

  const removeTowerFromSubdivision = (index: number) => {
    if (selectedSubdivisionIndex === null) return;

    setSubdivisions((prev) =>
      prev.map((item, idx) => {
        if (idx !== selectedSubdivisionIndex) return item;
        const currentTowers = getEditableTowers(item);
        const nextTowers = currentTowers.filter((_, towerIdx) => towerIdx !== index);
        return {
          ...item,
          towers: nextTowers,
          towerCount: String(nextTowers.length),
        };
      }),
    );
  };

  const copyTowerFromSubdivision = (index: number) => {
    if (selectedSubdivisionIndex === null) return;

    setSubdivisions((prev) =>
      prev.map((item, idx) => {
        if (idx !== selectedSubdivisionIndex) return item;
        const currentTowers = getEditableTowers(item);
        const sourceTower = currentTowers[index];
        if (!sourceTower) return item;

        // Extract base name and find the highest sequential number
        const baseName = sourceTower.name || 'Tòa nhà';
        const towerNames = currentTowers.map((t) => t.name || '');

        // Regex to match name + number at the end
        const regex = new RegExp(`^${baseName}\\s*(\\d+)?$`);
        let highestNum = 0;

        towerNames.forEach((name) => {
          const match = name.match(regex);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > highestNum) highestNum = num;
          }
        });

        // Create new tower with incremented name
        const newTowerName = `${baseName} ${highestNum + 1}`;
        const copiedTower: ProjectTower = {
          ...sourceTower,
          name: newTowerName,
        };

        const nextTowers = [...currentTowers, copiedTower];
        return {
          ...item,
          towers: nextTowers,
          towerCount: String(nextTowers.length),
        };
      }),
    );

    toast.success(`Đã copy tòa nhà thành công`);
    setTowerCopyIndex(null);
  };

  const openCreateProgressUpdate = () => {
    setProgressDrawerMode('create');
    setActiveProgressIndex(null);
    setProgressForm({
      label: '',
      detailHtml: '',
      videos: [],
      images: [],
    });
    setIsProgressDrawerOpen(true);
  };

  const openProgressUpdateDialog = (mode: 'edit' | 'view', index: number) => {
    const item = progressUpdates[index];
    if (!item) return;
    setProgressDrawerMode(mode);
    setActiveProgressIndex(index);
    setProgressForm({
      label: item.label || '',
      detailHtml: item.detailHtml || '',
      videos: Array.isArray(item.videos) && item.videos.length > 0
        ? item.videos.map((v) => ({ url: v.url, description: v.description || '' }))
        : item.videoUrl ? [{ url: item.videoUrl, description: '' }] : [],
      images: Array.isArray(item.images) ? item.images : [],
    });
    setIsProgressDrawerOpen(true);
  };

  const closeProgressDrawer = () => {
    setIsProgressDrawerOpen(false);
    setActiveProgressIndex(null);
    setProgressForm({
      label: '',
      detailHtml: '',
      videos: [],
      images: [],
    });
  };

  const saveProgressUpdate = () => {
    const trimmedVideos = progressForm.videos
      .filter((v) => v.url.trim())
      .map((v) => ({ url: v.url.trim(), description: v.description.trim() || undefined }));
    const normalized: ProjectProgressUpdate = {
      label: progressForm.label.trim(),
      detailHtml: progressForm.detailHtml || undefined,
      videos: trimmedVideos.length > 0 ? trimmedVideos : undefined,
      images: progressForm.images.length > 0 ? progressForm.images : undefined,
    };

    if (!normalized.label) {
      toast.error('Vui lòng nhập nhãn tiến độ');
      return;
    }

    setProgressUpdates((prev) =>
      progressDrawerMode === 'edit' && activeProgressIndex !== null
        ? prev.map((item, idx) => (idx === activeProgressIndex ? normalized : item))
        : [...prev, normalized],
    );

    closeProgressDrawer();
  };

  const [draggedProgressIndex, setDraggedProgressIndex] = useState<number | null>(null);

  const handleProgressDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggedProgressIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProgressDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleProgressDrop = (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedProgressIndex === null || draggedProgressIndex === dropIndex) {
      setDraggedProgressIndex(null);
      return;
    }

    setProgressUpdates((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedProgressIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    toast.success('Sắp xếp tiến độ thành công');
    setDraggedProgressIndex(null);
  };

  const handleProgressDragEnd = () => {
    setDraggedProgressIndex(null);
  };

  const addDocumentItem = () => {
    setDocumentItems((prev) => [...prev, { icon: '📄', documentType: '', documentUrl: '' }]);
  };

  const updateDocumentItem = (index: number, field: keyof ProjectDocumentItem, value: string) => {
    setDocumentItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeDocumentItem = (index: number) => {
    setDocumentItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDocumentDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggedDocumentIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDocumentDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDocumentDrop = (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedDocumentIndex === null || draggedDocumentIndex === dropIndex) {
      setDraggedDocumentIndex(null);
      return;
    }

    setDocumentItems((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedDocumentIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    toast.success('Sắp xếp tài liệu thành công');
    setDraggedDocumentIndex(null);
  };

  const handleDocumentDragEnd = () => {
    setDraggedDocumentIndex(null);
  };

  const openDocumentUrl = (url: string) => {
    const normalized = normalizeExternalUrl(url);
    if (!normalized) {
      toast.error('Vui lòng nhập URL tài liệu hợp lệ');
      return;
    }
    window.open(normalized, '_blank', 'noopener,noreferrer');
  };

  const handleSubdivisionDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggedSubdivisionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubdivisionDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSubdivisionDrop = (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedSubdivisionIndex === null || draggedSubdivisionIndex === dropIndex) {
      setDraggedSubdivisionIndex(null);
      return;
    }

    setSubdivisions((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedSubdivisionIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    toast.success('Sắp xếp phân khu thành công');
    setDraggedSubdivisionIndex(null);
  };

  const handleSubdivisionDragEnd = () => {
    setDraggedSubdivisionIndex(null);
  };

  const handleTowerDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTowerIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTowerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTowerDrop = (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (
      draggedTowerIndex === null ||
      draggedTowerIndex === dropIndex ||
      selectedSubdivisionIndex === null
    ) {
      setDraggedTowerIndex(null);
      return;
    }

    setSubdivisions((prev) =>
      prev.map((item, idx) => {
        if (idx !== selectedSubdivisionIndex) return item;
        const towers = getEditableTowers(item);
        if (draggedTowerIndex < 0 || draggedTowerIndex >= towers.length) return item;

        const updatedTowers = [...towers];
        const [draggedTower] = updatedTowers.splice(draggedTowerIndex, 1);
        updatedTowers.splice(dropIndex, 0, draggedTower);

        return {
          ...item,
          towers: updatedTowers,
          towerCount: String(updatedTowers.length),
        };
      }),
    );

    toast.success('Sắp xếp tòa nhà thành công');
    setDraggedTowerIndex(null);
  };

  const handleTowerDragEnd = () => {
    setDraggedTowerIndex(null);
  };
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
            onClick={handlePrevStep}
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
            disabled={isSubmitting || isUploading || (!draftProjectId && !name.trim())}
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
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
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
                      {(saleStatusOptions.length > 0 ? saleStatusOptions : SALE_STATUS_OPTIONS).map(
                        (o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

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
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
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
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 w-2/5">
                            Nhãn thông số
                          </th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-600 w-1/5">
                            Biểu tượng
                          </th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 w-2/5">
                            Giá trị
                          </th>
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
                  hint="Dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910×735px. Không giới hạn số lượng tệp."
                  items={productItems}
                  onItemsChange={setProductItems}
                  uploadFn={handleUploadFile}
                  maxFiles={Number.MAX_SAFE_INTEGER}
                  showMultiple={true}
                  onUploadingChange={handleUploadingChange}
                />

                <ProjectMediaUploadManager
                  label="Tiện ích"
                  hint="Dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910×735px."
                  items={amenityItems}
                  onItemsChange={setAmenityItems}
                  uploadFn={handleUploadFile}
                  maxFiles={Number.MAX_SAFE_INTEGER}
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
                            <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-600">
                              Hình đại diện
                            </th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">
                              Tên liên hệ
                            </th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">
                              Chức vụ
                            </th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">
                              Số điện thoại
                            </th>
                            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-600">
                              Zalo
                            </th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map((contact, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2.5">
                                <div className="relative w-10 h-10 mx-auto">
                                  {contact.imageUrl ? (
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Chọn nhân sự
                        </label>
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
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`}
                              />
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
                                      (c.name || '').trim().toLowerCase() ===
                                        member.label.trim().toLowerCase() &&
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
                                          SĐT: {member.phone || '---'} | Email:{' '}
                                          {member.email || '---'}
                                        </p>
                                      </div>
                                      {exists && (
                                        <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                      )}
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

                      <div className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-medium text-gray-500">Hoặc</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>

                      <input
                        type="text"
                        value={newContactForm.name}
                        onChange={(e) =>
                          setNewContactForm({ ...newContactForm, name: e.target.value })
                        }
                        placeholder="Tên liên hệ"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={newContactForm.title || ''}
                          onChange={(e) =>
                            setNewContactForm({ ...newContactForm, title: e.target.value })
                          }
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
                          onChange={(e) =>
                            setNewContactForm({ ...newContactForm, zaloPhone: e.target.value })
                          }
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
            ) : isLocationStep ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tỉnh / Thành phố <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={provinceCode}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      disabled={locationLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 bg-white"
                    >
                      <option value="">Chọn tỉnh / thành phố</option>
                      {provinces.map((item) => (
                        <option key={item.code} value={String(item.code)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phường / Xã <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={wardCode}
                      onChange={(e) => handleWardChange(e.target.value)}
                      disabled={!provinceCode || locationLoading || wardLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 bg-white"
                    >
                      <option value="">Chọn phường / xã</option>
                      {wards.map((item) => (
                        <option key={item.code} value={String(item.code)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nhập địa chỉ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vĩ độ (Latitude) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Nhập vĩ độ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Kinh độ (Longitude) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Nhập kinh độ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 min-h-[260px] overflow-hidden">
                  {coordinatePreviewUrl ? (
                    <iframe
                      title="Coordinate preview"
                      src={coordinatePreviewUrl}
                      className="h-[228px] w-full rounded-lg border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="flex h-[228px] flex-col items-center justify-center gap-3 text-center text-gray-500">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                        <MapPinned className="h-8 w-8 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có tọa độ để hiển thị bản đồ
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Nhập vĩ độ và kinh độ để xem vị trí dự án trên bản đồ.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Google Mymap
                  </label>
                  <input
                    type="text"
                    value={googleMapUrl}
                    onChange={(e) => setGoogleMapUrl(e.target.value)}
                    placeholder="Nhập link bản đồ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 min-h-[260px] overflow-hidden">
                  {googleMapPreviewUrl ? (
                    <iframe
                      title="Google MyMap preview"
                      src={googleMapPreviewUrl}
                      className="h-[228px] w-full rounded-lg border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="flex h-[228px] flex-col items-center justify-center gap-3 text-center text-gray-500">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                        <MapPinned className="h-8 w-8 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Nhập link để hiển thị Google MyMap
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Hỗ trợ tốt nhất với link chia sẻ hoặc embed của Google My Maps.
                        </p>
                      </div>
                      {googleMapExternalUrl && (
                        <a
                          href={googleMapExternalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Mở liên kết bản đồ <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mô tả vị trí
                  </label>
                  <RichTextEditor
                    value={locationDescriptionHtml}
                    onChange={setLocationDescriptionHtml}
                    placeholder="Nhập mô tả"
                  />
                </div>
              </>
            ) : isSubdivisionStep ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h4 className="text-sm font-semibold text-gray-800">Phân khu</h4>
                    <button
                      type="button"
                      onClick={openCreateSubdivision}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" /> Thêm phân khu
                    </button>
                  </div>

                  <div className="px-4 py-3 text-sm text-gray-600">
                    Có {subdivisions.length} kết quả
                  </div>

                  <div className="border-t border-gray-200 p-4">
                    {subdivisions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Chưa có phân khu nào</div>
                    ) : (
                      <div className="space-y-2">
                        {subdivisions.map((item, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={(e) => handleSubdivisionDragStart(index, e)}
                            onDragOver={handleSubdivisionDragOver}
                            onDrop={(e) => handleSubdivisionDrop(index, e)}
                            onDragEnd={handleSubdivisionDragEnd}
                            className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-move ${
                              draggedSubdivisionIndex === index
                                ? 'bg-gray-100 border-gray-300 opacity-50'
                                : projectType === 'HIGH_RISE' && selectedSubdivisionIndex === index
                                  ? 'border-amber-300 bg-amber-50'
                                  : 'border-gray-200 hover:border-amber-300 bg-white hover:bg-amber-50'
                            }`}
                          >
                            <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-4 w-4" />
                            </div>

                            <div
                              className="flex-1 min-w-0"
                              onClick={() => {
                                if (projectType === 'HIGH_RISE') {
                                  setSelectedSubdivisionIndex((current) =>
                                    current === index ? null : index,
                                  );
                                }
                              }}
                            >
                              <div className="font-medium text-sm text-gray-900">{item.name}</div>
                              {item.unitStandard && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Tiêu chuẩn: {item.unitStandard}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {projectType === 'LOW_RISE' ? (
                                item.unitCount && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {item.unitCount} căn hộ
                                  </span>
                                )
                              ) : (
                                item.towerCount && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {item.towerCount} toà
                                  </span>
                                )
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  projectType === 'LOW_RISE'
                                    ? openSubdivisionTowerDrawer('view', index)
                                    : openSubdivisionDialog('view', index)
                                }
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                                title="Xem"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  projectType === 'LOW_RISE'
                                    ? openSubdivisionTowerDrawer('edit', index)
                                    : openSubdivisionDialog('edit', index)
                                }
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                                title="Sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubdivisionCopyIndex(index)}
                                className="rounded p-1.5 text-gray-500 hover:bg-amber-100 hover:text-amber-600"
                                title="Sao chép"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubdivisionDeleteIndex(index)}
                                className="rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {projectType === 'HIGH_RISE' && selectedSubdivision && (
                  <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                      <div className="text-sm font-semibold text-gray-800">
                        Danh sách tòa nhà - {selectedSubdivision.name}
                      </div>
                      <button
                        type="button"
                        onClick={openTowerDrawer}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                      >
                        <Plus className="h-4 w-4" /> Thêm mới
                      </button>
                    </div>
                    <div className="p-4">
                      {towerRows.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          Phân khu này chưa có dữ liệu tòa nhà
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {towerRows.map((tower, index) => (
                            <div
                              key={`${tower.name}-${index}`}
                              draggable
                              onDragStart={(e) => handleTowerDragStart(index, e)}
                              onDragOver={handleTowerDragOver}
                              onDrop={(e) => handleTowerDrop(index, e)}
                              onDragEnd={handleTowerDragEnd}
                              className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-move ${
                                draggedTowerIndex === index
                                  ? 'bg-gray-100 border-gray-300 opacity-50'
                                  : 'border-gray-200 hover:border-amber-300 bg-white hover:bg-amber-50'
                              }`}
                            >
                              <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                                <GripVertical className="h-4 w-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900">
                                  {tower.name || '-'}
                                </div>
                                {tower.unitStandard && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    Tiêu chuẩn: {tower.unitStandard}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                {tower.unitCount && (
                                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                    {tower.unitCount} căn
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openTowerDrawerForRow('view', index)}
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                                  title="Xem"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTowerDrawerForRow('edit', index)}
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                                  title="Sửa"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTowerCopyIndex(index)}
                                  className="rounded p-1.5 text-gray-500 hover:bg-amber-100 hover:text-amber-600"
                                  title="Sao chép"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTowerDeleteIndex(index)}
                                  className="rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : isProgressStep ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h4 className="text-sm font-semibold text-gray-800">Tiến độ</h4>
                    <button
                      type="button"
                      onClick={openCreateProgressUpdate}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" /> Nhập tiến độ
                    </button>
                  </div>

                  <div className="px-4 py-3 text-sm text-gray-600">
                    Có {progressUpdates.length} mốc tiến độ
                  </div>

                  <div className="border-t border-gray-200 p-4">
                    {progressUpdates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Chưa có mốc tiến độ nào</div>
                    ) : (
                      <div className="space-y-2">
                        {progressUpdates.map((item, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={(e) => handleProgressDragStart(index, e)}
                            onDragOver={handleProgressDragOver}
                            onDrop={(e) => handleProgressDrop(index, e)}
                            onDragEnd={handleProgressDragEnd}
                            className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-move ${
                              draggedProgressIndex === index
                                ? 'bg-gray-100 border-gray-300 opacity-50'
                                : 'border-gray-200 hover:border-amber-300 bg-white hover:bg-amber-50'
                            }`}
                          >
                            <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900">{item.label}</div>
                              {item.detailHtml && (
                                <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                                  {item.detailHtml.replace(/<[^>]*>/g, '')}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {Array.isArray(item.images) && item.images.length > 0 && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {item.images.length} ảnh
                                </span>
                              )}
                              {((item.videos && item.videos.length > 0) || item.videoUrl) && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                  {item.videos && item.videos.length > 1 ? `${item.videos.length} video` : 'Video'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => openProgressUpdateDialog('view', index)}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                                title="Xem"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openProgressUpdateDialog('edit', index)}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                                title="Sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProgressDeleteIndex(index)}
                                className="rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : isDocumentStep ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h4 className="text-sm font-semibold text-gray-800">Tài liệu</h4>
                    <button
                      type="button"
                      onClick={addDocumentItem}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" /> Thêm tài liệu
                    </button>
                  </div>

                  <div className="px-4 py-3 text-sm text-gray-600">
                    Có {documentItems.length} tài liệu
                  </div>

                  <div className="border-t border-gray-200 p-4">
                    {documentItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Chưa có tài liệu nào</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[820px]">
                          <div className="grid grid-cols-[140px_220px_1fr_110px] gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            <div>Icon tài liệu</div>
                            <div>Loại tài liệu</div>
                            <div>URL tài liệu</div>
                            <div>Thao tác</div>
                          </div>

                          <div className="mt-2 space-y-2">
                            {documentItems.map((item, index) => (
                              <div
                                key={`document-row-${index}`}
                                draggable
                                onDragStart={(e) => handleDocumentDragStart(index, e)}
                                onDragOver={handleDocumentDragOver}
                                onDrop={(e) => handleDocumentDrop(index, e)}
                                onDragEnd={handleDocumentDragEnd}
                                className={`grid grid-cols-[140px_220px_1fr_110px] gap-3 rounded-lg border px-3 py-3 transition-all ${
                                  draggedDocumentIndex === index
                                    ? 'cursor-move border-gray-300 bg-gray-100 opacity-50'
                                    : 'cursor-move border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50'
                                }`}
                              >
                                <div className="flex h-10 items-stretch gap-2">
                                  <div className="flex flex-shrink-0 items-center text-gray-400 hover:text-gray-600">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <IconPicker
                                    value={item.icon ?? ''}
                                    onChange={(value) => updateDocumentItem(index, 'icon', value)}
                                    className="h-full flex-1"
                                    buttonClassName="h-full rounded-lg border-gray-300 px-3 text-sm focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    value={item.documentType}
                                    onChange={(e) =>
                                      updateDocumentItem(index, 'documentType', e.target.value)
                                    }
                                    placeholder="VD: Pháp lý, Brochure"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    value={item.documentUrl}
                                    onChange={(e) =>
                                      updateDocumentItem(index, 'documentUrl', e.target.value)
                                    }
                                    placeholder="https://..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openDocumentUrl(item.documentUrl)}
                                    disabled={!item.documentUrl.trim()}
                                    className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Mở tài liệu"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDocumentDeleteIndex(index)}
                                    className="rounded p-2 text-red-600 hover:bg-red-50"
                                    title="Xóa tài liệu"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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
        isOpen={subdivisionDeleteIndex !== null}
        onCancel={() => setSubdivisionDeleteIndex(null)}
        onConfirm={() => {
          if (subdivisionDeleteIndex !== null) {
            removeSubdivision(subdivisionDeleteIndex);
          }
          setSubdivisionDeleteIndex(null);
        }}
        title="Xóa phân khu"
        message="Bạn có chắc muốn xóa phân khu này?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
      />

      <ConfirmDialog
        isOpen={subdivisionCopyIndex !== null}
        onCancel={() => setSubdivisionCopyIndex(null)}
        onConfirm={() => {
          if (subdivisionCopyIndex !== null) {
            copySubdivision(subdivisionCopyIndex);
          }
          setSubdivisionCopyIndex(null);
        }}
        title="Sao chép phân khu"
        message="Phân khu sẽ được sao chép với tên = tên gốc + số thứ tự tăng. Dữ liệu sao chép là độc lập, xóa không ảnh hưởng đến bản gốc. Tiếp tục?"
        confirmText="Sao chép"
        cancelText="Hủy"
      />

      <ConfirmDialog
        isOpen={progressDeleteIndex !== null}
        onCancel={() => setProgressDeleteIndex(null)}
        onConfirm={() => {
          if (progressDeleteIndex !== null) {
            setProgressUpdates((prev) => prev.filter((_, idx) => idx !== progressDeleteIndex));
          }
          setProgressDeleteIndex(null);
        }}
        title="Xóa mốc tiến độ"
        message="Bạn có chắc muốn xóa mốc tiến độ này?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
      />

      <ConfirmDialog
        isOpen={documentDeleteIndex !== null}
        onCancel={() => setDocumentDeleteIndex(null)}
        onConfirm={() => {
          if (documentDeleteIndex !== null) {
            removeDocumentItem(documentDeleteIndex);
          }
          setDocumentDeleteIndex(null);
        }}
        title="Xóa tài liệu"
        message="Bạn có chắc muốn xóa tài liệu này?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
      />

      {isProgressDrawerOpen && (
        <BaseSlideOver
          isOpen={isProgressDrawerOpen}
          onClose={closeProgressDrawer}
          title={
            progressDrawerMode === 'create'
              ? 'Thêm thông tin tiến độ'
              : progressDrawerMode === 'edit'
                ? 'Chỉnh sửa thông tin tiến độ'
                : 'Xem thông tin tiến độ'
          }
          width="xl"
          zIndexClassName="z-[10010]"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeProgressDrawer}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              {progressDrawerMode !== 'view' && (
                <button
                  type="button"
                  onClick={saveProgressUpdate}
                  disabled={isUploading}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Lưu
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Nhãn tiến độ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={progressForm.label}
                onChange={(e) => setProgressForm((prev) => ({ ...prev, label: e.target.value }))}
                disabled={progressDrawerMode === 'view'}
                placeholder="Ví dụ: Tháng 11/2025"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Chi tiết tiến độ
              </label>
              <RichTextEditor
                value={progressForm.detailHtml}
                onChange={(value) => setProgressForm((prev) => ({ ...prev, detailHtml: value }))}
                placeholder="Nhập chi tiết tiến độ"
                disabled={progressDrawerMode === 'view'}
              />
            </div>

            <div>
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-800">Videos</h4>
                  {progressDrawerMode !== 'view' && (
                    <button
                      type="button"
                      onClick={() =>
                        setProgressForm((prev) => ({
                          ...prev,
                          videos: [...prev.videos, { url: '', description: '' }],
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" /> Thêm video
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 text-sm text-gray-600">
                  Có {progressForm.videos.length} video
                </div>

                <div className="border-t border-gray-200 p-4">
                  {progressForm.videos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Chưa có video nào</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[900px]">
                        <div className="grid grid-cols-[50px_200px_1fr_100px] gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                          <div></div>
                          <div>Mô tả video</div>
                          <div>URL video</div>
                          <div>Thao tác</div>
                        </div>

                        <div className="mt-2 space-y-2">
                          {progressForm.videos.map((item, index) => (
                            <div
                              key={`progress-video-${index}`}
                              draggable
                              onDragStart={(e) => {
                                setDraggedProgressIndex(index);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedProgressIndex === null || draggedProgressIndex === index) {
                                  setDraggedProgressIndex(null);
                                  return;
                                }

                                setProgressForm((prev) => {
                                  const updated = [...prev.videos];
                                  const [draggedItem] = updated.splice(draggedProgressIndex, 1);
                                  updated.splice(index, 0, draggedItem);
                                  return { ...prev, videos: updated };
                                });

                                toast.success('Sắp xếp video thành công');
                                setDraggedProgressIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedProgressIndex(null);
                              }}
                              className={`grid grid-cols-[50px_200px_1fr_100px] gap-3 rounded-lg border px-3 py-3 transition-all ${
                                draggedProgressIndex === index
                                  ? 'cursor-move border-gray-300 bg-gray-100 opacity-50'
                                  : 'cursor-move border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50'
                              }`}
                            >
                              <div className="flex items-center justify-center text-gray-400 hover:text-gray-600">
                                <GripVertical className="h-4 w-4" />
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    setProgressForm((prev) => ({
                                      ...prev,
                                      videos: prev.videos.map((x, xi) =>
                                        xi === index ? { ...x, description: e.target.value } : x,
                                      ),
                                    }))
                                  }
                                  disabled={progressDrawerMode === 'view'}
                                  placeholder="VD: Demo tiến độ"
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                                />
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={item.url}
                                  onChange={(e) =>
                                    setProgressForm((prev) => ({
                                      ...prev,
                                      videos: prev.videos.map((x, xi) =>
                                        xi === index ? { ...x, url: e.target.value } : x,
                                      ),
                                    }))
                                  }
                                  disabled={progressDrawerMode === 'view'}
                                  placeholder="https://youtu.be/... hoặc https://drive.google.com/..."
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.url.trim()) {
                                      const normalizedUrl = normalizeExternalUrl(item.url);
                                      if (normalizedUrl) {
                                        window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
                                      }
                                    }
                                  }}
                                  disabled={!item.url.trim()}
                                  className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  title="Xem video"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {progressDrawerMode !== 'view' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProgressForm((prev) => ({
                                        ...prev,
                                        videos: prev.videos.filter((_, xi) => xi !== index),
                                      }))
                                    }
                                    className="rounded p-2 text-red-600 hover:bg-red-50"
                                    title="Xóa video"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ProjectMediaUploadManager
              label="Hình ảnh"
              hint="Tối đa 10 tệp, dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG."
              items={progressForm.images}
              onItemsChange={(items) => setProgressForm((prev) => ({ ...prev, images: items }))}
              uploadFn={handleUploadFile}
              maxFiles={10}
              maxFileSizeMB={10}
              showMultiple
              onUploadingChange={handleUploadingChange}
            />
          </div>
        </BaseSlideOver>
      )}

      {projectType !== 'LOW_RISE' && isSubdivisionDialogOpen && (
        <BaseSlideOver
          isOpen={isSubdivisionDialogOpen}
          onClose={closeSubdivisionDrawer}
          title={
            subdivisionDialogMode === 'create'
              ? 'Thêm phân khu'
              : subdivisionDialogMode === 'edit'
                ? 'Chỉnh sửa phân khu'
                : 'Chi tiết phân khu'
          }
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSubdivisionDrawer}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              {subdivisionDialogMode !== 'view' && (
                <button
                  type="button"
                  onClick={() => {
                    void saveSubdivision();
                  }}
                  disabled={isSavingSubdivision || isUploadingSubdivisionImage}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  {isSavingSubdivision ? 'Đang lưu...' : 'Tiếp tục'}
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ảnh đại diện</label>
              <div
                className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
                onClick={() => {
                  if (subdivisionDialogMode !== 'view') {
                    subdivisionImageInputRef.current?.click();
                  }
                }}
              >
                {subdivisionForm.imageUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={subdivisionForm.imageUrl}
                      alt="Subdivision avatar"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    {subdivisionDialogMode !== 'view' && (
                      <span className="text-sm text-gray-600">Nhấn để đổi ảnh đại diện</span>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-sm text-gray-600">
                      Kéo thả hoặc tải tệp hình ảnh tiện ích lên tại đây.
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Dung lượng tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG.
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={subdivisionImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={subdivisionDialogMode === 'view' || isUploadingSubdivisionImage}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void handleSubdivisionImageUpload(file);
                  e.currentTarget.value = '';
                }}
              />
              {isUploadingSubdivisionImage && (
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải ảnh...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tên phân khu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subdivisionForm.name}
                  onChange={(e) =>
                    setSubdivisionForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={subdivisionDialogMode === 'view'}
                  placeholder="Nhập tên phân khu"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Số tòa nhà</label>
                <input
                  type="text"
                  value={subdivisionForm.towerCount}
                  onChange={(e) =>
                    setSubdivisionForm((prev) => ({ ...prev, towerCount: e.target.value }))
                  }
                  disabled={subdivisionDialogMode === 'view'}
                  placeholder="Nhập số tòa nhà"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tiêu chuẩn căn hộ
                </label>
                <input
                  type="text"
                  value={subdivisionForm.unitStandard}
                  onChange={(e) =>
                    setSubdivisionForm((prev) => ({ ...prev, unitStandard: e.target.value }))
                  }
                  disabled={subdivisionDialogMode === 'view'}
                  placeholder="Nhập tiêu chuẩn căn hộ"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ngày bàn giao
                </label>
                <input
                  type="date"
                  value={subdivisionForm.handoverDate}
                  onChange={(e) =>
                    setSubdivisionForm((prev) => ({ ...prev, handoverDate: e.target.value }))
                  }
                  disabled={subdivisionDialogMode === 'view'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Diện tích</label>
                <input
                  type="text"
                  value={subdivisionForm.area}
                  onChange={(e) =>
                    setSubdivisionForm((prev) => ({ ...prev, area: e.target.value }))
                  }
                  disabled={subdivisionDialogMode === 'view'}
                  placeholder="Nhập mô tả diện tích"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phong cách xây dựng
                </label>
                <input
                  type="text"
                  value={subdivisionForm.constructionStyle}
                  onChange={(e) =>
                    setSubdivisionForm((prev) => ({ ...prev, constructionStyle: e.target.value }))
                  }
                  disabled={subdivisionDialogMode === 'view'}
                  placeholder="Nhập phong cách xây dựng"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Hình thức sở hữu
              </label>
              <input
                type="text"
                value={subdivisionForm.ownershipType}
                onChange={(e) =>
                  setSubdivisionForm((prev) => ({ ...prev, ownershipType: e.target.value }))
                }
                disabled={subdivisionDialogMode === 'view'}
                placeholder="Nhập hình thức sở hữu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mô tả phân khu
              </label>
              <RichTextEditor
                value={subdivisionForm.descriptionHtml}
                onChange={(value) =>
                  setSubdivisionForm((prev) => ({ ...prev, descriptionHtml: value }))
                }
                placeholder="Nhập mô tả"
                disabled={subdivisionDialogMode === 'view'}
              />
            </div>
          </div>
        </BaseSlideOver>
      )}

      {isTowerDrawerOpen && (
        <BaseSlideOver
          isOpen={isTowerDrawerOpen}
          onClose={closeTowerDrawer}
          title={
            projectType === 'LOW_RISE'
              ? towerDrawerMode === 'create'
                ? 'Thêm phân khu'
                : towerDrawerMode === 'edit'
                  ? 'Chỉnh sửa phân khu'
                  : 'Chi tiết phân khu'
              : towerDrawerMode === 'create'
                ? 'Thêm thông tin tòa nhà'
                : towerDrawerMode === 'edit'
                  ? 'Chỉnh sửa tòa nhà'
                  : 'Chi tiết tòa nhà'
          }
          width="xl"
          zIndexClassName="z-[10001]"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTowerDrawer}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              {towerDrawerMode !== 'view' && towerCurrentStep > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void handleTowerPrevStep();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Quay lại
                </button>
              )}
              {towerDrawerMode !== 'view' && (
                <button
                  type="button"
                  onClick={() => {
                    void saveTowerToSubdivision();
                  }}
                  disabled={isSavingTowerStep}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  {isSavingTowerStep
                    ? 'Đang lưu...'
                    : towerCurrentStep === TOWER_STEPS.length - 1
                      ? 'Hoàn tất'
                      : 'Tiếp tục'}
                </button>
              )}
            </div>
          }
        >
          <div className="mb-5">
            <div>
              <div className="relative mx-auto px-2">
                <div className="absolute left-[6.75%] right-[6.75%] top-[14px] h-[2px] bg-gray-200" />
                <div
                  className="absolute left-[6.75%] top-[14px] h-[2px] bg-amber-600 transition-all"
                  style={{ width: `${(towerCurrentStep / (TOWER_STEPS.length - 1)) * 86.5}%` }}
                />

                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${TOWER_STEPS.length}, minmax(0, 1fr))` }}
                >
                  {TOWER_STEPS.map((step, index) => {
                    const isActive = index === towerCurrentStep;
                    const isDone = index < towerCurrentStep;
                    return (
                      <div key={step} className="relative flex flex-col items-center text-center">
                        <div
                          className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                            isActive
                              ? 'border-amber-600 bg-white text-amber-700'
                              : isDone
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-gray-300 bg-white text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span
                          className={`mt-2 min-h-[30px] px-1 text-[11px] leading-4 ${
                            isActive ? 'font-medium text-amber-700' : 'text-gray-600'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {towerCurrentStep === 0 && projectType === 'LOW_RISE' ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Ảnh đại diện
                  </label>
                  <div
                    className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
                    onClick={() => {
                      if (towerDrawerMode !== 'view') {
                        subdivisionImageInputRef.current?.click();
                      }
                    }}
                  >
                    {subdivisionForm.imageUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={subdivisionForm.imageUrl}
                          alt="Subdivision avatar"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        {towerDrawerMode !== 'view' && (
                          <span className="text-sm text-gray-600">Nhấn để đổi ảnh đại diện</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-sm text-gray-600">
                          Kéo thả hoặc tải tệp hình ảnh tiện ích lên tại đây.
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Dung lượng tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG.
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={subdivisionImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={towerDrawerMode === 'view' || isUploadingSubdivisionImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleSubdivisionImageUpload(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  {isUploadingSubdivisionImage && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải ảnh...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tên phân khu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subdivisionForm.name}
                      onChange={(e) =>
                        setSubdivisionForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập tên phân khu"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số căn hộ
                    </label>
                    <input
                      type="text"
                      value={subdivisionForm.unitCount}
                      onChange={(e) =>
                        setSubdivisionForm((prev) => ({ ...prev, unitCount: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập số căn hộ"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tiêu chuẩn căn hộ
                    </label>
                    <input
                      type="text"
                      value={subdivisionForm.unitStandard}
                      onChange={(e) =>
                        setSubdivisionForm((prev) => ({ ...prev, unitStandard: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập tiêu chuẩn căn hộ"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Ngày bàn giao
                    </label>
                    <input
                      type="date"
                      value={subdivisionForm.handoverDate}
                      onChange={(e) =>
                        setSubdivisionForm((prev) => ({ ...prev, handoverDate: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Diện tích
                    </label>
                    <input
                      type="text"
                      value={subdivisionForm.area}
                      onChange={(e) =>
                        setSubdivisionForm((prev) => ({ ...prev, area: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập mô tả diện tích"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Phong cách xây dựng
                    </label>
                    <input
                      type="text"
                      value={subdivisionForm.constructionStyle}
                      onChange={(e) =>
                        setSubdivisionForm((prev) => ({
                          ...prev,
                          constructionStyle: e.target.value,
                        }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập phong cách xây dựng"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Hình thức sở hữu
                  </label>
                  <input
                    type="text"
                    value={subdivisionForm.ownershipType}
                    onChange={(e) =>
                      setSubdivisionForm((prev) => ({ ...prev, ownershipType: e.target.value }))
                    }
                    disabled={towerDrawerMode === 'view'}
                    placeholder="Nhập hình thức sở hữu"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Mô tả phân khu
                  </label>
                  <RichTextEditor
                    value={subdivisionForm.descriptionHtml}
                    onChange={(value) =>
                      setSubdivisionForm((prev) => ({ ...prev, descriptionHtml: value }))
                    }
                    placeholder="Nhập mô tả"
                    disabled={towerDrawerMode === 'view'}
                  />
                </div>
              </>
            ) : towerCurrentStep === 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tên tòa nhà <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={towerForm.name}
                      onChange={(e) => setTowerForm((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập tòa nhà"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Phân khu
                    </label>
                    <input
                      type="text"
                      value={selectedSubdivision?.name ?? ''}
                      disabled
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số tầng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={towerForm.floorCount}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, floorCount: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập số tầng"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số căn hộ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={towerForm.unitCount}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, unitCount: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập số căn hộ"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số thang máy
                    </label>
                    <input
                      type="text"
                      value={towerForm.elevatorCount}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, elevatorCount: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập số thang máy"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Hình thức sở hữu
                    </label>
                    <input
                      type="text"
                      value={towerForm.ownershipType}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, ownershipType: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập hình thức sở hữu"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tiêu chuẩn bàn giao
                    </label>
                    <input
                      type="text"
                      value={towerForm.handoverStandard}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, handoverStandard: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập tiêu chuẩn bàn giao"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tiến độ thi công
                    </label>
                    <input
                      type="text"
                      value={towerForm.constructionProgress}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, constructionProgress: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="VD: 30%, Đang đổ móng..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Thời điểm khởi công
                    </label>
                    <input
                      type="date"
                      value={towerForm.constructionStartDate}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, constructionStartDate: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Thời điểm hoàn thành
                    </label>
                    <input
                      type="date"
                      value={towerForm.completionDate}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, completionDate: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Mô tả tòa nhà
                  </label>
                  <RichTextEditor
                    value={towerForm.descriptionHtml}
                    onChange={(value) =>
                      setTowerForm((prev) => ({ ...prev, descriptionHtml: value }))
                    }
                    placeholder="Nhập mô tả"
                    disabled={towerDrawerMode === 'view'}
                  />
                </div>
              </>
            ) : towerCurrentStep === 1 ? (
              <>
                {isLoadingProjectLocation ? (
                  <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="mb-1.5 h-4 w-28 rounded bg-gray-200" />
                        <div className="h-10 w-full rounded-lg bg-gray-200" />
                      </div>
                      <div>
                        <div className="mb-1.5 h-4 w-28 rounded bg-gray-200" />
                        <div className="h-10 w-full rounded-lg bg-gray-200" />
                      </div>
                    </div>
                    <div className="min-h-[220px] rounded-xl bg-gray-200" />
                    <div>
                      <div className="mb-1.5 h-4 w-24 rounded bg-gray-200" />
                      <div className="h-10 w-full rounded-lg bg-gray-200" />
                    </div>
                    <div className="min-h-[220px] rounded-xl bg-gray-200" />
                    <div>
                      <div className="mb-1.5 h-4 w-20 rounded bg-gray-200" />
                      <div className="h-32 w-full rounded-lg bg-gray-200" />
                    </div>
                  </div>
                ) : null}
                {!isLoadingProjectLocation && (
                  <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Vĩ độ (Latitude) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={towerForm.latitude}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, latitude: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập vĩ độ"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Kinh độ (Longitude) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={towerForm.longitude}
                      onChange={(e) =>
                        setTowerForm((prev) => ({ ...prev, longitude: e.target.value }))
                      }
                      disabled={towerDrawerMode === 'view'}
                      placeholder="Nhập kinh độ"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 min-h-[220px] overflow-hidden">
                  {towerCoordinatePreviewUrl ? (
                    <iframe
                      title="Tower coordinate preview"
                      src={towerCoordinatePreviewUrl}
                      className="h-[190px] w-full rounded-lg border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="flex h-[190px] flex-col items-center justify-center gap-3 text-center text-gray-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                        <MapPinned className="h-7 w-7 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có tọa độ để hiển thị bản đồ
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Nhập vĩ độ và kinh độ để xem vị trí tòa nhà.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Google Mymap
                  </label>
                  <input
                    type="text"
                    value={towerForm.googleMapUrl}
                    onChange={(e) =>
                      setTowerForm((prev) => ({ ...prev, googleMapUrl: e.target.value }))
                    }
                    disabled={towerDrawerMode === 'view'}
                    placeholder="Nhập link bản đồ"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 min-h-[220px] overflow-hidden">
                  {towerGoogleMapPreviewUrl ? (
                    <iframe
                      title="Tower Google MyMap preview"
                      src={towerGoogleMapPreviewUrl}
                      className="h-[190px] w-full rounded-lg border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="flex h-[190px] flex-col items-center justify-center gap-3 text-center text-gray-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                        <MapPinned className="h-7 w-7 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Nhập link để hiển thị Google MyMap
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Hỗ trợ tốt nhất với link chia sẻ hoặc embed của Google My Maps.
                        </p>
                      </div>
                      {towerGoogleMapExternalUrl && (
                        <a
                          href={towerGoogleMapExternalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Mở liên kết bản đồ <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Mô tả vị trí
                  </label>
                  <RichTextEditor
                    value={towerForm.locationDescriptionHtml}
                    onChange={(value) =>
                      setTowerForm((prev) => ({ ...prev, locationDescriptionHtml: value }))
                    }
                    placeholder="Nhập mô tả"
                    disabled={towerDrawerMode === 'view'}
                  />
                </div>
                  </>
                )}
              </>
            ) : towerCurrentStep === 2 ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Link nhúng 360 (Iframe/URL)
                  </label>
                  <input
                    type="text"
                    value={towerForm.camera360Url}
                    onChange={(e) =>
                      setTowerForm((prev) => ({ ...prev, camera360Url: e.target.value }))
                    }
                    disabled={towerDrawerMode === 'view'}
                    placeholder="https://view360.example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 min-h-[220px] overflow-hidden">
                  {towerCamera360PreviewUrl ? (
                    <iframe
                      title="Tower 360 preview"
                      src={towerCamera360PreviewUrl}
                      className="h-[190px] w-full rounded-lg border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="flex h-[190px] flex-col items-center justify-center gap-3 text-center text-gray-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                        <Camera className="h-7 w-7 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có link nhúng 360 để xem thử
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Nhập URL/iframe hợp lệ để hiển thị preview.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <ProjectMediaUploadManager
                  label="Hình ảnh toàn cảnh 360"
                  hint="Dung lượng mỗi tệp tối đa 10MB. Hỗ trợ tệp: PNG, JPG, JPEG. Kích thước 1910x735px."
                  items={towerForm.camera360Images}
                  onItemsChange={(items) =>
                    setTowerForm((prev) => ({ ...prev, camera360Images: items }))
                  }
                  uploadFn={handleUploadFile}
                  maxFiles={20}
                  maxFileSizeMB={10}
                  showMultiple
                  onUploadingChange={(uploading) => setIsUploadingTowerMedia(uploading)}
                />

                {towerForm.camera360Images.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Danh sách ảnh 360 xem thử
                    </label>
                    <TowerCamera360Viewer items={towerForm.camera360Images} />
                  </div>
                )}
              </>
            ) : towerCurrentStep === 3 ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Danh sách sản phẩm trong quỹ hàng
                    </p>
                    <p className="text-xs text-gray-500">
                      1 tòa nhà có thể chứa nhiều sản phẩm từ kho sản phẩm.
                    </p>
                  </div>
                  {towerDrawerMode !== 'view' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!workspaceId) {
                          toast.error('Không xác định được workspace để tải kho sản phẩm');
                          return;
                        }
                        setIsTowerProductDialogOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" /> Thêm sản phẩm
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
                    Có {towerForm.fundProducts.length} sản phẩm đã chọn
                  </div>
                  {towerForm.fundProducts.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Chưa có sản phẩm nào trong quỹ hàng. Nhấn Thêm sản phẩm để chọn từ kho.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="px-4 py-2 text-left font-medium">Mã sản phẩm</th>
                            <th className="px-4 py-2 text-left font-medium">Tên sản phẩm</th>
                            <th className="px-4 py-2 text-left font-medium">Kho hàng</th>
                            {towerDrawerMode !== 'view' && (
                              <th className="px-4 py-2 text-right font-medium">Thao tác</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {towerForm.fundProducts.map((item) => (
                            <tr key={item.productId} className="border-t border-gray-100">
                              <td className="px-4 py-2">{item.unitCode}</td>
                              <td className="px-4 py-2">{item.name}</td>
                              <td className="px-4 py-2">{item.warehouseName || '-'}</td>
                              {towerDrawerMode !== 'view' && (
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeFundProductFromTower(item.productId)}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Bỏ khỏi quỹ hàng
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : towerCurrentStep === 4 ? (
              <>
                <ProjectMediaUploadManager
                  label="Hình ảnh mặt bằng quỹ hàng"
                  hint="Upload hình ảnh mặt bằng tầng. Sau đó bấm Đặt vị trí để gắn marker sản phẩm lên từng hình."
                  items={towerForm.floorPlanImages}
                  onItemsChange={(newItems) => {
                    setTowerForm((prev) => {
                      // Merge: preserve existing markers when items are reordered / renamed
                      const merged: FloorPlanImage[] = newItems.map((item) => {
                        const existing = prev.floorPlanImages.find(
                          (fp) => fp.originalUrl === item.originalUrl,
                        );
                        return { ...item, markers: existing?.markers };
                      });
                      return { ...prev, floorPlanImages: merged };
                    });
                  }}
                  uploadFn={handleUploadFile}
                  maxFiles={20}
                  maxFileSizeMB={10}
                  showMultiple
                  onUploadingChange={(uploading) => setIsUploadingTowerMedia(uploading)}
                />

                {towerForm.floorPlanImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Gắn vị trí sản phẩm</p>
                    {towerForm.floorPlanImages.map((img, idx) => {
                      const markerCount = img.markers?.length ?? 0;
                      const assignedCount = img.markers?.filter((m) => m.productId).length ?? 0;
                      return (
                        <div
                          key={img.originalUrl + idx}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <img
                            src={img.thumbnailUrl || img.originalUrl}
                            alt={img.fileName || `Hình ${idx + 1}`}
                            className="h-12 w-20 shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {img.fileName || `Hình ${idx + 1}`}
                            </p>
                            {markerCount > 0 ? (
                              <p className="mt-0.5 text-xs text-gray-500">
                                {markerCount} marker · {assignedCount} đã gán sản phẩm
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-gray-400">Chưa có marker</p>
                            )}
                          </div>
                          {towerDrawerMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => {
                                setFloorPlanEditorIndex(idx);
                                setFloorPlanEditorOpen(true);
                              }}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Đặt vị trí
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : towerCurrentStep === 5 ? (
              <>
                <ProjectMediaUploadManager
                  label="Hình ảnh chính sách bán hàng"
                  hint="Upload danh sách hình ảnh chính sách bán hàng. Có thể chỉnh sửa tên/mô tả từng ảnh sau khi tải lên."
                  items={towerForm.salesPolicyImages}
                  onItemsChange={(items) =>
                    setTowerForm((prev) => ({ ...prev, salesPolicyImages: items }))
                  }
                  uploadFn={handleUploadFile}
                  maxFiles={20}
                  maxFileSizeMB={10}
                  showMultiple
                  onUploadingChange={(uploading) => setIsUploadingTowerMedia(uploading)}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700">
                  Bước {towerCurrentStep + 1}: {TOWER_STEPS[towerCurrentStep]}
                </p>
                <p className="mt-1">
                  Dữ liệu hiện tại của tòa nhà sẽ được lưu khi bấm Tiếp tục. Nội dung chi tiết cho
                  bước này sẽ được bổ sung ở phase tiếp theo.
                </p>
              </div>
            )}
          </div>
        </BaseSlideOver>
      )}

      {/* Floor Plan Marker Editor */}
      {floorPlanEditorOpen &&
        floorPlanEditorIndex !== null &&
        towerForm.floorPlanImages[floorPlanEditorIndex] && (
          <TowerFloorPlanEditor
            isOpen={floorPlanEditorOpen}
            image={towerForm.floorPlanImages[floorPlanEditorIndex]}
            fundProducts={towerForm.fundProducts}
            onSave={(updated: FloorPlanImage) => {
              setTowerForm((prev) => {
                const next = [...prev.floorPlanImages];
                next[floorPlanEditorIndex!] = updated;
                return { ...prev, floorPlanImages: next };
              });
            }}
            onClose={() => {
              setFloorPlanEditorOpen(false);
              setFloorPlanEditorIndex(null);
            }}
          />
        )}

      <BaseSlideOver
        isOpen={isTowerProductDialogOpen}
        onClose={() => {
          setIsTowerProductDialogOpen(false);
          setTowerProductKeyword('');
          setTowerWarehouseFilter('');
          setTowerWarehouses([]);
          setTowerProducts([]);
        }}
        title="Thêm sản phẩm"
        zIndexClassName="z-[10030]"
        width="xl"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsTowerProductDialogOpen(false);
                setTowerProductKeyword('');
                setTowerWarehouseFilter('');
                setTowerWarehouses([]);
                setTowerProducts([]);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={towerProductKeyword}
              onChange={(e) => setTowerProductKeyword(e.target.value)}
              placeholder="Tìm theo mã / tên sản phẩm"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select
              value={towerWarehouseFilter}
              onChange={(e) => setTowerWarehouseFilter(e.target.value)}
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tất cả kho</option>
              {towerWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600">Có {towerProducts.length} kết quả</div>

          <BaseDataGrid<TowerProductOption>
            data={towerProducts}
            isLoading={isLoadingTowerProducts}
            pageSize={10}
            emptyMessage="Không có sản phẩm phù hợp"
            columns={[
              {
                key: 'select',
                label: 'Chọn',
                headerClassName: 'w-14',
                render: (_val, product) => {
                  const selected = towerForm.fundProducts.some(
                    (item) => item.productId === product.id,
                  );
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selected) {
                          removeFundProductFromTower(product.id);
                        } else {
                          addFundProductToTower(product);
                        }
                      }}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                        selected
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-gray-300 bg-white text-transparent'
                      }`}
                      aria-label={selected ? 'Bỏ chọn sản phẩm' : 'Chọn sản phẩm'}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  );
                },
              },
              { key: 'unitCode', label: 'Mã sản phẩm' },
              { key: 'name', label: 'Tên sản phẩm' },
              {
                key: 'warehouseName',
                label: 'Kho hàng',
                render: (val) => (typeof val === 'string' && val.trim() ? val : '—'),
              },
            ]}
            rowClassName={(product) =>
              towerForm.fundProducts.some((item) => item.productId === product.id)
                ? 'bg-amber-50'
                : ''
            }
            onRowClick={(product) => {
              const selected = towerForm.fundProducts.some((item) => item.productId === product.id);
              if (selected) {
                removeFundProductFromTower(product.id);
              } else {
                addFundProductToTower(product);
              }
            }}
          />
        </div>
      </BaseSlideOver>

      <ConfirmDialog
        isOpen={towerDeleteIndex !== null}
        onCancel={() => setTowerDeleteIndex(null)}
        onConfirm={() => {
          if (towerDeleteIndex !== null) {
            removeTowerFromSubdivision(towerDeleteIndex);
          }
          setTowerDeleteIndex(null);
        }}
        title="Xóa tòa nhà"
        message="Bạn có chắc muốn xóa tòa nhà này?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
      />

      <ConfirmDialog
        isOpen={towerCopyIndex !== null}
        onCancel={() => setTowerCopyIndex(null)}
        onConfirm={() => {
          if (towerCopyIndex !== null) {
            copyTowerFromSubdivision(towerCopyIndex);
          }
          setTowerCopyIndex(null);
        }}
        title="Sao chép tòa nhà"
        message="Tòa nhà sẽ được sao chép với tên = tên gốc + số thứ tự tăng. Tiếp tục?"
        confirmText="Sao chép"
        cancelText="Hủy"
      />

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

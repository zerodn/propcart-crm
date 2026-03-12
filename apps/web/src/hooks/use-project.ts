import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export interface MediaItem {
  originalUrl: string;
  fileName?: string;
  thumbnailUrl?: string;
  description?: string;
}

export interface PlanningStat {
  label: string;
  icon?: string;
  value: string;
}

export interface ProjectProgressUpdate {
  label: string;
  detailHtml?: string;
  videoUrl?: string;
  images?: MediaItem[];
}

export interface ProjectDocumentItem {
  icon?: string;
  documentType: string;
  documentUrl: string;
}

export interface ProjectSubdivision {
  towers?: ProjectTower[];
  name: string;
  imageUrl?: string;
  towerCount?: string;
  unitCount?: string;
  unitStandard?: string;
  handoverDate?: string;
  area?: string;
  constructionStyle?: string;
  ownershipType?: string;
  descriptionHtml?: string;
}

export interface ProjectTower {
  name: string;
  floorCount?: string;
  unitCount?: string;
  elevatorCount?: string;
  ownershipType?: string;
  handoverStandard?: string;
  constructionStartDate?: string;
  completionDate?: string;
  latitude?: string;
  longitude?: string;
  googleMapUrl?: string;
  locationDescriptionHtml?: string;
  camera360Url?: string;
  camera360Images?: MediaItem[];
  salesPolicyImages?: MediaItem[];
  fundProducts?: TowerFundProduct[];
  floorPlanImages?: FloorPlanImage[];
  descriptionHtml?: string;
}

export interface TowerFundProduct {
  productId: string;
  unitCode: string;
  name: string;
  warehouseId?: string;
  warehouseName?: string;
}

export interface FloorPlanMarker {
  id: string;
  x: number;
  y: number;
  productId?: string;
  productUnitCode?: string;
  productName?: string;
}

export interface FloorPlanImage extends MediaItem {
  markers?: FloorPlanMarker[];
}

export interface ProjectContact {
  name: string;
  title?: string;
  phone?: string;
  zaloPhone?: string;
  imageUrl?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  projectType: 'LOW_RISE' | 'HIGH_RISE';
  ownerId?: string | null;
  displayStatus: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  saleStatus: 'COMING_SOON' | 'ON_SALE' | 'SOLD_OUT';
  bannerUrl?: string | null;
  bannerUrls?: MediaItem[] | null;
  overviewHtml?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  googleMapUrl?: string | null;
  locationDescriptionHtml?: string | null;
  zoneImageUrl?: string | null;
  zoneImages?: MediaItem[] | null;
  productImageUrl?: string | null;
  productImages?: MediaItem[] | null;
  amenityImageUrl?: string | null;
  amenityImages?: MediaItem[] | null;
  videoUrl?: string | null;
  videoDescription?: string | null;
  contacts?: ProjectContact[] | null;
  planningStats?: PlanningStat[] | null;
  progressUpdates?: ProjectProgressUpdate[] | null;
  documentItems?: ProjectDocumentItem[] | null;
  subdivisions?: ProjectSubdivision[] | null;
  createdByUserId: string;
  createdBy?: { id: string; fullName?: string; phone?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  projectType: 'LOW_RISE' | 'HIGH_RISE';
  ownerId?: string;
  displayStatus?: string;
  saleStatus?: string;
  bannerUrl?: string;
  bannerUrls?: MediaItem[];
  overviewHtml?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  latitude?: string;
  longitude?: string;
  googleMapUrl?: string;
  locationDescriptionHtml?: string;
  zoneImageUrl?: string;
  zoneImages?: MediaItem[];
  productImageUrl?: string;
  productImages?: MediaItem[];
  amenityImageUrl?: string;
  amenityImages?: MediaItem[];
  videoUrl?: string;
  videoDescription?: string;
  contacts?: ProjectContact[];
  planningStats?: PlanningStat[];
  progressUpdates?: ProjectProgressUpdate[];
  documentItems?: ProjectDocumentItem[];
  subdivisions?: ProjectSubdivision[];
}

function normalizeProject(raw: any): Project {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    name: raw.name,
    projectType: raw.projectType,
    ownerId: raw.ownerId ?? null,
    displayStatus: raw.displayStatus ?? 'DRAFT',
    saleStatus: raw.saleStatus ?? 'COMING_SOON',
    bannerUrl: raw.bannerUrl ?? null,
    bannerUrls: (() => {
      const raw_urls = raw.bannerUrls;
      if (!raw_urls) return null;
      if (Array.isArray(raw_urls)) {
        // Support both old string[] format and new MediaItem[] format
        return raw_urls.map((item: any) =>
          typeof item === 'string'
            ? { originalUrl: item, fileName: 'Banner', thumbnailUrl: item }
            : item,
        );
      }
      return null;
    })(),
    overviewHtml: raw.overviewHtml ?? null,
    address: raw.address ?? null,
    province: raw.province ?? null,
    district: raw.district ?? null,
    ward: raw.ward ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    googleMapUrl: raw.googleMapUrl ?? null,
    locationDescriptionHtml: raw.locationDescriptionHtml ?? null,
    zoneImageUrl: raw.zoneImageUrl ?? null,
    zoneImages: Array.isArray(raw.zoneImages) ? raw.zoneImages : null,
    productImageUrl: raw.productImageUrl ?? null,
    productImages: Array.isArray(raw.productImages) ? raw.productImages : null,
    amenityImageUrl: raw.amenityImageUrl ?? null,
    amenityImages: Array.isArray(raw.amenityImages) ? raw.amenityImages : null,
    videoUrl: raw.videoUrl ?? null,
    videoDescription: raw.videoDescription ?? null,
    contacts: Array.isArray(raw.contacts) ? raw.contacts : null,
    planningStats: Array.isArray(raw.planningStats) ? raw.planningStats : null,
    progressUpdates: Array.isArray(raw.progressUpdates) ? raw.progressUpdates : null,
    documentItems: Array.isArray(raw.documentItems) ? raw.documentItems : null,
    subdivisions: Array.isArray(raw.subdivisions) ? raw.subdivisions : null,
    createdByUserId: raw.createdByUserId,
    createdBy: raw.createdBy ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function useProject(workspaceId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const list = useCallback(
    async (params?: {
      search?: string;
      projectType?: string;
      displayStatus?: string;
      saleStatus?: string;
      page?: number;
      limit?: number;
    }) => {
      if (!workspaceId) return;
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/workspaces/${workspaceId}/projects`, { params });
        const items = (res.data?.data ?? []).map(normalizeProject);
        setProjects(items);
        setTotal(res.data?.meta?.total ?? items.length);
      } catch {
        toast.error('Không thể tải danh sách dự án');
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  const create = useCallback(
    async (
      payload: CreateProjectPayload,
      options?: { silent?: boolean },
    ): Promise<Project | null> => {
      try {
        const res = await apiClient.post(`/workspaces/${workspaceId}/projects`, payload);
        const created = normalizeProject(res.data?.data ?? res.data);
        setProjects((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
        if (!options?.silent) {
          toast.success('Tạo dự án thành công');
        }
        return created;
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Không thể tạo dự án');
        return null;
      }
    },
    [workspaceId],
  );

  const update = useCallback(
    async (
      id: string,
      payload: Partial<CreateProjectPayload>,
      options?: { silent?: boolean },
    ): Promise<Project | null> => {
      try {
        const res = await apiClient.patch(`/workspaces/${workspaceId}/projects/${id}`, payload);
        const updated = normalizeProject(res.data?.data ?? res.data);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        if (!options?.silent) {
          toast.success('Cập nhật dự án thành công');
        }
        return updated;
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Không thể cập nhật dự án');
        return null;
      }
    },
    [workspaceId],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/workspaces/${workspaceId}/projects/${id}`);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        toast.success('Xóa dự án thành công');
        return true;
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Không thể xóa dự án');
        return false;
      }
    },
    [workspaceId],
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const formData = new FormData();
        formData.append('files', file);
        const res = await apiClient.post(
          `/workspaces/${workspaceId}/products/upload-files`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        const urls: string[] = res.data?.data?.urls ?? res.data?.urls ?? [];
        return urls[0] ?? null;
      } catch {
        toast.error('Upload ảnh thất bại');
        return null;
      }
    },
    [workspaceId],
  );

  return { projects, total, isLoading, list, create, update, remove, uploadImage };
}

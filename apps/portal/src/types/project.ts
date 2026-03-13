export interface MediaItem {
  originalUrl: string;
  thumbnailUrl?: string;
  fileName?: string;
  description?: string;
}

export interface ContactItem {
  name: string;
  title?: string;
  phone?: string;
  zaloPhone?: string;
  imageUrl?: string;
}

export interface PlanningStatItem {
  label: string;
  icon?: string;
  value: string;
}

export interface ProgressUpdateItem {
  label: string;
  detailHtml?: string;
  videoUrl?: string;
  images?: MediaItem[];
}

export interface DocumentItem {
  icon?: string;
  documentType: string;
  documentUrl: string;
}

export interface SubdivisionItem {
  name: string;
  unitCount?: number;
  unitStandard?: string;
}

export interface Project {
  id: string;
  name: string;
  projectType: 'HIGH_RISE' | 'LOW_RISE' | string;
  displayStatus: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  saleStatus: 'COMING_SOON' | 'ON_SALE' | 'SOLD_OUT';

  // Banner
  bannerUrl?: string;
  bannerUrls?: MediaItem[];

  // Overview
  overviewHtml?: string;

  // Location
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  latitude?: string;
  longitude?: string;
  googleMapUrl?: string;
  locationDescriptionHtml?: string;

  // Media sections
  zoneImageUrl?: string;
  zoneImages?: MediaItem[];
  productImageUrl?: string;
  productImages?: MediaItem[];
  amenityImageUrl?: string;
  amenityImages?: MediaItem[];

  // Video
  videoUrl?: string;
  videoDescription?: string;

  // JSON data
  contacts?: ContactItem[];
  planningStats?: PlanningStatItem[];
  progressUpdates?: ProgressUpdateItem[];
  documentItems?: DocumentItem[];
  subdivisions?: SubdivisionItem[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  workspaceId?: string;
}

export interface ProjectsResponse {
  data: Project[];
  meta: { total: number; page: number; limit: number };
}

export interface ProjectResponse {
  data: Project;
}



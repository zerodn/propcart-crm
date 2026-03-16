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
  videoUrl?: string; // backward compat
  videos?: { url: string; description?: string }[];
  images?: MediaItem[];
}

export interface DocumentItem {
  icon?: string;
  documentType: string;
  documentUrl: string;
}

export interface TowerFundProduct {
  productId: string;
  unitCode: string;
  name: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouse?: { id: string; name: string; code: string } | null;
  priceWithVat?: number;
  priceWithoutVat?: number;
  isContactForPrice?: boolean;
  area?: number;
  direction?: string;
  zone?: string;
  propertyType?: string;
  block?: string;
}

export interface PortalProductImage {
  fileName?: string;
  originalUrl: string;
  thumbnailUrl?: string;
}

export interface PortalProductDocument {
  documentType: string;
  fileName: string;
  fileUrl: string;
}

export interface PortalProductContact {
  id: string;
  userId: string | null;
  name: string;
  title?: string | null;
  phone?: string | null;
  zaloPhone?: string | null;
  imageUrl?: string | null;
}

export interface PortalProduct {
  id: string;
  workspaceId: string;
  warehouseId?: string;
  name: string;
  unitCode: string;
  tags?: string[];
  propertyType: string;
  zone?: string;
  block?: string;
  direction?: string;
  area?: number;
  priceWithoutVat?: number;
  priceWithVat?: number;
  isContactForPrice?: boolean;
  promotionProgram?: string;
  policyImageUrls?: PortalProductImage[];
  productDocuments?: PortalProductDocument[];
  callPhone?: string;
  zaloPhone?: string;
  transactionStatus: string;
  note?: string;
  warehouse?: { id: string; name: string; code: string } | null;
  contactMembers?: PortalProductContact[];
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

export interface TowerItem {
  name: string;
  floorCount?: string;
  unitCount?: string;
  elevatorCount?: string;
  ownershipType?: string;
  handoverStandard?: string;
  constructionProgress?: string;
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

export interface SubdivisionItem {
  name: string;
  unitCount?: number | string;
  unitStandard?: string;
  imageUrl?: string;
  towerCount?: string;
  area?: string;
  constructionStyle?: string;
  ownershipType?: string;
  handoverDate?: string;
  descriptionHtml?: string;
  towers?: TowerItem[];
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



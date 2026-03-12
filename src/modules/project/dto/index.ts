import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MediaItemDto {
  @IsString()
  @IsNotEmpty()
  originalUrl: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class PlanningStat {
  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  value: string;
}

export class ProjectSubdivision {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectTower)
  towers?: ProjectTower[];

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  towerCount?: string;

  @IsString()
  @IsOptional()
  unitCount?: string;

  @IsString()
  @IsOptional()
  unitStandard?: string;

  @IsString()
  @IsOptional()
  handoverDate?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  constructionStyle?: string;

  @IsString()
  @IsOptional()
  ownershipType?: string;

  @IsString()
  @IsOptional()
  descriptionHtml?: string;
}

export class ProjectTower {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  floorCount?: string;

  @IsString()
  @IsOptional()
  unitCount?: string;

  @IsString()
  @IsOptional()
  elevatorCount?: string;

  @IsString()
  @IsOptional()
  ownershipType?: string;

  @IsString()
  @IsOptional()
  handoverStandard?: string;

  @IsString()
  @IsOptional()
  constructionStartDate?: string;

  @IsString()
  @IsOptional()
  completionDate?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  googleMapUrl?: string;

  @IsString()
  @IsOptional()
  locationDescriptionHtml?: string;

  @IsString()
  @IsOptional()
  camera360Url?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  camera360Images?: MediaItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  salesPolicyImages?: MediaItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectTowerFundProduct)
  fundProducts?: ProjectTowerFundProduct[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FloorPlanImageDto)
  floorPlanImages?: FloorPlanImageDto[];

  @IsString()
  @IsOptional()
  descriptionHtml?: string;
}

export class ProjectTowerFundProduct {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  unitCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  warehouseName?: string;
}

export class FloorPlanMarkerDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Type(() => Number)
  x: number;

  @IsNumber()
  @Type(() => Number)
  y: number;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  productUnitCode?: string;

  @IsString()
  @IsOptional()
  productName?: string;
}

export class FloorPlanImageDto {
  @IsString()
  @IsNotEmpty()
  originalUrl: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FloorPlanMarkerDto)
  markers?: FloorPlanMarkerDto[];
}

export class ProjectContact {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  zaloPhone?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class ProjectProgressUpdateDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  detailHtml?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  images?: MediaItemDto[];
}

export class ProjectDocumentItemDto {
  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  documentUrl: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['LOW_RISE', 'HIGH_RISE'])
  projectType: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'HIDDEN'])
  displayStatus?: string;

  @IsString()
  @IsOptional()
  @IsIn(['COMING_SOON', 'ON_SALE', 'SOLD_OUT'])
  saleStatus?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  bannerUrls?: MediaItemDto[];

  @IsString()
  @IsOptional()
  overviewHtml?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  ward?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  googleMapUrl?: string;

  @IsString()
  @IsOptional()
  locationDescriptionHtml?: string;

  @IsString()
  @IsOptional()
  zoneImageUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  zoneImages?: MediaItemDto[];

  @IsString()
  @IsOptional()
  productImageUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  productImages?: MediaItemDto[];

  @IsString()
  @IsOptional()
  amenityImageUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  amenityImages?: MediaItemDto[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  videoDescription?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectContact)
  contacts?: ProjectContact[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanningStat)
  planningStats?: PlanningStat[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectProgressUpdateDto)
  progressUpdates?: ProjectProgressUpdateDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectDocumentItemDto)
  documentItems?: ProjectDocumentItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectSubdivision)
  subdivisions?: ProjectSubdivision[];
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(['LOW_RISE', 'HIGH_RISE'])
  projectType?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'HIDDEN'])
  displayStatus?: string;

  @IsString()
  @IsOptional()
  @IsIn(['COMING_SOON', 'ON_SALE', 'SOLD_OUT'])
  saleStatus?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  bannerUrls?: MediaItemDto[];

  @IsString()
  @IsOptional()
  overviewHtml?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  ward?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  googleMapUrl?: string;

  @IsString()
  @IsOptional()
  locationDescriptionHtml?: string;

  @IsString()
  @IsOptional()
  zoneImageUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  zoneImages?: MediaItemDto[];

  @IsString()
  @IsOptional()
  productImageUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  productImages?: MediaItemDto[];

  @IsString()
  @IsOptional()
  amenityImageUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  amenityImages?: MediaItemDto[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  videoDescription?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectContact)
  contacts?: ProjectContact[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanningStat)
  planningStats?: PlanningStat[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectProgressUpdateDto)
  progressUpdates?: ProjectProgressUpdateDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectDocumentItemDto)
  documentItems?: ProjectDocumentItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectSubdivision)
  subdivisions?: ProjectSubdivision[];
}

export class ListProjectDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['LOW_RISE', 'HIGH_RISE'])
  projectType?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'HIDDEN'])
  displayStatus?: string;

  @IsString()
  @IsOptional()
  @IsIn(['COMING_SOON', 'ON_SALE', 'SOLD_OUT'])
  saleStatus?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

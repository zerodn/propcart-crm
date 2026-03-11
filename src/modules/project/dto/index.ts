import { IsString, IsOptional, IsIn, IsArray, IsUrl, ValidateNested, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PlanningStat {
  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  value: string;
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
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
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
  @IsString({ each: true })
  bannerUrls?: string[];

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
  zoneImageUrl?: string;

  @IsString()
  @IsOptional()
  productImageUrl?: string;

  @IsString()
  @IsOptional()
  amenityImageUrl?: string;

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
  @IsString({ each: true })
  bannerUrls?: string[];

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
  zoneImageUrl?: string;

  @IsString()
  @IsOptional()
  productImageUrl?: string;

  @IsString()
  @IsOptional()
  amenityImageUrl?: string;

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

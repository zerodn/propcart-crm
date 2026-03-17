import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const toNumberOrUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

class ProductDocumentDto {
  @IsString()
  documentType: string;

  @IsString()
  fileName: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'fileUrl khong hop le' })
  fileUrl: string;
}

export class ProductContact {
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

class ProductImageDto {
  @IsOptional()
  @IsString()
  fileName?: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'originalUrl khong hop le' })
  originalUrl: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'thumbnailUrl khong hop le' })
  thumbnailUrl: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  unitCode: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsString()
  propertyType: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  area?: number;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithoutVat?: number;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithVat?: number;

  @IsOptional()
  @IsIn([true, false])
  isContactForPrice?: boolean;

  @IsOptional()
  @IsIn([true, false])
  isHidden?: boolean;

  @IsOptional()
  @IsString()
  promotionProgram?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  policyImageUrls?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDocumentDto)
  productDocuments?: ProductDocumentDto[];

  @IsOptional()
  @IsString()
  callPhone?: string;

  @IsOptional()
  @IsString()
  zaloPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactMemberIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductContact)
  contacts?: ProductContact[];

  @IsOptional()
  @IsString()
  transactionStatus?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unitCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  area?: number | null;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithoutVat?: number | null;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithVat?: number | null;

  @IsOptional()
  @IsIn([true, false])
  isContactForPrice?: boolean;

  @IsOptional()
  @IsIn([true, false])
  isHidden?: boolean;

  @IsOptional()
  @IsString()
  promotionProgram?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  policyImageUrls?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDocumentDto)
  productDocuments?: ProductDocumentDto[];

  @IsOptional()
  @IsString()
  callPhone?: string;

  @IsOptional()
  @IsString()
  zaloPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactMemberIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductContact)
  contacts?: ProductContact[];

  @IsOptional()
  @IsString()
  transactionStatus?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ListProductDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  transactionStatus?: string;

  @IsOptional()
  @IsIn([true, false])
  includeHidden?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

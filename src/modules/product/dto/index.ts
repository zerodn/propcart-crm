import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

const toNumberOrUndefined = ({ value }: { value: any }) => {
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

export class CreateProductDto {
  @IsString()
  propertyType: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsString()
  unitCode: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  area?: number;

  @IsString()
  warehouseId: string;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithoutVat?: number;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithVat?: number;

  @IsOptional()
  @IsString()
  promotionProgram?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({ require_tld: false }, { each: true, message: 'policyImageUrls khong hop le' })
  policyImageUrls?: string[];

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
  @IsString()
  transactionStatus?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateProductDto {
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
  unitCode?: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  area?: number | null;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithoutVat?: number | null;

  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsNumber()
  priceWithVat?: number | null;

  @IsOptional()
  @IsString()
  promotionProgram?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({ require_tld: false }, { each: true, message: 'policyImageUrls khong hop le' })
  policyImageUrls?: string[];

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
}

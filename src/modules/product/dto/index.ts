import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

const toNumberOrUndefined = ({ value }: { value: any }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

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
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'priceSheetUrl không hợp lệ' })
  priceSheetUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'salesPolicyUrl không hợp lệ' })
  salesPolicyUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'layoutPlanUrl không hợp lệ' })
  layoutPlanUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'cartLink không hợp lệ' })
  cartLink?: string;

  @IsOptional()
  @IsString()
  callPhone?: string;

  @IsOptional()
  @IsString()
  zaloPhone?: string;

  @IsOptional()
  @IsIn(['AVAILABLE', 'BOOKED'])
  transactionStatus?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isInterested?: boolean;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
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
  area?: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;

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
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'priceSheetUrl không hợp lệ' })
  priceSheetUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'salesPolicyUrl không hợp lệ' })
  salesPolicyUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'layoutPlanUrl không hợp lệ' })
  layoutPlanUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'cartLink không hợp lệ' })
  cartLink?: string;

  @IsOptional()
  @IsString()
  callPhone?: string;

  @IsOptional()
  @IsString()
  zaloPhone?: string;

  @IsOptional()
  @IsIn(['AVAILABLE', 'BOOKED'])
  transactionStatus?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isInterested?: boolean;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class ListProductDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsIn(['AVAILABLE', 'BOOKED'])
  transactionStatus?: string;
}

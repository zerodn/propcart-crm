import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateCatalogDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  values?: Array<{ value: string; label: string; order?: number }>;
}


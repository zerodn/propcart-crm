import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateCatalogDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsArray()
  @IsOptional()
  values?: Array<{ value: string; label: string; color?: string; order?: number }>;
}

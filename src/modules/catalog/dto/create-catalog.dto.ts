import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateCatalogDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  parentId?: string; // parent catalog id for child catalogs

  @IsArray()
  @IsOptional()
  values?: Array<{ value: string; label: string; order?: number }>;
}


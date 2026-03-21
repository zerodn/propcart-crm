import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  provinceCode?: string;

  @IsOptional()
  @IsString()
  provinceName?: string;

  @IsOptional()
  @IsString()
  districtCode?: string;

  @IsOptional()
  @IsString()
  districtName?: string;

  @IsOptional()
  @IsString()
  wardCode?: string;

  @IsOptional()
  @IsString()
  wardName?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  @IsIn(['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'CONVERTED', 'LOST'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['HOT', 'WARM', 'COLD'])
  interestLevel?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignees?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  provinceCode?: string;

  @IsOptional()
  @IsString()
  provinceName?: string;

  @IsOptional()
  @IsString()
  districtCode?: string;

  @IsOptional()
  @IsString()
  districtName?: string;

  @IsOptional()
  @IsString()
  wardCode?: string;

  @IsOptional()
  @IsString()
  wardName?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  @IsIn(['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'CONVERTED', 'LOST'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['HOT', 'WARM', 'COLD'])
  interestLevel?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignees?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ListCustomerDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  interestLevel?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

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

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;
}

// ----- Comment DTOs -----

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

// ----- CustomerInfo DTOs -----

export class CreateCustomerInfoDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  info?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateCustomerInfoDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  info?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderCustomerInfoDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

// ----- CustomerCareHistory DTOs -----

export class CreateCareHistoryDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  resultDescription?: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observers?: string[];
}

export class UpdateCareHistoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  resultDescription?: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observers?: string[];
}

// ===================== CUSTOM FIELD DEFINITIONS =====================

export class CreateCustomFieldDefinitionDto {
  @IsString()
  @IsNotEmpty()
  entity: string;

  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsIn(['TEXT', 'NUMBER', 'SELECT', 'FILE'])
  fieldType: string;

  @IsOptional()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxLength?: number;

  @IsOptional()
  @IsString()
  catalogCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateCustomFieldDefinitionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'NUMBER', 'SELECT', 'FILE'])
  fieldType?: string;

  @IsOptional()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxLength?: number;

  @IsOptional()
  @IsString()
  catalogCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  active?: boolean;
}

// ===================== CUSTOM FIELD VALUES =====================

export class SaveCustomFieldValuesDto {
  @IsString()
  @IsNotEmpty()
  entity: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsArray()
  fields: Array<{ fieldKey: string; value: string | null }>;
}

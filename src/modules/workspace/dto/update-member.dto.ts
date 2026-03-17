import { IsOptional, IsInt, Min, Max, IsString, IsUUID, IsEmail, IsISO8601 } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number; // 0=inactive, 1=active

  // Workspace-scoped profile fields
  @IsOptional()
  @IsString()
  displayName?: string; // Override user.fullName for this workspace

  @IsOptional()
  @IsEmail()
  workspaceEmail?: string; // Override user.email for this workspace

  @IsOptional()
  @IsString()
  workspacePhone?: string; // Override user.phone for this workspace

  @IsOptional()
  @IsString()
  avatarUrl?: string; // Avatar riêng cho workspace này

  @IsOptional()
  @IsString()
  gender?: string; // MALE, FEMALE, OTHER

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string; // ISO 8601 date format

  @IsOptional()
  @IsString()
  workspaceCity?: string; // Thành phố/Tỉnh

  @IsOptional()
  @IsString()
  workspaceAddress?: string; // Phường/Xã

  @IsOptional()
  @IsString()
  addressLine?: string; // Địa chỉ cụ thể (số nhà, tên đường)

  @IsOptional()
  @IsString()
  contractType?: string; // Loại HĐLĐ (từ catalog HDLD_TYPE)

  @IsOptional()
  @IsString()
  attachmentUrl?: string; // Tệp đính kèm (URL)
}

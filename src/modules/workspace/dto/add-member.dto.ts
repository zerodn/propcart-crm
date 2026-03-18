import { IsOptional, IsString, IsUUID, IsEmail } from 'class-validator';

export class AddMemberDto {
  @IsString()
  phone: string; // Required: phone number to find existing user

  @IsUUID()
  roleId: string; // Required: role to assign

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEmail()
  workspaceEmail?: string;

  @IsOptional()
  @IsString()
  workspacePhone?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  workspaceCity?: string; // Tỉnh/Thành phố

  @IsOptional()
  @IsString()
  workspaceAddress?: string; // Phường/Xã

  @IsOptional()
  @IsString()
  addressLine?: string; // Địa chỉ chi tiết

  @IsOptional()
  @IsString()
  employmentStatus?: string; // PROBATION, WORKING, ON_LEAVE, RESIGNED, RETIRED, FIRED
}

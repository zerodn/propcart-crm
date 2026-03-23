import { IsEmail, IsMobilePhone, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  provinceCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provinceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  districtCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  districtName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  wardCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  wardName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}

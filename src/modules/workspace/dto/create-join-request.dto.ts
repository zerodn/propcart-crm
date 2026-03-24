import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  requestedRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  provinceCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provinceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  wardCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wardName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string;
}

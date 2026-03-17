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
}

import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'phone must be in E.164 format (e.g. +84901234567)' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  role_code: string;
}

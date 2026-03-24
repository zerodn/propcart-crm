import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyEmailLinkGoogleDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp: string;

  @IsString()
  @IsNotEmpty()
  device_hash: string;

  @IsString()
  @IsNotEmpty()
  platform: string;
}

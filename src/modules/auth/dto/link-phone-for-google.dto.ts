import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class LinkPhoneForGoogleDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'phone must be in E.164 format' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'otp must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'otp must be 6 digits' })
  otp: string;

  @IsString()
  @IsNotEmpty()
  device_hash: string;

  @IsString()
  @IsNotEmpty()
  platform: string;
}

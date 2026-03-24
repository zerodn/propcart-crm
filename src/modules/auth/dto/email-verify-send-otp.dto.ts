import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class EmailVerifySendOtpDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phone: string;
}

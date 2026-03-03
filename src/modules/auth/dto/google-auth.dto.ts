import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  google_token: string;

  @IsString()
  @IsNotEmpty()
  device_hash: string;

  @IsString()
  @IsNotEmpty()
  platform: string;
}

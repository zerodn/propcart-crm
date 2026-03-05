import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeclineInvitationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

import { IsString } from 'class-validator';

export class AddDepartmentMemberDto {
  @IsString()
  userId: string;

  @IsString()
  roleId: string;
}

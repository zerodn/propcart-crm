import { IsString } from 'class-validator';

export class UpdateDepartmentMemberRoleDto {
  @IsString()
  roleId: string;
}

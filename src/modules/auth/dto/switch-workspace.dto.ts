import { IsNotEmpty, IsUUID } from 'class-validator';

export class SwitchWorkspaceDto {
  @IsUUID()
  @IsNotEmpty()
  workspace_id: string;
}

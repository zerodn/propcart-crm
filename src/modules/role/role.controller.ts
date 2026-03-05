import { Controller, Post, Body, Param, UseGuards, Get, Patch, Delete } from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('workspaces/:workspaceId/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('ROLE_CREATE')
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateRoleDto) {
    return this.roleService.create(workspaceId, dto.code, dto.name, dto.description);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string) {
    return this.roleService.listWorkspaceRoles(workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('ROLE_UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('ROLE_DELETE')
  remove(@Param('id') id: string) {
    return this.roleService.delete(id);
  }
}

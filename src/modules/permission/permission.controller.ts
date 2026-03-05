import { Controller, Post, Body, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('workspaces/:workspaceId/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('PERMISSION_CREATE')
  create(@Body() body: { code: string; name: string; module: string }) {
    return this.permissionService.create(body.code, body.name, body.module);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list() {
    return this.permissionService.list();
  }

  @Post('/roles/:roleId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('PERMISSION_ASSIGN')
  assign(@Param('roleId') roleId: string, @Body() body: { permissionId: string }) {
    return this.permissionService.assignToRole(roleId, body.permissionId);
  }

  @Delete('/roles/:roleId/:permissionId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('PERMISSION_ASSIGN')
  remove(@Param('roleId') roleId: string, @Param('permissionId') permissionId: string) {
    return this.permissionService.removeFromRole(roleId, permissionId);
  }
}

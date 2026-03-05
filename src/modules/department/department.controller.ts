import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Get,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDepartmentMemberDto } from './dto/add-department-member.dto';
import { UpdateDepartmentMemberRoleDto } from './dto/update-department-member-role.dto';

@Controller('workspaces/:workspaceId/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEPARTMENT_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentService.create(
      workspaceId,
      dto.name,
      dto.code,
      dto.description,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string) {
    return this.departmentService.list(workspaceId);
  }

  @Get('member-options')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listMemberOptions(@Param('workspaceId') workspaceId: string) {
    return this.departmentService.listWorkspaceMemberOptions(workspaceId);
  }

  @Get('role-options')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listRoleOptions(@Param('workspaceId') workspaceId: string) {
    return this.departmentService.listRoleOptions(workspaceId);
  }

  @Get('member-search')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  searchMembers(@Param('workspaceId') workspaceId: string, @Query('q') query: string) {
    return this.departmentService.searchMembers(workspaceId, query);
  }

  @Post(':departmentId/members')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEPARTMENT_UPDATE')
  addMember(
    @Param('departmentId') departmentId: string,
    @Body() dto: AddDepartmentMemberDto,
  ) {
    return this.departmentService.addMember(departmentId, dto.userId, dto.roleId);
  }

  @Delete(':departmentId/members/:userId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEPARTMENT_UPDATE')
  removeMember(
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
  ) {
    return this.departmentService.removeMember(departmentId, userId);
  }

  @Patch(':departmentId/members/:userId/role')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEPARTMENT_UPDATE')
  updateMemberRole(
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateDepartmentMemberRoleDto,
  ) {
    return this.departmentService.updateMemberRole(departmentId, userId, dto.roleId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEPARTMENT_UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEPARTMENT_DELETE')
  remove(@Param('id') id: string) {
    return this.departmentService.delete(id);
  }
}

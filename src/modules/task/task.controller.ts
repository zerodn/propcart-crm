import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { TaskService } from './task.service';
import { CreateTaskDto, ListTaskDto, UpdateTaskDto } from './dto/index';

@Controller('workspaces/:workspaceId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('TASK_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string, @Query() query: ListTaskDto) {
    return this.taskService.list(workspaceId, query);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getStatistics(@Param('workspaceId') workspaceId: string) {
    return this.taskService.getStatistics(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.taskService.findById(id, workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('TASK_UPDATE')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(id, workspaceId, dto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('TASK_UPDATE')
  assignUser(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('assignedUserId') assignedUserId: string | null,
  ) {
    return this.taskService.assignUser(id, workspaceId, assignedUserId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('TASK_DELETE')
  delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.taskService.delete(id, workspaceId);
  }
}

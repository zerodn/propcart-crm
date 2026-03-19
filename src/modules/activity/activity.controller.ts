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
import { ActivityService } from './activity.service';
import { CreateActivityDto, ListActivityDto, UpdateActivityDto } from './dto/index';

@Controller('workspaces/:workspaceId/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('ACTIVITY_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activityService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string, @Query() query: ListActivityDto) {
    return this.activityService.list(workspaceId, query);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getStatistics(@Param('workspaceId') workspaceId: string) {
    return this.activityService.getStatistics(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.activityService.findById(id, workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('ACTIVITY_UPDATE')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activityService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('ACTIVITY_DELETE')
  delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.activityService.delete(id, workspaceId);
  }
}

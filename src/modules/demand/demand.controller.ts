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
import { DemandService } from './demand.service';
import { CreateDemandDto, ListDemandDto, UpdateDemandDto } from './dto/index';

@Controller('workspaces/:workspaceId/demands')
export class DemandController {
  constructor(private readonly demandService: DemandService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEMAND_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDemandDto,
  ) {
    return this.demandService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string, @Query() query: ListDemandDto) {
    return this.demandService.list(workspaceId, query);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getStatistics(@Param('workspaceId') workspaceId: string) {
    return this.demandService.getStatistics(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.demandService.findById(id, workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEMAND_UPDATE')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDemandDto,
  ) {
    return this.demandService.update(id, workspaceId, dto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEMAND_UPDATE')
  assignUser(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('assignedUserId') assignedUserId: string | null,
  ) {
    return this.demandService.assignUser(id, workspaceId, assignedUserId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('DEMAND_DELETE')
  delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.demandService.delete(id, workspaceId);
  }
}

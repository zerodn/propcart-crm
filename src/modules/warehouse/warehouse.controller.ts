import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from './dto';

@Controller('workspaces/:workspaceId/warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WAREHOUSE_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWarehouseDto,
  ) {
    console.log('Creating warehouse:', { workspaceId, userId: user.sub, dto });
    return this.warehouseService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListWarehouseDto,
  ) {
    return this.warehouseService.list(workspaceId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.findById(id, workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WAREHOUSE_UPDATE')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WAREHOUSE_DELETE')
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.delete(id, workspaceId);
  }
}

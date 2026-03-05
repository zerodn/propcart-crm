import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

@Controller('workspaces/:workspaceId/catalogs')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CATALOG_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCatalogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogService.create(
      workspaceId,
      dto.type,
      dto.code,
      dto.name,
      dto.parentId,
      dto.values,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string) {
    return this.catalogService.list(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findById(@Param('id') id: string) {
    return this.catalogService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CATALOG_UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateCatalogDto) {
    return this.catalogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CATALOG_DELETE')
  remove(@Param('id') id: string) {
    return this.catalogService.delete(id);
  }
}

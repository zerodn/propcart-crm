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
import { CustomFieldService } from './custom-field.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  SaveCustomFieldValuesDto,
} from './dto/index';

@Controller('workspaces/:workspaceId/custom-fields')
export class CustomFieldController {
  constructor(private readonly customFieldService: CustomFieldService) {}

  // ===================== DEFINITIONS =====================

  @Get('definitions')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listDefinitions(@Param('workspaceId') workspaceId: string, @Query('entity') entity: string) {
    return this.customFieldService.listDefinitions(workspaceId, entity || 'CUSTOMER');
  }

  @Post('definitions')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_FIELD_CONFIG')
  createDefinition(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCustomFieldDefinitionDto,
  ) {
    return this.customFieldService.createDefinition(workspaceId, dto);
  }

  @Patch('definitions/:id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_FIELD_CONFIG')
  updateDefinition(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefinitionDto,
  ) {
    return this.customFieldService.updateDefinition(workspaceId, id, dto);
  }

  @Delete('definitions/:id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_FIELD_CONFIG')
  deleteDefinition(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.customFieldService.deleteDefinition(workspaceId, id);
  }

  // ===================== VALUES =====================

  @Get('values')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getValues(
    @Param('workspaceId') workspaceId: string,
    @Query('entity') entity: string,
    @Query('entityId') entityId: string,
  ) {
    return this.customFieldService.getValues(workspaceId, entity || 'CUSTOMER', entityId);
  }

  @Post('values')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  saveValues(@Param('workspaceId') workspaceId: string, @Body() dto: SaveCustomFieldValuesDto) {
    return this.customFieldService.saveValues(workspaceId, dto);
  }
}

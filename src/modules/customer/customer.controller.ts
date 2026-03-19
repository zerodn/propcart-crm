import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, ListCustomerDto, UpdateCustomerDto } from './dto/index';

@Controller('workspaces/:workspaceId/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customerService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(@Param('workspaceId') workspaceId: string, @Query() query: ListCustomerDto) {
    return this.customerService.list(workspaceId, query);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getStatistics(@Param('workspaceId') workspaceId: string) {
    return this.customerService.getStatistics(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.customerService.findById(id, workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, workspaceId, dto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  assignUser(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('assignedUserId') assignedUserId: string | null,
  ) {
    return this.customerService.assignUser(id, workspaceId, assignedUserId);
  }

  @Post(':id/upload-avatar')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.customerService.uploadCustomerAvatar(workspaceId, id, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_DELETE')
  delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.customerService.delete(id, workspaceId);
  }
}

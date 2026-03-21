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
import {
  CreateCommentDto,
  CreateCustomerDto,
  CreateCustomerInfoDto,
  CreateCareHistoryDto,
  ListCustomerDto,
  ReorderCustomerInfoDto,
  UpdateCareHistoryDto,
  UpdateCommentDto,
  UpdateCustomerDto,
  UpdateCustomerInfoDto,
} from './dto/index';

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

  // ===================== COMMENTS =====================

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listComments(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.customerService.listComments(workspaceId, id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  createComment(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCommentDto,
  ) {
    return this.customerService.createComment(workspaceId, id, user.sub, dto);
  }

  @Patch(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  updateComment(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.customerService.updateComment(workspaceId, id, commentId, user.sub, dto);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  deleteComment(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.customerService.deleteComment(workspaceId, id, commentId, user.sub);
  }

  // ===================== CUSTOMER INFOS =====================

  @Get(':id/infos')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listInfos(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.customerService.listInfos(workspaceId, id);
  }

  @Post(':id/infos')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  createInfo(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerInfoDto,
  ) {
    return this.customerService.createInfo(workspaceId, id, dto);
  }

  @Patch(':id/infos/:infoId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  updateInfo(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('infoId') infoId: string,
    @Body() dto: UpdateCustomerInfoDto,
  ) {
    return this.customerService.updateInfo(workspaceId, id, infoId, dto);
  }

  @Delete(':id/infos/:infoId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  deleteInfo(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('infoId') infoId: string,
  ) {
    return this.customerService.deleteInfo(workspaceId, id, infoId);
  }

  @Post(':id/infos/reorder')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('CUSTOMER_UPDATE')
  reorderInfos(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ReorderCustomerInfoDto,
  ) {
    return this.customerService.reorderInfos(workspaceId, id, dto);
  }

  // ===================== CARE HISTORIES =====================

  @Get(':id/care-histories')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listCareHistories(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.customerService.listCareHistories(workspaceId, id);
  }

  @Post(':id/care-histories')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  createCareHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCareHistoryDto,
  ) {
    return this.customerService.createCareHistory(workspaceId, id, user.sub, dto);
  }

  @Patch(':id/care-histories/:historyId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  updateCareHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCareHistoryDto,
  ) {
    return this.customerService.updateCareHistory(
      workspaceId,
      id,
      historyId,
      user.sub,
      user.role,
      dto,
    );
  }

  @Delete(':id/care-histories/:historyId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  deleteCareHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.customerService.deleteCareHistory(workspaceId, id, historyId, user.sub, user.role);
  }
}

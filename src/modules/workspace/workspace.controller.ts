import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvitationService } from './invitation.service';
import { WorkspaceService } from './workspace.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller()
export class WorkspaceController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  // POST /workspaces/:workspaceId/invitations — OWNER/ADMIN only
  @Post('workspaces/:workspaceId/invitations')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_INVITE')
  sendInvitation(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.sendInvitation(workspaceId, dto, user);
  }

  // GET /workspaces/:workspaceId/members — List workspace members
  @Get('workspaces/:workspaceId/members')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listWorkspaceMembers(
    @Param('workspaceId') workspaceId: string,
    @Query('search') search?: string,
  ) {
    return this.workspaceService.listWorkspaceMembers(workspaceId, search);
  }

  // POST /workspaces/:workspaceId/members — Directly add a member by phone
  @Post('workspaces/:workspaceId/members')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_MANAGE')
  addWorkspaceMember(@Param('workspaceId') workspaceId: string, @Body() dto: AddMemberDto) {
    return this.workspaceService.addMember(workspaceId, dto);
  }

  // GET /workspaces/:workspaceId/members/export — Export members as Excel
  @Get('workspaces/:workspaceId/members/export')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  async exportMembers(@Param('workspaceId') workspaceId: string, @Res() res: Response) {
    const buffer = await this.workspaceService.exportMembersExcel(workspaceId);
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="nhan-su-${date}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // GET /workspaces/:workspaceId/members/template — Download import template
  @Get('workspaces/:workspaceId/members/template')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  async getMembersTemplate(@Param('workspaceId') workspaceId: string, @Res() res: Response) {
    const buffer = await this.workspaceService.getMembersTemplate(workspaceId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mau-nhap-nhan-su.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // POST /workspaces/:workspaceId/members/import/preview — Preview import without saving
  @Post('workspaces/:workspaceId/members/import/preview')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_MANAGE')
  @UseInterceptors(FileInterceptor('file'))
  async previewImportMembers(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { code: 'FILE_REQUIRED', message: 'Vui lòng chọn file Excel để xem trước' };
    }
    const result = await this.workspaceService.previewMembersImport(workspaceId, file.buffer);
    return { data: result };
  }

  // POST /workspaces/:workspaceId/members/import — Import members from Excel
  @Post('workspaces/:workspaceId/members/import')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_MANAGE')
  @UseInterceptors(FileInterceptor('file'))
  async importMembers(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { code: 'FILE_REQUIRED', message: 'Vui lòng chọn file Excel để import' };
    }
    const result = await this.workspaceService.importMembersExcel(workspaceId, file.buffer);
    return { data: result };
  }

  // PATCH /workspaces/:workspaceId/members/:memberId — Update member info (role, status)
  @Patch('workspaces/:workspaceId/members/:memberId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_MANAGE')
  updateWorkspaceMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.workspaceService.updateMember(workspaceId, memberId, dto);
  }

  // POST /workspaces/:workspaceId/members/:memberId/upload-avatar — Upload avatar for member
  @Post('workspaces/:workspaceId/members/:memberId/upload-avatar')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_MANAGE')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadMemberAvatar(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.workspaceService.uploadMemberAvatar(workspaceId, memberId, file);
  }

  // GET /workspaces/:workspaceId/invitations — List sent invitations from workspace
  @Get('workspaces/:workspaceId/invitations')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listWorkspaceInvitations(@Param('workspaceId') workspaceId: string) {
    return this.invitationService.listWorkspaceInvitations(workspaceId);
  }

  // GET /workspaces/:workspaceId/invitations/declined — List declined invitations with pagination
  @Get('workspaces/:workspaceId/invitations/declined')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  listDeclinedInvitations(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.invitationService.listDeclinedInvitations(workspaceId, pageNum, limitNum);
  }

  // GET /me/invitations — Any authenticated user
  @Get('me/invitations')
  @UseGuards(JwtAuthGuard)
  listInvitations(@CurrentUser() user: JwtPayload) {
    return this.invitationService.listPendingInvitations(user.sub);
  }

  // POST /invitations/:token/accept — Any authenticated user
  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvitation(@Param('token') token: string, @CurrentUser() user: JwtPayload) {
    return this.invitationService.acceptInvitation(token, user);
  }

  // POST /invitations/:token/decline — Any authenticated user
  @Post('invitations/:token/decline')
  @UseGuards(JwtAuthGuard)
  declineInvitation(
    @Param('token') token: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: import('./dto/decline-invitation.dto').DeclineInvitationDto,
  ) {
    return this.invitationService.declineInvitation(token, user, dto.reason);
  }

  // DELETE /workspaces/:workspaceId/invitations/:id — OWNER/ADMIN only
  @Delete('workspaces/:workspaceId/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('WORKSPACE_MEMBER_INVITE')
  cancelInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitationService.cancelInvitation(workspaceId, invitationId);
  }
}

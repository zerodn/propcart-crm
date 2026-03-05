import { Body, Controller, Delete, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { WorkspaceService } from './workspace.service';
import { InviteMemberDto } from './dto/invite-member.dto';
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

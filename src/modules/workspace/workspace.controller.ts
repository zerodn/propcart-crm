import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller()
export class WorkspaceController {
  constructor(private readonly invitationService: InvitationService) {}

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
  declineInvitation(@Param('token') token: string, @CurrentUser() user: JwtPayload) {
    return this.invitationService.declineInvitation(token, user);
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

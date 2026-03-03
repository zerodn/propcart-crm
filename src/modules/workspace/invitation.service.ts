import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  // ============================================================
  // SEND INVITATION
  // ============================================================

  async sendInvitation(workspaceId: string, dto: InviteMemberDto, sender: JwtPayload) {
    const { phone, role_code } = dto;

    // Validate role exists
    const role = await this.prisma.role.findUnique({ where: { code: role_code } });
    if (!role) {
      throw new HttpException(
        { code: 'ROLE_NOT_FOUND', message: `Role '${role_code}' does not exist` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if phone belongs to an existing user
    const invitedUser = await this.userService.findByPhone(phone);

    // Check user is not already a member
    if (invitedUser) {
      const existingMember = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: invitedUser.id, status: 1 },
      });
      if (existingMember) {
        throw new HttpException(
          { code: 'MEMBER_ALREADY_EXISTS', message: 'User is already a member of this workspace' },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Check no pending invitation for this phone in this workspace
    const existingInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: { workspaceId, invitedPhone: phone, status: 0 },
    });
    if (existingInvitation) {
      throw new HttpException(
        {
          code: 'INVITATION_ALREADY_PENDING',
          message: 'There is already a pending invitation for this phone',
        },
        HttpStatus.CONFLICT,
      );
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedByUserId: sender.sub,
        invitedPhone: phone,
        invitedUserId: invitedUser?.id || null,
        roleId: role.id,
        status: 0,
        expiresAt,
      },
      include: { role: true },
    });

    // TODO: Send SMS/push notification to invited phone

    return {
      data: {
        id: invitation.id,
        invited_phone: invitation.invitedPhone,
        role: invitation.role.code,
        status: 'pending',
        expires_at: invitation.expiresAt,
      },
    };
  }

  // ============================================================
  // LIST PENDING INVITATIONS FOR CURRENT USER
  // ============================================================

  async listPendingInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phone) {
      return { data: [] };
    }

    const invitations = await this.prisma.workspaceInvitation.findMany({
      where: {
        invitedPhone: user.phone,
        status: 0,
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: true,
        invitedBy: true,
        role: true,
      },
    });

    const data = invitations.map((inv) => ({
      id: inv.id,
      token: inv.token,
      workspace: { id: inv.workspace.id, name: inv.workspace.name, type: inv.workspace.type },
      invited_by: { id: inv.invitedBy.id, phone: inv.invitedBy.phone },
      role: inv.role.code,
      expires_at: inv.expiresAt,
    }));

    return { data };
  }

  // ============================================================
  // ACCEPT INVITATION
  // ============================================================

  async acceptInvitation(token: string, currentUser: JwtPayload) {
    const invitation = await this.findAndValidateInvitation(token, currentUser);

    // Create workspace member
    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.sub,
        roleId: invitation.roleId,
        status: 1,
      },
    });

    // Update invitation
    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 1,
        respondedAt: new Date(),
        invitedUserId: currentUser.sub,
      },
    });

    return {
      data: {
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          type: invitation.workspace.type,
        },
        role: invitation.role.code,
        message: 'Joined workspace successfully',
      },
    };
  }

  // ============================================================
  // DECLINE INVITATION
  // ============================================================

  async declineInvitation(token: string, currentUser: JwtPayload) {
    const invitation = await this.findAndValidateInvitation(token, currentUser);

    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 2, respondedAt: new Date() },
    });

    return { data: { message: 'Invitation declined' } };
  }

  // ============================================================
  // CANCEL INVITATION (by OWNER/ADMIN)
  // ============================================================

  async cancelInvitation(workspaceId: string, invitationId: string) {
    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      throw new HttpException(
        { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (invitation.status !== 0) {
      throw new HttpException(
        {
          code: 'INVITATION_ALREADY_RESPONDED',
          message: 'Cannot cancel an invitation that has already been responded to',
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 4 },
    });

    return { data: { message: 'Invitation cancelled' } };
  }

  // ============================================================
  // PRIVATE HELPER
  // ============================================================

  private async findAndValidateInvitation(token: string, currentUser: JwtPayload) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: true, role: true },
    });

    if (!invitation) {
      throw new HttpException(
        { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (invitation.status !== 0) {
      throw new HttpException(
        {
          code: 'INVITATION_ALREADY_RESPONDED',
          message: 'This invitation has already been responded to',
        },
        HttpStatus.CONFLICT,
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new HttpException(
        { code: 'INVITATION_EXPIRED', message: 'This invitation has expired' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify phone matches current user
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.sub } });
    if (!user || user.phone !== invitation.invitedPhone) {
      throw new HttpException(
        {
          code: 'INVITATION_PHONE_MISMATCH',
          message: 'This invitation was not sent to your phone number',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return invitation;
  }
}

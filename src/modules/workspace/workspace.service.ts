import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async findWorkspacesByUserId(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { userId, status: 1 },
      include: { workspace: true, role: true },
    });
  }

  async findMembership(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 1 },
      include: { role: true },
    });
  }

  async listWorkspaceMembers(workspaceId: string, search?: string) {
    const where: any = {
      workspaceId,
      status: 1, // only active members
    };

    // If search is provided, search in phone or email
    if (search && search.trim()) {
      where.user = {
        OR: [
          { phone: { contains: search.trim() } },
          { email: { contains: search.trim() } },
        ],
      };
    }

    const members = await this.prisma.workspaceMember.findMany({
      where,
      include: {
        user: { select: { id: true, phone: true, email: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const data = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      roleId: m.roleId,
      status: m.status,
      joinedAt: m.joinedAt,
      user: m.user,
      role: m.role,
    }));

    return { data };
  }
}

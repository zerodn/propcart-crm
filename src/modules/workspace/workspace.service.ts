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
}

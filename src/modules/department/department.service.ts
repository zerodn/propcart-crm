import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleService } from '../role/role.service';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async create(workspaceId: string, name: string, code: string, description?: string) {
    return this.prisma.department.create({
      data: { workspaceId, name, code, description },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.department.findMany({
      where: { workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                email: true,
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listWorkspaceMemberOptions(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId, status: 1 },
      select: {
        userId: true,
        displayName: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async listRoleOptions(workspaceId: string) {
    const result = await this.roleService.listWorkspaceRoles(workspaceId);
    return result.data;
  }

  async addMember(departmentId: string, userId: string, roleId: string) {
    // Create member in database
    const result = await this.prisma.departmentMember.create({
      data: { departmentId, userId, roleId },
    });

    // Index to Elasticsearch
    try {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true, email: true },
      });

      if (department && user) {
        await this.elasticsearchService.indexMember(department.workspaceId, {
          userId: user.id,
          workspaceId: department.workspaceId,
          phone: user.phone || undefined,
          email: user.email || undefined,
          name: undefined, // User has no name field in schema
        });
      }
    } catch (error) {
      this.logger.error(`Failed to index member to Elasticsearch: ${error.message}`);
      // Continue even if indexing fails
    }

    return result;
  }

  async removeMember(departmentId: string, userId: string) {
    return this.prisma.departmentMember.delete({
      where: { departmentId_userId: { departmentId, userId } },
    });
  }

  async updateMemberRole(departmentId: string, userId: string, roleId: string) {
    return this.prisma.departmentMember.update({
      where: { departmentId_userId: { departmentId, userId } },
      data: { roleId },
    });
  }

  async update(id: string, data: { name?: string; code?: string; description?: string }) {
    return this.prisma.department.update({ where: { id }, data });
  }

  async delete(id: string) {
    const count = await this.prisma.departmentMember.count({ where: { departmentId: id } });
    if (count > 0) {
      throw new HttpException(
        { code: 'DEPARTMENT_NOT_EMPTY', message: 'Cannot delete a department that has members' },
        HttpStatus.CONFLICT,
      );
    }
    return this.prisma.department.delete({ where: { id } });
  }

  async searchMembers(workspaceId: string, query: string) {
    if (!query || !query.trim()) {
      this.logger.debug(`Search called with empty query`);
      return { data: [] };
    }

    const trimmedQuery = query.trim().toLowerCase();
    this.logger.debug(`Searching for: "${trimmedQuery}" in workspace: ${workspaceId}`);

    // Try Elasticsearch first
    const esResults = await this.elasticsearchService.searchMembers(workspaceId, trimmedQuery);

    // If ES returns results, return them
    if (esResults.length > 0) {
      this.logger.debug(`Found ${esResults.length} results from Elasticsearch`);

      // Enrich with avatarUrl and roleName from DB
      const userIds = esResults.map((m) => m.userId);
      const wsMembers = await this.prisma.workspaceMember.findMany({
        where: { workspaceId, userId: { in: userIds } },
        select: {
          userId: true,
          avatarUrl: true,
          user: { select: { avatarUrl: true } },
          role: { select: { name: true } },
        },
      });
      const memberMap = new Map(wsMembers.map((m) => [m.userId, m]));

      return {
        data: esResults.map((member) => {
          const wsMember = memberMap.get(member.userId);
          return {
            userId: member.userId,
            phone: member.phone,
            email: member.email,
            name: member.name,
            avatarUrl: wsMember?.avatarUrl || wsMember?.user?.avatarUrl || null,
            roleName: wsMember?.role?.name || null,
            score: member.score,
          };
        }),
      };
    }

    // Fallback: search from database if ES returns nothing
    // This handles cases where:
    // 1. Elasticsearch is not available
    // 2. Data hasn't been indexed yet
    // 3. ES timeout or error
    try {
      this.logger.debug(`ES returned no results, falling back to database search`);

      // Find all active workspace members with limited results
      const workspaceMembers = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          status: 1,
        },
        select: {
          displayName: true,
          avatarUrl: true,
          user: {
            select: {
              id: true,
              phone: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          role: {
            select: { name: true },
          },
        },
        take: 100, // Get more to filter client-side
      });

      this.logger.debug(`Found ${workspaceMembers.length} members in workspace from database`);

      // Filter in application (case-insensitive)
      const filtered = workspaceMembers.filter((member) => {
        const displayName = (member.displayName || '').toLowerCase();
        const fullName = (member.user.fullName || '').toLowerCase();
        const phone = (member.user.phone || '').toLowerCase();
        const email = (member.user.email || '').toLowerCase();
        const matches =
          displayName.includes(trimmedQuery) ||
          fullName.includes(trimmedQuery) ||
          phone.includes(trimmedQuery) ||
          email.includes(trimmedQuery);
        if (matches) {
          this.logger.debug(
            `Match found: name="${member.displayName || member.user.fullName}" phone="${member.user.phone}" email="${member.user.email}"`,
          );
        }
        return matches;
      });

      this.logger.debug(`Filtered down to ${filtered.length} matching members`);

      return {
        data: filtered.slice(0, 50).map((member) => ({
          userId: member.user.id,
          phone: member.user.phone,
          email: member.user.email,
          name: member.displayName || member.user.fullName,
          avatarUrl: member.avatarUrl || member.user.avatarUrl || null,
          roleName: member.role?.name || null,
          score: 0, // No score from database search
        })),
      };
    } catch (error) {
      this.logger.error(`Database fallback search failed: ${error.message}`);
      return { data: [] };
    }
  }
}

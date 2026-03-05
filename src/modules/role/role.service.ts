import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, code: string, name: string, description?: string) {
    return this.prisma.role.create({ data: { code, name, description } });
  }

  async list(workspaceId: string) {
    return this.prisma.role.findMany({});
  }

  async listWorkspaceRoles(workspaceId: string) {
    // Fetch roles from workspace's "Vai trò" catalog
    const roleCatalog = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'ROLE', code: 'ROLE' },
      include: { values: { orderBy: { order: 'asc' } } },
    });

    if (!roleCatalog) {
      return { data: [] };
    }

    // Map catalog values to role format
    // Use catalog labels (Vietnamese) instead of role table names (English)
    const roles = roleCatalog.values.map((v) => ({
      id: v.id,
      code: v.value,  // value = role code (ADMIN, MANAGER, etc.)
      name: v.label,  // label = Vietnamese name (Quản trị viên, Quản lý, etc.)
    }));

    return {
      data: roles,
    };
  }

  async findById(id: string) {
    return this.prisma.role.findUnique({ where: { id } });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.role.update({ where: { id }, data });
  }

  async delete(id: string) {
    const used = await this.prisma.workspaceMember.count({ where: { roleId: id } });
    if (used > 0) {
      throw new HttpException({ code: 'ROLE_IN_USE', message: 'Role is in use' }, HttpStatus.CONFLICT);
    }
    return this.prisma.role.delete({ where: { id } });
  }
}

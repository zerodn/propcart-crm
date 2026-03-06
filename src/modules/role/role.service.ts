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
    // Fetch roles from workspace's "Vai trò" catalog to get Vietnamese names
    const roleCatalog = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'ROLE', code: 'ROLE' },
      include: { values: { orderBy: { order: 'asc' } } },
    });

    if (!roleCatalog) {
      return { data: [] };
    }

    // Map catalog values to role format
    // Match code with actual Role table to get the Role ID
    const roles = roleCatalog.values
      .map((v) => ({
        catalogValue: v,
        code: v.value, // e.g., 'OWNER', 'MANAGER', 'SALES'
      }))
      .map((item) => ({
        id: undefined, // Will be filled below
        code: item.code,
        name: item.catalogValue.label, // Vietnamese name from catalog
      }));

    // Fetch actual Role IDs by code to ensure foreign key constraint is satisfied
    const roleIds = new Map<string, string>();
    for (const role of roles) {
      const actualRole = await this.prisma.role.findFirst({
        where: { code: role.code },
        select: { id: true },
      });
      if (actualRole) {
        roleIds.set(role.code, actualRole.id);
      }
    }

    // Update with actual Role IDs
    const result = roles
      .filter((r) => roleIds.has(r.code))
      .map((r) => ({
        id: roleIds.get(r.code)!,
        code: r.code,
        name: r.name,
      }));

    return {
      data: result,
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

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(code: string, name: string, module: string) {
    return this.prisma.permission.create({ data: { code, name, module } });
  }

  async list() {
    return this.prisma.permission.findMany({ orderBy: { module: 'asc' } });
  }

  async findByCode(code: string) {
    return this.prisma.permission.findUnique({ where: { code } });
  }

  async assignToRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.create({ data: { roleId, permissionId } });
  }

  async removeFromRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
  }
}

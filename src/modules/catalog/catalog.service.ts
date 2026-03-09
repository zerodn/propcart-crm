import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    type: string,
    code: string,
    name: string,
    parentId?: string,
    values?: Array<{ value: string; label: string; order?: number }>,
  ) {
    // Create catalog entry
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type,
        code,
        name,
        parentId: parentId || null,
      },
    });

    // Create catalog values if provided
    if (values && values.length > 0) {
      await this.prisma.catalogValue.createMany({
        data: values.map((v, idx) => ({
          catalogId: catalog.id,
          value: v.value,
          label: v.label,
          order: v.order ?? idx,
        })),
      });
    }

    return this.getCatalogWithValues(catalog.id);
  }

  async list(workspaceId: string, type?: string) {
    const where: any = { workspaceId };
    if (type) where.type = type;

    // Auto-initialize role catalog if it doesn't exist
    const roleCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'ROLE', code: 'ROLE' },
    });

    if (!roleCatalogExists) {
      await this.initializeRoleCatalog(workspaceId);
    }

    // Auto-initialize warehouse type catalog if it doesn't exist
    const warehouseTypeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'WAREHOUSE_TYPE', code: 'WAREHOUSE_TYPE' },
    });

    if (!warehouseTypeCatalogExists) {
      await this.initializeWarehouseTypeCatalog(workspaceId);
    }

    return this.prisma.catalog.findMany({
      where,
      include: {
        values: { orderBy: { order: 'asc' } },
        children: {
          include: { values: { orderBy: { order: 'asc' } } },
        },
      },
    });
  }

  async findById(id: string) {
    return this.getCatalogWithValues(id);
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      values?: Array<{ value: string; label: string; order?: number }>;
    },
  ) {
    // Update catalog metadata
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code;

    const catalog = await this.prisma.catalog.update({
      where: { id },
      data: updateData,
    });

    // Update values if provided
    if (data.values && data.values.length > 0) {
      // Delete existing values
      await this.prisma.catalogValue.deleteMany({ where: { catalogId: id } });
      // Create new values
      await this.prisma.catalogValue.createMany({
        data: data.values.map((v, idx) => ({
          catalogId: id,
          value: v.value,
          label: v.label,
          order: v.order ?? idx,
        })),
      });
    }

    return this.getCatalogWithValues(id);
  }

  async delete(id: string) {
    // Check if catalog is used as parent
    const hasChildren = await this.prisma.catalog.count({
      where: { parentId: id },
    });

    if (hasChildren > 0) {
      throw new HttpException(
        {
          code: 'CATALOG_HAS_CHILDREN',
          message: 'Cannot delete catalog that has child catalogs',
        },
        HttpStatus.CONFLICT,
      );
    }

    // Delete cascade will remove associated CatalogValue entries
    return this.prisma.catalog.delete({ where: { id } });
  }

  private async getCatalogWithValues(id: string) {
    return this.prisma.catalog.findUnique({
      where: { id },
      include: {
        values: { orderBy: { order: 'asc' } },
        parent: true,
        children: {
          include: { values: { orderBy: { order: 'asc' } } },
        },
      },
    });
  }

  private async initializeRoleCatalog(workspaceId: string) {
    const roleCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'ROLE',
        code: 'ROLE',
        name: 'Vai trò',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: roleCatalog.id,
          value: 'ADMIN',
          label: 'Quản trị viên',
          order: 0,
        },
        {
          catalogId: roleCatalog.id,
          value: 'SALES',
          label: 'Nhân viên bán hàng',
          order: 1,
        },
        {
          catalogId: roleCatalog.id,
          value: 'MANAGER',
          label: 'Quản lý',
          order: 2,
        },
        {
          catalogId: roleCatalog.id,
          value: 'OWNER',
          label: 'Chủ sở hữu',
          order: 3,
        },
        {
          catalogId: roleCatalog.id,
          value: 'VIEWER',
          label: 'Người xem',
          order: 4,
        },
      ],
    });

    return roleCatalog;
  }

  private async initializeWarehouseTypeCatalog(workspaceId: string) {
    const warehouseTypeCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'WAREHOUSE_TYPE',
        code: 'WAREHOUSE_TYPE',
        name: 'Loại Kho',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'OWNER',
          label: 'Kho chủ đầu tư',
          order: 0,
        },
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'AGENT',
          label: 'Kho đại lý',
          order: 1,
        },
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'LANDLORD',
          label: 'Kho chủ nhà',
          order: 2,
        },
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'AUCTION',
          label: 'Kho đấu giá / ngân hàng',
          order: 3,
        },
      ],
    });

    return warehouseTypeCatalog;
  }
}


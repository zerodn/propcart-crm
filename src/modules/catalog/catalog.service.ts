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
    values?: Array<{ value: string; label: string; color?: string; order?: number }>,
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
          color: v.color || null,
          order: v.order ?? idx,
        })),
      });
    }

    return this.getCatalogWithValues(catalog.id);
  }

  async list(workspaceId: string, type?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Auto-initialize property type catalog if it doesn't exist
    const propertyTypeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PROPERTY_TYPE', code: 'PROPERTY_TYPE' },
    });

    if (!propertyTypeCatalogExists) {
      await this.initializePropertyTypeCatalog(workspaceId);
    }

    // Auto-initialize product tag catalog if it doesn't exist
    const productTagCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PRODUCT_TAG', code: 'PRODUCT_TAG' },
    });

    if (!productTagCatalogExists) {
      await this.initializeProductTagCatalog(workspaceId);
    }

    // Auto-initialize property direction catalog if it doesn't exist
    const propertyDirectionCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PROPERTY_DIRECTION', code: 'PROPERTY_DIRECTION' },
    });

    if (!propertyDirectionCatalogExists) {
      await this.initializePropertyDirectionCatalog(workspaceId);
    }

    // Auto-initialize property transaction status catalog if it doesn't exist
    const propertyTransactionStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: {
        workspaceId,
        type: 'PROPERTY_TRANSACTION_STATUS',
        code: 'PROPERTY_TRANSACTION_STATUS',
      },
    });

    if (!propertyTransactionStatusCatalogExists) {
      await this.initializePropertyTransactionStatusCatalog(workspaceId);
    }

    // Auto-initialize product document catalog if it doesn't exist
    const productDocumentCatalogExists = await this.prisma.catalog.findFirst({
      where: {
        workspaceId,
        type: 'PRODUCT_DOCUMENT',
        code: 'PRODUCT_DOCUMENT',
      },
    });

    if (!productDocumentCatalogExists) {
      await this.initializeProductDocumentCatalog(workspaceId);
    }

    // Auto-initialize project owner catalog if it doesn't exist
    const projectOwnerCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PROJECT_OWNER', code: 'PROJECT_OWNER' },
    });

    if (!projectOwnerCatalogExists) {
      await this.initializeProjectOwnerCatalog(workspaceId);
    }

    // Auto-initialize project sale status catalog if it doesn't exist
    const projectSaleStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PROJECT_SALE_STATUS', code: 'PROJECT_SALE_STATUS' },
    });

    if (!projectSaleStatusCatalogExists) {
      await this.initializeProjectSaleStatusCatalog(workspaceId);
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
      type?: string;
      name?: string;
      code?: string;
      parentId?: string | null;
      values?: Array<{ value: string; label: string; color?: string; order?: number }>;
    },
  ) {
    // Update catalog metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.type) updateData.type = data.type;
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    await this.prisma.catalog.update({
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
          color: v.color || null,
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

  private async initializePropertyTypeCatalog(workspaceId: string) {
    const propertyTypeCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PROPERTY_TYPE',
        code: 'PROPERTY_TYPE',
        name: 'Loại hình bất động sản',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: propertyTypeCatalog.id,
          value: 'CAN_HO',
          label: 'Căn hộ',
          order: 0,
        },
        {
          catalogId: propertyTypeCatalog.id,
          value: 'NHA_PHO',
          label: 'Nhà phố',
          order: 1,
        },
        {
          catalogId: propertyTypeCatalog.id,
          value: 'BIET_THU',
          label: 'Biệt thự',
          order: 2,
        },
        {
          catalogId: propertyTypeCatalog.id,
          value: 'DAT_NEN',
          label: 'Đất nền',
          order: 3,
        },
        {
          catalogId: propertyTypeCatalog.id,
          value: 'SHOPTEL',
          label: 'Shoptel',
          order: 4,
        },
      ],
    });

    return propertyTypeCatalog;
  }

  private async initializeProductTagCatalog(workspaceId: string) {
    const productTagCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PRODUCT_TAG',
        code: 'PRODUCT_TAG',
        name: 'Nhãn sản phẩm',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: productTagCatalog.id,
          value: 'HOT',
          label: 'HOT',
          color: '#ef4444',
          order: 0,
        },
        {
          catalogId: productTagCatalog.id,
          value: 'VIP',
          label: 'VIP',
          color: '#f59e0b',
          order: 1,
        },
      ],
    });

    return productTagCatalog;
  }

  private async initializePropertyDirectionCatalog(workspaceId: string) {
    const propertyDirectionCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PROPERTY_DIRECTION',
        code: 'PROPERTY_DIRECTION',
        name: 'Hướng BĐS',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'DONG',
          label: 'Đông',
          order: 0,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'TAY',
          label: 'Tây',
          order: 1,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'NAM',
          label: 'Nam',
          order: 2,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'BAC',
          label: 'Bắc',
          order: 3,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'DONG_NAM',
          label: 'Đông Nam',
          order: 4,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'DONG_BAC',
          label: 'Đông Bắc',
          order: 5,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'TAY_NAM',
          label: 'Tây Nam',
          order: 6,
        },
        {
          catalogId: propertyDirectionCatalog.id,
          value: 'TAY_BAC',
          label: 'Tây Bắc',
          order: 7,
        },
      ],
    });

    return propertyDirectionCatalog;
  }

  private async initializePropertyTransactionStatusCatalog(workspaceId: string) {
    const transactionStatusCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PROPERTY_TRANSACTION_STATUS',
        code: 'PROPERTY_TRANSACTION_STATUS',
        name: 'Trạng thái giao dịch BĐS',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: transactionStatusCatalog.id,
          value: 'AVAILABLE',
          label: 'Chưa book',
          order: 0,
        },
        {
          catalogId: transactionStatusCatalog.id,
          value: 'BOOKED',
          label: 'Book căn',
          order: 1,
        },
      ],
    });

    return transactionStatusCatalog;
  }

  private async initializeProductDocumentCatalog(workspaceId: string) {
    const productDocumentCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PRODUCT_DOCUMENT',
        code: 'PRODUCT_DOCUMENT',
        name: 'Tài liệu sản phẩm',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: productDocumentCatalog.id,
          value: 'PRICE_SHEET',
          label: 'Phiếu tính giá',
          order: 0,
        },
        {
          catalogId: productDocumentCatalog.id,
          value: 'LAYOUT_PLAN',
          label: 'Mặt bằng căn',
          order: 1,
        },
      ],
    });

    return productDocumentCatalog;
  }

  private async initializeProjectOwnerCatalog(workspaceId: string) {
    const projectOwnerCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PROJECT_OWNER',
        code: 'PROJECT_OWNER',
        name: 'Chủ dự án',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: projectOwnerCatalog.id,
          value: 'VIN',
          label: 'VIN',
          order: 0,
        },
        {
          catalogId: projectOwnerCatalog.id,
          value: 'SUN',
          label: 'SUN',
          order: 1,
        },
        {
          catalogId: projectOwnerCatalog.id,
          value: 'DONGTAYLAND',
          label: 'DONGTAYLAND',
          order: 2,
        },
      ],
    });

    return projectOwnerCatalog;
  }

  private async initializeProjectSaleStatusCatalog(workspaceId: string) {
    const projectSaleStatusCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'PROJECT_SALE_STATUS',
        code: 'PROJECT_SALE_STATUS',
        name: 'Trạng thái bán BĐS',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: projectSaleStatusCatalog.id,
          value: 'COMING_SOON',
          label: 'Sắp mở bán',
          order: 0,
        },
        {
          catalogId: projectSaleStatusCatalog.id,
          value: 'ON_SALE',
          label: 'Đang mở bán',
          order: 1,
        },
        {
          catalogId: projectSaleStatusCatalog.id,
          value: 'SOLD_OUT',
          label: 'Đã bán hết',
          order: 2,
        },
      ],
    });

    return projectSaleStatusCatalog;
  }
}

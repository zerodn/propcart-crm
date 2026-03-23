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

    // Auto-initialize HDLD type catalog if it doesn't exist
    const hdldTypeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'HDLD_TYPE', code: 'HDLD_TYPE' },
    });

    if (!hdldTypeCatalogExists) {
      await this.initializeHdldTypeCatalog(workspaceId);
    }

    // Auto-initialize employment status catalog if it doesn't exist
    const employmentStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'EMPLOYMENT_STATUS', code: 'EMPLOYMENT_STATUS' },
    });

    if (!employmentStatusCatalogExists) {
      await this.initializeEmploymentStatusCatalog(workspaceId);
    }

    // Auto-initialize account status catalog if it doesn't exist
    const accountStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'ACCOUNT_STATUS', code: 'ACCOUNT_STATUS' },
    });

    if (!accountStatusCatalogExists) {
      await this.initializeAccountStatusCatalog(workspaceId);
    }

    // Auto-initialize department status catalog if it doesn't exist
    const departmentStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'DEPARTMENT_STATUS', code: 'DEPARTMENT_STATUS' },
    });

    if (!departmentStatusCatalogExists) {
      await this.initializeDepartmentStatusCatalog(workspaceId);
    }

    // Auto-initialize customer source catalog if it doesn't exist
    const customerSourceCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'CUSTOMER_SOURCE', code: 'CUSTOMER_SOURCE' },
    });

    if (!customerSourceCatalogExists) {
      await this.initializeCustomerSourceCatalog(workspaceId);
    }

    // Auto-initialize customer group catalog if it doesn't exist
    const customerGroupCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'CUSTOMER_GROUP', code: 'CUSTOMER_GROUP' },
    });

    if (!customerGroupCatalogExists) {
      await this.initializeCustomerGroupCatalog(workspaceId);
    }

    // Auto-initialize customer status catalog if it doesn't exist
    const customerStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'CUSTOMER_STATUS', code: 'CUSTOMER_STATUS' },
    });

    if (!customerStatusCatalogExists) {
      await this.initializeCustomerStatusCatalog(workspaceId);
    }

    // Auto-initialize customer interest level catalog if it doesn't exist
    const customerInterestLevelCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'CUSTOMER_INTEREST_LEVEL', code: 'CUSTOMER_INTEREST_LEVEL' },
    });

    if (!customerInterestLevelCatalogExists) {
      await this.initializeCustomerInterestLevelCatalog(workspaceId);
    }

    // Auto-initialize demand property type catalog if it doesn't exist
    const demandPropertyTypeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'DEMAND_PROPERTY_TYPE', code: 'DEMAND_PROPERTY_TYPE' },
    });
    if (!demandPropertyTypeCatalogExists) {
      await this.initializeDemandPropertyTypeCatalog(workspaceId);
    }

    // Auto-initialize demand purpose catalog if it doesn't exist
    const demandPurposeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'DEMAND_PURPOSE', code: 'DEMAND_PURPOSE' },
    });
    if (!demandPurposeCatalogExists) {
      await this.initializeDemandPurposeCatalog(workspaceId);
    }

    // Auto-initialize demand status catalog if it doesn't exist
    const demandStatusCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'DEMAND_STATUS', code: 'DEMAND_STATUS' },
    });
    if (!demandStatusCatalogExists) {
      await this.initializeDemandStatusCatalog(workspaceId);
    }

    // Auto-initialize demand priority catalog if it doesn't exist
    const demandPriorityCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'DEMAND_PRIORITY', code: 'DEMAND_PRIORITY' },
    });
    if (!demandPriorityCatalogExists) {
      await this.initializeDemandPriorityCatalog(workspaceId);
    }

    // Auto-initialize activity type catalog if it doesn't exist
    const activityTypeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'ACTIVITY_TYPE', code: 'ACTIVITY_TYPE' },
    });
    if (!activityTypeCatalogExists) {
      await this.initializeActivityTypeCatalog(workspaceId);
    }

    // Auto-initialize activity result catalog if it doesn't exist
    const activityResultCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'ACTIVITY_RESULT', code: 'ACTIVITY_RESULT' },
    });
    if (!activityResultCatalogExists) {
      await this.initializeActivityResultCatalog(workspaceId);
    }

    // Auto-initialize task category catalog if it doesn't exist
    const taskCategoryCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'TASK_CATEGORY', code: 'TASK_CATEGORY' },
    });
    if (!taskCategoryCatalogExists) {
      await this.initializeTaskCategoryCatalog(workspaceId);
    }

    // Auto-initialize task priority catalog if it doesn't exist
    const taskPriorityCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'TASK_PRIORITY', code: 'TASK_PRIORITY' },
    });
    if (!taskPriorityCatalogExists) {
      await this.initializeTaskPriorityCatalog(workspaceId);
    }

    // Auto-initialize document type catalog if it doesn't exist
    const documentTypeCatalogExists = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'DOCUMENT_TYPE', code: 'DOCUMENT_TYPE' },
    });
    if (!documentTypeCatalogExists) {
      await this.initializeDocumentTypeCatalog(workspaceId);
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
      // System catalogs use `value` as an immutable mapping key — only label/color/order may change
      const SYSTEM_CATALOG_TYPES = ['ACCOUNT_STATUS', 'EMPLOYMENT_STATUS'];
      const catalog = await this.prisma.catalog.findUnique({
        where: { id },
        select: { type: true },
      });

      if (catalog && SYSTEM_CATALOG_TYPES.includes(catalog.type)) {
        // Only update mutable fields; never delete or rename existing value keys
        for (const v of data.values) {
          await this.prisma.catalogValue.updateMany({
            where: { catalogId: id, value: v.value },
            data: { label: v.label, color: v.color ?? null, order: v.order ?? 0 },
          });
        }
      } else {
        // Non-system catalog: full replace
        await this.prisma.catalogValue.deleteMany({ where: { catalogId: id } });
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

  private async initializeDepartmentStatusCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'DEPARTMENT_STATUS',
        code: 'DEPARTMENT_STATUS',
        name: 'Trạng thái phòng ban',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'ACTIVE', label: 'Hoạt động', order: 0 },
        { catalogId: catalog.id, value: 'INACTIVE', label: 'Ngưng hoạt động', order: 1 },
        { catalogId: catalog.id, value: 'DISSOLVED', label: 'Giải tán', order: 2 },
      ],
    });

    return catalog;
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

  private async initializeHdldTypeCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'HDLD_TYPE',
        code: 'HDLD_TYPE',
        name: 'Loại HĐLĐ',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'THU_VIEC', label: 'Thử việc', order: 0 },
        { catalogId: catalog.id, value: 'BA_THANG', label: '3 tháng', order: 1 },
        { catalogId: catalog.id, value: 'SAU_THANG', label: '6 tháng', order: 2 },
      ],
    });

    return catalog;
  }

  private async initializeEmploymentStatusCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'EMPLOYMENT_STATUS',
        code: 'EMPLOYMENT_STATUS',
        name: 'Trạng thái nhân sự',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'PROBATION', label: 'Thử việc', order: 0 },
        { catalogId: catalog.id, value: 'WORKING', label: 'Đang làm việc', order: 1 },
        { catalogId: catalog.id, value: 'ON_LEAVE', label: 'Tạm nghỉ', order: 2 },
        { catalogId: catalog.id, value: 'RESIGNED', label: 'Đã nghỉ việc', order: 3 },
        { catalogId: catalog.id, value: 'RETIRED', label: 'Nghỉ hưu', order: 4 },
        { catalogId: catalog.id, value: 'FIRED', label: 'Bị sa thải', order: 5 },
      ],
    });

    return catalog;
  }

  private async initializeAccountStatusCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'ACCOUNT_STATUS',
        code: 'ACCOUNT_STATUS',
        name: 'Trạng thái tài khoản',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: '1', label: 'Đang hoạt động', order: 0 },
        { catalogId: catalog.id, value: '2', label: 'Tạm khóa', order: 1 },
        { catalogId: catalog.id, value: '0', label: 'Đã vô hiệu hóa', order: 2 },
      ],
    });

    return catalog;
  }

  private async initializeCustomerSourceCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'CUSTOMER_SOURCE',
        code: 'CUSTOMER_SOURCE',
        name: 'Nguồn khách hàng',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'FACEBOOK', label: 'Facebook', order: 0 },
        { catalogId: catalog.id, value: 'ZALO', label: 'Zalo', order: 1 },
        { catalogId: catalog.id, value: 'WEBSITE', label: 'Website', order: 2 },
        { catalogId: catalog.id, value: 'REFERRAL', label: 'Giới thiệu', order: 3 },
        { catalogId: catalog.id, value: 'WALK_IN', label: 'Khách vãng lai', order: 4 },
        { catalogId: catalog.id, value: 'EVENT', label: 'Sự kiện', order: 5 },
        { catalogId: catalog.id, value: 'HOTLINE', label: 'Hotline', order: 6 },
        { catalogId: catalog.id, value: 'OTHER', label: 'Khác', order: 7 },
      ],
    });

    return catalog;
  }

  private async initializeCustomerGroupCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'CUSTOMER_GROUP',
        code: 'CUSTOMER_GROUP',
        name: 'Nhóm khách hàng',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'INDIVIDUAL', label: 'Cá nhân', order: 0 },
        { catalogId: catalog.id, value: 'INVESTOR', label: 'Nhà đầu tư', order: 1 },
        { catalogId: catalog.id, value: 'COMPANY', label: 'Doanh nghiệp', order: 2 },
        { catalogId: catalog.id, value: 'VIP', label: 'VIP', order: 3 },
      ],
    });

    return catalog;
  }

  private async initializeCustomerStatusCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'CUSTOMER_STATUS',
        code: 'CUSTOMER_STATUS',
        name: 'Trạng thái khách hàng',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'NEW', label: 'Mới', color: '#3b82f6', order: 0 },
        {
          catalogId: catalog.id,
          value: 'CONTACTED',
          label: 'Đã liên hệ',
          color: '#8b5cf6',
          order: 1,
        },
        {
          catalogId: catalog.id,
          value: 'INTERESTED',
          label: 'Quan tâm',
          color: '#f59e0b',
          order: 2,
        },
        {
          catalogId: catalog.id,
          value: 'NEGOTIATING',
          label: 'Đang đàm phán',
          color: '#f97316',
          order: 3,
        },
        {
          catalogId: catalog.id,
          value: 'CONVERTED',
          label: 'Đã chuyển đổi',
          color: '#22c55e',
          order: 4,
        },
        { catalogId: catalog.id, value: 'LOST', label: 'Đã mất', color: '#ef4444', order: 5 },
      ],
    });

    return catalog;
  }

  private async initializeCustomerInterestLevelCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'CUSTOMER_INTEREST_LEVEL',
        code: 'CUSTOMER_INTEREST_LEVEL',
        name: 'Mức độ quan tâm',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'HOT', label: 'Nóng', color: '#ef4444', order: 0 },
        { catalogId: catalog.id, value: 'WARM', label: 'Ấm', color: '#f59e0b', order: 1 },
        { catalogId: catalog.id, value: 'COLD', label: 'Lạnh', color: '#3b82f6', order: 2 },
      ],
    });

    return catalog;
  }

  private async initializeDemandPropertyTypeCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'DEMAND_PROPERTY_TYPE',
        code: 'DEMAND_PROPERTY_TYPE',
        name: 'Loại bất động sản',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'APARTMENT', label: 'Căn hộ', order: 0 },
        { catalogId: catalog.id, value: 'HOUSE', label: 'Nhà phố', order: 1 },
        { catalogId: catalog.id, value: 'VILLA', label: 'Biệt thự', order: 2 },
        { catalogId: catalog.id, value: 'LAND', label: 'Đất nền', order: 3 },
        { catalogId: catalog.id, value: 'OFFICE', label: 'Văn phòng', order: 4 },
        { catalogId: catalog.id, value: 'SHOPHOUSE', label: 'Shophouse', order: 5 },
        { catalogId: catalog.id, value: 'PENTHOUSE', label: 'Penthouse', order: 6 },
        { catalogId: catalog.id, value: 'OTHER', label: 'Khác', order: 7 },
      ],
    });

    return catalog;
  }

  private async initializeDemandPurposeCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'DEMAND_PURPOSE',
        code: 'DEMAND_PURPOSE',
        name: 'Mục đích nhu cầu',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'BUY', label: 'Mua', color: '#22c55e', order: 0 },
        { catalogId: catalog.id, value: 'RENT', label: 'Thuê', color: '#3b82f6', order: 1 },
        { catalogId: catalog.id, value: 'INVEST', label: 'Đầu tư', color: '#f59e0b', order: 2 },
      ],
    });

    return catalog;
  }

  private async initializeDemandStatusCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'DEMAND_STATUS',
        code: 'DEMAND_STATUS',
        name: 'Trạng thái nhu cầu',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'NEW', label: 'Mới', color: '#3b82f6', order: 0 },
        {
          catalogId: catalog.id,
          value: 'SEARCHING',
          label: 'Đang tìm',
          color: '#8b5cf6',
          order: 1,
        },
        {
          catalogId: catalog.id,
          value: 'MATCHED',
          label: 'Đã tìm thấy',
          color: '#f59e0b',
          order: 2,
        },
        {
          catalogId: catalog.id,
          value: 'COMPLETED',
          label: 'Hoàn thành',
          color: '#22c55e',
          order: 3,
        },
        { catalogId: catalog.id, value: 'CANCELLED', label: 'Đã hủy', color: '#ef4444', order: 4 },
      ],
    });

    return catalog;
  }

  private async initializeDemandPriorityCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'DEMAND_PRIORITY',
        code: 'DEMAND_PRIORITY',
        name: 'Mức độ ưu tiên nhu cầu',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'HIGH', label: 'Cao', color: '#ef4444', order: 0 },
        { catalogId: catalog.id, value: 'MEDIUM', label: 'Trung bình', color: '#f59e0b', order: 1 },
        { catalogId: catalog.id, value: 'LOW', label: 'Thấp', color: '#3b82f6', order: 2 },
      ],
    });

    return catalog;
  }

  private async initializeActivityTypeCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'ACTIVITY_TYPE',
        code: 'ACTIVITY_TYPE',
        name: 'Loại hoạt động',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'CALL', label: 'Gọi điện', color: '#3b82f6', order: 0 },
        { catalogId: catalog.id, value: 'MEETING', label: 'Gặp mặt', color: '#8b5cf6', order: 1 },
        { catalogId: catalog.id, value: 'EMAIL', label: 'Email', color: '#06b6d4', order: 2 },
        { catalogId: catalog.id, value: 'NOTE', label: 'Ghi chú', color: '#f59e0b', order: 3 },
        { catalogId: catalog.id, value: 'VISIT', label: 'Thăm quan', color: '#22c55e', order: 4 },
        { catalogId: catalog.id, value: 'SMS', label: 'Tin nhắn SMS', color: '#64748b', order: 5 },
        { catalogId: catalog.id, value: 'OTHER', label: 'Khác', color: '#94a3b8', order: 6 },
      ],
    });

    return catalog;
  }

  private async initializeActivityResultCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'ACTIVITY_RESULT',
        code: 'ACTIVITY_RESULT',
        name: 'Kết quả hoạt động',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'POSITIVE', label: 'Tích cực', color: '#22c55e', order: 0 },
        { catalogId: catalog.id, value: 'NEUTRAL', label: 'Trung lập', color: '#f59e0b', order: 1 },
        { catalogId: catalog.id, value: 'NEGATIVE', label: 'Tiêu cực', color: '#ef4444', order: 2 },
        {
          catalogId: catalog.id,
          value: 'NO_ANSWER',
          label: 'Không trả lời',
          color: '#94a3b8',
          order: 3,
        },
        {
          catalogId: catalog.id,
          value: 'CALLBACK',
          label: 'Hẹn gọi lại',
          color: '#3b82f6',
          order: 4,
        },
      ],
    });

    return catalog;
  }

  private async initializeTaskCategoryCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'TASK_CATEGORY',
        code: 'TASK_CATEGORY',
        name: 'Loại công việc',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: catalog.id,
          value: 'FOLLOW_UP',
          label: 'Theo dõi',
          color: '#3b82f6',
          order: 0,
        },
        { catalogId: catalog.id, value: 'CALL_BACK', label: 'Gọi lại', color: '#8b5cf6', order: 1 },
        { catalogId: catalog.id, value: 'MEETING', label: 'Cuộc họp', color: '#06b6d4', order: 2 },
        { catalogId: catalog.id, value: 'DOCUMENT', label: 'Giấy tờ', color: '#f59e0b', order: 3 },
        {
          catalogId: catalog.id,
          value: 'SITE_VISIT',
          label: 'Khảo sát',
          color: '#22c55e',
          order: 4,
        },
        { catalogId: catalog.id, value: 'OTHER', label: 'Khác', color: '#94a3b8', order: 5 },
      ],
    });

    return catalog;
  }

  private async initializeTaskPriorityCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'TASK_PRIORITY',
        code: 'TASK_PRIORITY',
        name: 'Mức độ ưu tiên công việc',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'HIGH', label: 'Cao', color: '#ef4444', order: 0 },
        { catalogId: catalog.id, value: 'MEDIUM', label: 'Trung bình', color: '#f59e0b', order: 1 },
        { catalogId: catalog.id, value: 'LOW', label: 'Thấp', color: '#3b82f6', order: 2 },
      ],
    });

    return catalog;
  }

  private async initializeDocumentTypeCatalog(workspaceId: string) {
    const catalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'DOCUMENT_TYPE',
        code: 'DOCUMENT_TYPE',
        name: 'Danh mục tài liệu',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: catalog.id, value: 'CCCD', label: 'CCCD/CMND', order: 0 },
        { catalogId: catalog.id, value: 'HDLD', label: 'Hợp đồng lao động', order: 1 },
        { catalogId: catalog.id, value: 'CHUNG_CHI', label: 'Chứng chỉ', order: 2 },
        { catalogId: catalog.id, value: 'OTHER', label: 'Khác', order: 3 },
      ],
    });

    return catalog;
  }
}

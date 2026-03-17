import { PrismaService } from '../../prisma/prisma.service';

/**
 * Initialize default catalogs for a workspace
 * Called after workspace creation or manually
 */
export async function seedWorkspaceCatalogs(prisma: PrismaService, workspaceId: string) {
  // Create "Vai trò" (Role) parent catalog
  const roleCatalog = await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'ROLE',
      code: 'ROLE',
      name: 'Vai trò',
      parentId: null,
    },
  });

  // Create role values (admin, sales, manager, etc.)
  await prisma.catalogValue.createMany({
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

  // Create "Nhãn sản phẩm" catalog
  const productTagCatalog = await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'PRODUCT_TAG',
      code: 'PRODUCT_TAG',
      name: 'Nhãn sản phẩm',
      parentId: null,
    },
  });

  await prisma.catalogValue.createMany({
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

  // Create "Loại hình bất động sản" catalog
  const propertyTypeCatalog = await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'PROPERTY_TYPE',
      code: 'PROPERTY_TYPE',
      name: 'Loại hình bất động sản',
      parentId: null,
    },
  });

  await prisma.catalogValue.createMany({
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

  // Create "Hướng BĐS" catalog
  const propertyDirectionCatalog = await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'PROPERTY_DIRECTION',
      code: 'PROPERTY_DIRECTION',
      name: 'Hướng BĐS',
      parentId: null,
    },
  });

  await prisma.catalogValue.createMany({
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

  // Create "Trạng thái giao dịch BĐS" catalog
  const transactionStatusCatalog = await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'PROPERTY_TRANSACTION_STATUS',
      code: 'PROPERTY_TRANSACTION_STATUS',
      name: 'Trạng thái giao dịch BĐS',
      parentId: null,
    },
  });

  await prisma.catalogValue.createMany({
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

  // Create "Tài liệu sản phẩm" catalog
  const productDocumentCatalog = await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'PRODUCT_DOCUMENT',
      code: 'PRODUCT_DOCUMENT',
      name: 'Tài liệu sản phẩm',
      parentId: null,
    },
  });

  await prisma.catalogValue.createMany({
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

  // Create "Loại HĐLĐ" (Labor Contract Type) catalog
  await prisma.catalog.create({
    data: {
      workspaceId,
      type: 'HDLD_TYPE',
      code: 'HDLD_TYPE',
      name: 'Loại HĐLĐ',
      parentId: null,
      values: {
        create: [
          { value: 'THU_VIEC', label: 'Thử việc', order: 0 },
          { value: 'BA_THANG', label: '3 tháng', order: 1 },
          { value: 'SAU_THANG', label: '6 tháng', order: 2 },
        ],
      },
    },
  });

  return roleCatalog;
}

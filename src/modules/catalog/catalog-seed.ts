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

  return roleCatalog;
}

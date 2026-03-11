import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================
  // Seed Roles
  // ============================================================
  const roles = [
    { code: 'OWNER', name: 'Owner', description: 'Chủ sở hữu workspace' },
    { code: 'ADMIN', name: 'Admin', description: 'Quản trị viên' },
    { code: 'MANAGER', name: 'Manager', description: 'Quản lý' },
    { code: 'SALES', name: 'Sales', description: 'Nhân viên kinh doanh' },
    { code: 'PARTNER', name: 'Partner', description: 'Đối tác' },
    { code: 'VIEWER', name: 'Viewer', description: 'Người xem' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
  console.log(`✅ Seeded ${roles.length} roles`);

  // ============================================================
  // Seed Permissions
  // ============================================================
  const permissions = [
    { code: 'WORKSPACE_MEMBER_INVITE', name: 'Invite Workspace Member', module: 'workspace' },
    { code: 'WORKSPACE_MEMBER_REMOVE', name: 'Remove Workspace Member', module: 'workspace' },
    { code: 'WORKSPACE_SETTINGS_EDIT', name: 'Edit Workspace Settings', module: 'workspace' },
    { code: 'CATALOG_CREATE', name: 'Create Catalog', module: 'catalog' },
    { code: 'CATALOG_UPDATE', name: 'Update Catalog', module: 'catalog' },
    { code: 'CATALOG_DELETE', name: 'Delete Catalog', module: 'catalog' },
    { code: 'DEPARTMENT_CREATE', name: 'Create Department', module: 'department' },
    { code: 'DEPARTMENT_UPDATE', name: 'Update Department', module: 'department' },
    { code: 'DEPARTMENT_DELETE', name: 'Delete Department', module: 'department' },
    { code: 'WAREHOUSE_CREATE', name: 'Create Warehouse', module: 'warehouse' },
    { code: 'WAREHOUSE_UPDATE', name: 'Update Warehouse', module: 'warehouse' },
    { code: 'WAREHOUSE_DELETE', name: 'Delete Warehouse', module: 'warehouse' },
    { code: 'WAREHOUSE_VIEW', name: 'View Warehouse', module: 'warehouse' },
    { code: 'PRODUCT_CREATE', name: 'Create Product', module: 'product' },
    { code: 'PRODUCT_UPDATE', name: 'Update Product', module: 'product' },
    { code: 'PRODUCT_DELETE', name: 'Delete Product', module: 'product' },
    { code: 'PRODUCT_VIEW', name: 'View Product', module: 'product' },
    { code: 'PRODUCT_VIEW_HIDDEN', name: 'View Hidden Product', module: 'product' },
    { code: 'PROJECT_CREATE', name: 'Create Project', module: 'project' },
    { code: 'PROJECT_UPDATE', name: 'Update Project', module: 'project' },
    { code: 'PROJECT_DELETE', name: 'Delete Project', module: 'project' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, module: permission.module },
      create: permission,
    });
  }
  console.log(`✅ Seeded ${permissions.length} permissions`);

  // ============================================================
  // Assign Permissions to Roles
  // ============================================================
  const ownerRole = await prisma.role.findUnique({ where: { code: 'OWNER' } });
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });

  const invitePermission = await prisma.permission.findUnique({
    where: { code: 'WORKSPACE_MEMBER_INVITE' },
  });
  const removePermission = await prisma.permission.findUnique({
    where: { code: 'WORKSPACE_MEMBER_REMOVE' },
  });
  const settingsPermission = await prisma.permission.findUnique({
    where: { code: 'WORKSPACE_SETTINGS_EDIT' },
  });
  const catalogCreatePermission = await prisma.permission.findUnique({
    where: { code: 'CATALOG_CREATE' },
  });
  const catalogUpdatePermission = await prisma.permission.findUnique({
    where: { code: 'CATALOG_UPDATE' },
  });
  const catalogDeletePermission = await prisma.permission.findUnique({
    where: { code: 'CATALOG_DELETE' },
  });
  const departmentCreatePermission = await prisma.permission.findUnique({
    where: { code: 'DEPARTMENT_CREATE' },
  });
  const departmentUpdatePermission = await prisma.permission.findUnique({
    where: { code: 'DEPARTMENT_UPDATE' },
  });
  const departmentDeletePermission = await prisma.permission.findUnique({
    where: { code: 'DEPARTMENT_DELETE' },
  });
  const warehouseCreatePermission = await prisma.permission.findUnique({
    where: { code: 'WAREHOUSE_CREATE' },
  });
  const warehouseUpdatePermission = await prisma.permission.findUnique({
    where: { code: 'WAREHOUSE_UPDATE' },
  });
  const warehouseDeletePermission = await prisma.permission.findUnique({
    where: { code: 'WAREHOUSE_DELETE' },
  });
  const warehouseViewPermission = await prisma.permission.findUnique({
    where: { code: 'WAREHOUSE_VIEW' },
  });
  const productCreatePermission = await prisma.permission.findUnique({
    where: { code: 'PRODUCT_CREATE' },
  });
  const productUpdatePermission = await prisma.permission.findUnique({
    where: { code: 'PRODUCT_UPDATE' },
  });
  const productDeletePermission = await prisma.permission.findUnique({
    where: { code: 'PRODUCT_DELETE' },
  });
  const productViewPermission = await prisma.permission.findUnique({
    where: { code: 'PRODUCT_VIEW' },
  });
  const productViewHiddenPermission = await prisma.permission.findUnique({
    where: { code: 'PRODUCT_VIEW_HIDDEN' },
  });
  const projectCreatePermission = await prisma.permission.findUnique({
    where: { code: 'PROJECT_CREATE' },
  });
  const projectUpdatePermission = await prisma.permission.findUnique({
    where: { code: 'PROJECT_UPDATE' },
  });
  const projectDeletePermission = await prisma.permission.findUnique({
    where: { code: 'PROJECT_DELETE' },
  });

  const rolePermissions = [
    { roleId: ownerRole!.id, permissionId: invitePermission!.id },
    { roleId: ownerRole!.id, permissionId: removePermission!.id },
    { roleId: ownerRole!.id, permissionId: settingsPermission!.id },
    { roleId: ownerRole!.id, permissionId: catalogCreatePermission!.id },
    { roleId: ownerRole!.id, permissionId: catalogUpdatePermission!.id },
    { roleId: ownerRole!.id, permissionId: catalogDeletePermission!.id },
    { roleId: ownerRole!.id, permissionId: departmentCreatePermission!.id },
    { roleId: ownerRole!.id, permissionId: departmentUpdatePermission!.id },
    { roleId: ownerRole!.id, permissionId: departmentDeletePermission!.id },
    { roleId: ownerRole!.id, permissionId: warehouseCreatePermission!.id },
    { roleId: ownerRole!.id, permissionId: warehouseUpdatePermission!.id },
    { roleId: ownerRole!.id, permissionId: warehouseDeletePermission!.id },
    { roleId: ownerRole!.id, permissionId: warehouseViewPermission!.id },
    { roleId: ownerRole!.id, permissionId: productCreatePermission!.id },
    { roleId: ownerRole!.id, permissionId: productUpdatePermission!.id },
    { roleId: ownerRole!.id, permissionId: productDeletePermission!.id },
    { roleId: ownerRole!.id, permissionId: productViewPermission!.id },
    { roleId: ownerRole!.id, permissionId: productViewHiddenPermission!.id },
    { roleId: ownerRole!.id, permissionId: projectCreatePermission!.id },
    { roleId: ownerRole!.id, permissionId: projectUpdatePermission!.id },
    { roleId: ownerRole!.id, permissionId: projectDeletePermission!.id },
    { roleId: adminRole!.id, permissionId: invitePermission!.id },
    { roleId: adminRole!.id, permissionId: removePermission!.id },
    { roleId: adminRole!.id, permissionId: catalogCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: catalogUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: catalogDeletePermission!.id },
    { roleId: adminRole!.id, permissionId: departmentCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: departmentUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: departmentDeletePermission!.id },
    { roleId: adminRole!.id, permissionId: warehouseCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: warehouseUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: warehouseDeletePermission!.id },
    { roleId: adminRole!.id, permissionId: warehouseViewPermission!.id },
    { roleId: adminRole!.id, permissionId: productCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: productUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: productDeletePermission!.id },
    { roleId: adminRole!.id, permissionId: productViewPermission!.id },
    { roleId: adminRole!.id, permissionId: productViewHiddenPermission!.id },
    { roleId: adminRole!.id, permissionId: projectCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: projectUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: projectDeletePermission!.id },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rp.roleId, permissionId: rp.permissionId } },
      update: {},
      create: rp,
    });
  }
  console.log(`✅ Assigned permissions to OWNER and ADMIN roles`);

  // ============================================================
  // Seed Global Catalogs Templates (Meta-data for all workspaces)
  // These will be used as templates when creating workspaces
  // ============================================================
  console.log('🌏 Seeding catalog templates for future workspaces...');

  // Note: Workspace-specific catalogs are auto-created when workspace is created
  // in auth.service.ts > createPersonalWorkspace() > initializeWorkspaceCatalogs()

  console.log('✅ Catalog templates ready for auto-initialization');

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

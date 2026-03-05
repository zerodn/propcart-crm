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
    { roleId: adminRole!.id, permissionId: invitePermission!.id },
    { roleId: adminRole!.id, permissionId: removePermission!.id },
    { roleId: adminRole!.id, permissionId: catalogCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: catalogUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: catalogDeletePermission!.id },
    { roleId: adminRole!.id, permissionId: departmentCreatePermission!.id },
    { roleId: adminRole!.id, permissionId: departmentUpdatePermission!.id },
    { roleId: adminRole!.id, permissionId: departmentDeletePermission!.id },
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

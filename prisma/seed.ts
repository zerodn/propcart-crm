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

  const rolePermissions = [
    { roleId: ownerRole!.id, permissionId: invitePermission!.id },
    { roleId: ownerRole!.id, permissionId: removePermission!.id },
    { roleId: ownerRole!.id, permissionId: settingsPermission!.id },
    { roleId: adminRole!.id, permissionId: invitePermission!.id },
    { roleId: adminRole!.id, permissionId: removePermission!.id },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rp.roleId, permissionId: rp.permissionId } },
      update: {},
      create: rp,
    });
  }
  console.log(`✅ Assigned permissions to OWNER and ADMIN roles`);

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

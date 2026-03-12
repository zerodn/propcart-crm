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

  // ============================================================
  // Seed Demo Workspace Data (Warehouses + Products)
  // ============================================================
  console.log('🏬 Seeding demo warehouses and products...');

  const demoOwner = await prisma.user.upsert({
    where: { phone: '0900000001' },
    update: {
      fullName: 'Demo Owner',
      email: 'demo-owner@propcart.local',
      status: 1,
    },
    create: {
      phone: '0900000001',
      email: 'demo-owner@propcart.local',
      fullName: 'Demo Owner',
      passwordHash: 'seeded-password',
      status: 1,
    },
  });

  const ownerRoleData = await prisma.role.findUnique({ where: { code: 'OWNER' } });
  if (!ownerRoleData) {
    throw new Error('OWNER role not found during seeding');
  }

  let demoWorkspace = await prisma.workspace.findFirst({
    where: {
      ownerUserId: demoOwner.id,
      name: 'Demo Workspace Seed',
    },
  });

  if (!demoWorkspace) {
    demoWorkspace = await prisma.workspace.create({
      data: {
        type: 'COMPANY',
        name: 'Demo Workspace Seed',
        ownerUserId: demoOwner.id,
        status: 1,
      },
    });
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: demoWorkspace.id,
        userId: demoOwner.id,
      },
    },
    update: {
      roleId: ownerRoleData.id,
      status: 1,
      displayName: 'Demo Owner',
    },
    create: {
      workspaceId: demoWorkspace.id,
      userId: demoOwner.id,
      roleId: ownerRoleData.id,
      status: 1,
      displayName: 'Demo Owner',
    },
  });

  const warehouseTypePool = ['PRIMARY', 'SATELLITE', 'TEMP', 'PROJECT'];
  const provincePool = ['Ho Chi Minh', 'Ha Noi', 'Da Nang', 'Can Tho'];
  const wardPool = ['Phuong 1', 'Phuong 2', 'Phuong 3', 'Phuong 4'];

  const seededWarehouses: Array<{ id: string; code: string; name: string }> = [];

  for (let i = 1; i <= 24; i++) {
    const code = `WH-${String(i).padStart(3, '0')}`;
    const type = warehouseTypePool[(i - 1) % warehouseTypePool.length];
    const provinceName = provincePool[(i - 1) % provincePool.length];
    const wardName = wardPool[(i - 1) % wardPool.length];

    const payload = {
      workspaceId: demoWorkspace.id,
      name: `Kho BDS ${i}`,
      code,
      type,
      description: `Kho mẫu ${i} phục vụ kiểm thử phân trang`,
      status: i % 7 === 0 ? 0 : 1,
      latitude: (10.75 + i * 0.001).toFixed(8),
      longitude: (106.66 + i * 0.001).toFixed(8),
      provinceCode: `${79 + (i % 4)}`,
      provinceName,
      wardCode: `${1000 + i}`,
      wardName,
      fullAddress: `${i} Seed Street, ${wardName}, ${provinceName}`,
      createdByUserId: demoOwner.id,
    };

    const existingWarehouse = await prisma.propertyWarehouse.findFirst({
      where: {
        workspaceId: demoWorkspace.id,
        code,
      },
      select: { id: true },
    });

    const warehouse = existingWarehouse
      ? await prisma.propertyWarehouse.update({
          where: { id: existingWarehouse.id },
          data: payload,
        })
      : await prisma.propertyWarehouse.create({
          data: payload,
        });

    seededWarehouses.push({ id: warehouse.id, code: warehouse.code, name: warehouse.name });
  }

  const propertyTypePool = ['APARTMENT', 'TOWNHOUSE', 'SHOPHOUSE', 'VILLA'];
  const directionPool = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTH_EAST', 'SOUTH_WEST'];

  for (let i = 1; i <= 48; i++) {
    const unitCode = `SP-${String(i).padStart(4, '0')}`;
    const warehouse = seededWarehouses[(i - 1) % seededWarehouses.length];
    const area = 48 + i * 1.75;
    const priceWithoutVat = 1500000000 + i * 45000000;
    const priceWithVat = Math.round(priceWithoutVat * 1.1);

    const payload = {
      workspaceId: demoWorkspace.id,
      warehouseId: warehouse.id,
      name: `Sản phẩm mẫu ${i}`,
      unitCode,
      tags: ['seed', `warehouse:${warehouse.code}`, i % 2 === 0 ? 'hot' : 'standard'],
      propertyType: propertyTypePool[(i - 1) % propertyTypePool.length],
      zone: `Zone ${((i - 1) % 6) + 1}`,
      block: `Block ${String.fromCharCode(65 + ((i - 1) % 6))}`,
      direction: directionPool[(i - 1) % directionPool.length],
      area: area.toFixed(2),
      priceWithoutVat: priceWithoutVat.toString(),
      priceWithVat: priceWithVat.toString(),
      isContactForPrice: i % 9 === 0,
      isHidden: i % 11 === 0,
      promotionProgram: i % 3 === 0 ? 'Ưu đãi nội bộ quý này' : null,
      policyImageUrls: [
        `https://picsum.photos/seed/policy-${i}-1/1200/700`,
        `https://picsum.photos/seed/policy-${i}-2/1200/700`,
      ],
      productDocuments: [
        {
          documentType: 'BROCHURE',
          fileName: `brochure-${unitCode}.pdf`,
          fileUrl: `https://example.com/docs/${unitCode}.pdf`,
        },
      ],
      callPhone: '0900000001',
      zaloPhone: '0900000001',
      contactMemberIds: [demoOwner.id],
      transactionStatus: i % 5 === 0 ? 'BOOKED' : 'AVAILABLE',
      note: `Ghi chú mẫu cho ${unitCode}`,
      createdByUserId: demoOwner.id,
    };

    const existingProduct = await prisma.propertyProduct.findFirst({
      where: {
        workspaceId: demoWorkspace.id,
        unitCode,
      },
      select: { id: true },
    });

    if (existingProduct) {
      await prisma.propertyProduct.update({
        where: { id: existingProduct.id },
        data: payload,
      });
    } else {
      await prisma.propertyProduct.create({ data: payload });
    }
  }

  console.log(`✅ Seeded 24 warehouses in workspace: ${demoWorkspace.name}`);
  console.log(`✅ Seeded 48 products linked to those warehouses`);

  // ============================================================
  // Seed target workspace data for real user phone
  // ============================================================
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ phone: '+84905211851' }, { phone: '84905211851' }, { phone: '0905211851' }],
    },
    select: { id: true, phone: true },
  });

  if (targetUser) {
    const targetWorkspace = await prisma.workspace.findFirst({
      where: {
        ownerUserId: targetUser.id,
        status: 1,
      },
      select: { id: true, name: true },
    });

    if (targetWorkspace) {
      const targetSeededWarehouses: Array<{ id: string; code: string; name: string }> = [];

      for (let i = 1; i <= 24; i++) {
        const code = `UWH-${String(i).padStart(3, '0')}`;
        const type = warehouseTypePool[(i - 1) % warehouseTypePool.length];
        const provinceName = provincePool[(i - 1) % provincePool.length];
        const wardName = wardPool[(i - 1) % wardPool.length];

        const payload = {
          workspaceId: targetWorkspace.id,
          name: `Kho BDS mẫu ${i}`,
          code,
          type,
          description: `Kho mẫu auto-seed ${i} cho workspace người dùng`,
          status: i % 7 === 0 ? 0 : 1,
          latitude: (10.65 + i * 0.001).toFixed(8),
          longitude: (106.75 + i * 0.001).toFixed(8),
          provinceCode: `${79 + (i % 4)}`,
          provinceName,
          wardCode: `${2000 + i}`,
          wardName,
          fullAddress: `${i} Seed User Street, ${wardName}, ${provinceName}`,
          createdByUserId: targetUser.id,
        };

        const existingWarehouse = await prisma.propertyWarehouse.findFirst({
          where: {
            workspaceId: targetWorkspace.id,
            code,
          },
          select: { id: true },
        });

        const warehouse = existingWarehouse
          ? await prisma.propertyWarehouse.update({
              where: { id: existingWarehouse.id },
              data: payload,
            })
          : await prisma.propertyWarehouse.create({
              data: payload,
            });

        targetSeededWarehouses.push({ id: warehouse.id, code: warehouse.code, name: warehouse.name });
      }

      for (let i = 1; i <= 48; i++) {
        const unitCode = `USP-${String(i).padStart(4, '0')}`;
        const warehouse = targetSeededWarehouses[(i - 1) % targetSeededWarehouses.length];
        const area = 50 + i * 1.65;
        const priceWithoutVat = 1800000000 + i * 42000000;
        const priceWithVat = Math.round(priceWithoutVat * 1.1);

        const payload = {
          workspaceId: targetWorkspace.id,
          warehouseId: warehouse.id,
          name: `Sản phẩm mẫu user ${i}`,
          unitCode,
          tags: ['seed', 'user-workspace', `warehouse:${warehouse.code}`],
          propertyType: propertyTypePool[(i - 1) % propertyTypePool.length],
          zone: `Zone ${((i - 1) % 6) + 1}`,
          block: `Block ${String.fromCharCode(65 + ((i - 1) % 6))}`,
          direction: directionPool[(i - 1) % directionPool.length],
          area: area.toFixed(2),
          priceWithoutVat: priceWithoutVat.toString(),
          priceWithVat: priceWithVat.toString(),
          isContactForPrice: i % 9 === 0,
          isHidden: i % 11 === 0,
          promotionProgram: i % 3 === 0 ? 'Ưu đãi seed cho workspace người dùng' : null,
          policyImageUrls: [
            `https://picsum.photos/seed/user-policy-${i}-1/1200/700`,
            `https://picsum.photos/seed/user-policy-${i}-2/1200/700`,
          ],
          productDocuments: [
            {
              documentType: 'BROCHURE',
              fileName: `brochure-${unitCode}.pdf`,
              fileUrl: `https://example.com/docs/${unitCode}.pdf`,
            },
          ],
          callPhone: targetUser.phone || '+84905211851',
          zaloPhone: targetUser.phone || '+84905211851',
          contactMemberIds: [targetUser.id],
          transactionStatus: i % 5 === 0 ? 'BOOKED' : 'AVAILABLE',
          note: `Ghi chú mẫu cho ${unitCode}`,
          createdByUserId: targetUser.id,
        };

        const existingProduct = await prisma.propertyProduct.findFirst({
          where: {
            workspaceId: targetWorkspace.id,
            unitCode,
          },
          select: { id: true },
        });

        if (existingProduct) {
          await prisma.propertyProduct.update({
            where: { id: existingProduct.id },
            data: payload,
          });
        } else {
          await prisma.propertyProduct.create({ data: payload });
        }
      }

      console.log(`✅ Seeded 24 warehouses in workspace: ${targetWorkspace.name}`);
      console.log(`✅ Seeded 48 products linked to those warehouses for ${targetUser.phone}`);
    } else {
      console.log('⚠️ Target user found but no active workspace to seed');
    }
  } else {
    console.log('⚠️ User +84905211851 not found, skipped user-workspace seeding');
  }

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

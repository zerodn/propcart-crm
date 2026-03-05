# Chiến Lược Giảm Thiểu Regression Issues

## Vấn Đề Hiện Tại

Khi phát triển tính năng mới, các tính năng cũ bị hỏng do:
- Thiếu dữ liệu khởi tạo (missing catalogs)
- Không có validation ở database level
- Thiếu comprehensive integration tests
- Dependencies không rõ ràng

**Ví dụ**: Invite modal role dropdown lỗi vì workspace không có ROLE catalog.

---

## Phương Án Giảm Thiểu

### 1. **Auto-Initialization Catalogs**
Tự động tạo catalogs cần thiết khi tạo workspace mới:

```typescript
// workspace.service.ts
async createWorkspace(data: CreateWorkspaceDto) {
  const workspace = await this.prisma.workspace.create({ data });
  
  // Auto-create required catalogs
  await this.initializeDefaultCatalogs(workspace.id);
  
  return workspace;
}

private async initializeDefaultCatalogs(workspaceId: string) {
  const defaultCatalogs = [
    { type: 'ROLE', code: 'ROLE', name: 'Vai trò', values: [
      { value: 'OWNER', label: 'Chủ sở hữu', order: 0 },
      { value: 'ADMIN', label: 'Quản trị viên', order: 1 },
      { value: 'MANAGER', label: 'Quản lý', order: 2 },
      { value: 'SALES', label: 'Kinh doanh', order: 3 },
      { value: 'PARTNER', label: 'Đối tác', order: 4 },
    ]},
    // Thêm catalogs khác...
  ];
  
  for (const cat of defaultCatalogs) {
    await this.catalogService.createWithValues(workspaceId, cat);
  }
}
```

### 2. **Database-Level Constraints**
Thêm constraints trong schema:

```prisma
model Catalog {
  // ...
  @@unique([code, workspaceId]) // Ensure unique catalogs per workspace
}

model WorkspaceMember {
  // ...
  @@unique([workspaceId, userId]) // Prevent duplicates
}
```

### 3. **Validation Layer**
Thêm service-level validation:

```typescript
// validators/catalog.validator.ts
export class CatalogValidator {
  static async validateRoleCatalogExists(
    workspaceId: string, 
    prisma: PrismaService
  ): Promise<void> {
    const exists = await prisma.catalog.findFirst({
      where: { workspaceId, type: 'ROLE', code: 'ROLE' }
    });
    
    if (!exists) {
      throw new HttpException(
        { code: 'ROLE_CATALOG_MISSING', message: 'Role catalog not initialized' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
```

### 4. **Comprehensive Integration Tests**
Test workflow untuk phát hiện regression sớm:

```typescript
// tests/invite-modal-workflow.e2e.spec.ts
describe('Invite Modal Workflow', () => {
  it('should load roles from ROLE catalog automatically', async () => {
    // 1. Create workspace
    const workspace = await createTestWorkspace();
    
    // 2. Verify ROLE catalog exists
    const catalog = await db.catalog.findFirst({
      where: { workspaceId: workspace.id, code: 'ROLE' }
    });
    
    expect(catalog).toBeDefined();
    expect(catalog.values).toHaveLength(5);
    
    // 3. Call roles API
    const res = await api.get(
      `/workspaces/${workspace.id}/roles`,
      { headers: authToken }
    );
    
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0]).toHaveProperty('code');
  });
});
```

### 5. **Migration Checklist**
Khi thêm feature mới:

```
[ ] Feature đã implement xong
[ ] Database migrations đã chạy
[ ] Seed data đã update (thêm catalogs nếu cần)
[ ] Existing tests vẫn pass (npm run test)
[ ] E2E tests vẫn pass (npm run test:e2e)
[ ] Auto-initialization logic hoạt động
[ ] Frontend integration test viết
```

### 6. **Type-Safe Catalog References**
Dùng TypeScript constants thay vì string literals:

```typescript
// constants/catalogs.ts
export enum CATALOG_TYPE {
  ROLE = 'ROLE',
  DEPARTMENT = 'DEPARTMENT',
  // ...
}

export enum ROLE_CODE {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES = 'SALES',
  PARTNER = 'PARTNER',
}

// usage
const catalog = await prisma.catalog.findFirst({
  where: { 
    type: CATALOG_TYPE.ROLE, 
    code: CATALOG_TYPE.ROLE // Typed!
  }
});
```

---

## Implementation Priority

1. **Immediate** (Prevent this bug again)
   - [ ] Auto-initialize catalogs on workspace creation
   - [ ] Add validation in role service
   - [ ] Add E2E test for invite workflow

2. **Short-term** (1-2 sprints)
   - [ ] Complete E2E test suite
   - [ ] Add pre-migration checklist
   - [ ] Document all catalog dependencies

3. **Long-term** (Ongoing)
   - [ ] Monitor production failures
   - [ ] Add more integration tests
   - [ ] Create feature flags for gradual rollout
   - [ ] Add data integrity checks to CI/CD

---

## Success Metrics

- ✅ No regressions in critical features during development
- ✅ All new features have corresponding E2E tests
- ✅ 100% of workspace creation includes required catalogs
- ✅ Type-safe catalog references across codebase
- ✅ Automated tests catch 95%+ of regressions

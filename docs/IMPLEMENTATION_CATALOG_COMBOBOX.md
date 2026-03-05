# Implementation: Liên Kết Tất Cả Combobox từ Catalogs

## Tóm Tắt

Tất cả dữ liệu khởi tạo dạng select/combobox đều phải:
1. Được **lưu trong danh mục (Catalog)**
2. Được **tạo tự động** khi khởi tạo workspace
3. Được **load từ API** thay vì hard-code
4. Có thể **chỉnh sửa bởi user** mà không cần code change

---

## Current Status: Các Comboboxes Đã Implement

### ✅ Vai Trò (Role) - DONE
- **Catalog Type**: `ROLE`
- **Endpoints**: 
  - `GET /workspaces/:workspaceId/roles` → Load roles
  - `GET /workspaces/:workspaceId/catalogs?type=ROLE` → Get catalog
- **Components**: 
  - `invite-modal.tsx` ✅ Already loads from API
  - `department-manage-modal.tsx` ✅ Already loads from API
- **Auto-Init**: ✅ Yes, `auth.service.ts` > `initializeWorkspaceCatalogs()`

---

## TODO: Các Comboboxes Cần Implement

### 1. **Phòng Ban (Department)** - TODO
**Tình trạng**: Sẽ implement trong MVP-04

**Catalog Template**:
```typescript
{
  type: 'DEPARTMENT',
  code: 'DEPARTMENT',
  name: 'Phòng Ban',
  values: [
    { value: 'SALES', label: 'Kinh Doanh', order: 1 },
    { value: 'MARKETING', label: 'Marketing', order: 2 },
    { value: 'OPERATIONS', label: 'Vận Hành', order: 3 },
    { value: 'SUPPORT', label: 'Hỗ Trợ', order: 4 },
  ]
}
```

**Frontend Components Cần Update**:
- Create Department form
- Edit Department form

**Implementation Steps**:
```bash
# 1. Add to auth.service.ts > initializeWorkspaceCatalogs()
# 2. Create dto: CreateDepartmentDto with catalogId reference
# 3. Update components to load from /catalogs?type=DEPARTMENT
# 4. Update tests
```

### 2. **Loại Bất Động Sản (Property Type)** - TODO
**Catalog Template**:
```typescript
{
  type: 'PROPERTY_TYPE',
  code: 'PROPERTY_TYPE',
  name: 'Loại Bất Động Sản',
  values: [
    { value: 'APARTMENT', label: 'Căn Hộ', order: 1 },
    { value: 'HOUSE', label: 'Nhà Riêng', order: 2 },
    { value: 'LAND', label: 'Đất Đai', order: 3 },
    { value: 'COMMERCIAL', label: 'Thương Mại', order: 4 },
    { value: 'INDUSTRIAL', label: 'Công Nghiệp', order: 5 },
  ]
}
```

### 3. **Trạng Thái Bất Động Sản (Property Status)** - TODO
**Catalog Template**:
```typescript
{
  type: 'PROPERTY_STATUS',
  code: 'PROPERTY_STATUS',
  name: 'Trạng Thái Bất Động Sản',
  values: [
    { value: 'AVAILABLE', label: 'Có Sẵn', order: 1 },
    { value: 'SOLD', label: 'Đã Bán', order: 2 },
    { value: 'RENTED', label: 'Đã Cho Thuê', order: 3 },
    { value: 'UNDER_OFFER', label: 'Đang Đàm Phán', order: 4 },
  ]
}
```

### 4. **Trạng Thái Lead (Lead Status)** - TODO
**Catalog Template**:
```typescript
{
  type: 'LEAD_STATUS',
  code: 'LEAD_STATUS',
  name: 'Trạng Thái Lead',
  values: [
    { value: 'NEW', label: 'Chưa Tiếp Xúc', order: 1 },
    { value: 'CONTACTED', label: 'Đã Liên Hệ', order: 2 },
    { value: 'QUALIFIED', label: 'Đủ Điều Kiện', order: 3 },
    { value: 'NEGOTIATING', label: 'Đang Đàm Phán', order: 4 },
    { value: 'CLOSED_WON', label: 'Thành Công', order: 5 },
    { value: 'CLOSED_LOST', label: 'Mất', order: 6 },
  ]
}
```

---

## Step-by-Step Implementation Guide

### Step 1: Thêm Catalog Type Constants
```typescript
// src/common/constants/catalog.ts
export enum CATALOG_TYPE {
  ROLE = 'ROLE',
  DEPARTMENT = 'DEPARTMENT',
  PROPERTY_TYPE = 'PROPERTY_TYPE',
  PROPERTY_STATUS = 'PROPERTY_STATUS',
  LEAD_STATUS = 'LEAD_STATUS',
}

export const CATALOG_CODES = {
  [CATALOG_TYPE.ROLE]: 'ROLE',
  [CATALOG_TYPE.DEPARTMENT]: 'DEPARTMENT',
  [CATALOG_TYPE.PROPERTY_TYPE]: 'PROPERTY_TYPE',
  [CATALOG_TYPE.PROPERTY_STATUS]: 'PROPERTY_STATUS',
  [CATALOG_TYPE.LEAD_STATUS]: 'LEAD_STATUS',
};
```

### Step 2: Cập Nhật Auto-Initialization
```typescript
// src/modules/auth/auth.service.ts

private async initializeWorkspaceCatalogs(workspaceId: string) {
  // EXISTING: Role catalog
  await this.createCatalogWithValues(workspaceId, {
    type: 'ROLE',
    code: 'ROLE',
    name: 'Vai trò',
    values: [
      { value: 'ADMIN', label: 'Quản trị viên', order: 0 },
      // ...
    ]
  });

  // NEW: Add other catalogs
  console.log('📦 Initializing workspace catalogs for:', workspaceId);

  // Department catalog
  await this.createCatalogWithValues(workspaceId, {
    type: 'DEPARTMENT',
    code: 'DEPARTMENT',
    name: 'Phòng Ban',
    values: [
      { value: 'SALES', label: 'Kinh Doanh', order: 1 },
      { value: 'MARKETING', label: 'Marketing', order: 2 },
      { value: 'OPERATIONS', label: 'Vận Hành', order: 3 },
      { value: 'SUPPORT', label: 'Hỗ Trợ', order: 4 },
    ]
  });

  // Property Type catalog
  await this.createCatalogWithValues(workspaceId, {
    type: 'PROPERTY_TYPE',
    code: 'PROPERTY_TYPE',
    name: 'Loại Bất Động Sản',
    values: [
      { value: 'APARTMENT', label: 'Căn Hộ', order: 1 },
      { value: 'HOUSE', label: 'Nhà Riêng', order: 2 },
      // ...
    ]
  });

  // Property Status catalog
  await this.createCatalogWithValues(workspaceId, {
    type: 'PROPERTY_STATUS',
    code: 'PROPERTY_STATUS',
    name: 'Trạng Thái Bất Động Sản',
    values: [
      { value: 'AVAILABLE', label: 'Có Sẵn', order: 1 },
      // ...
    ]
  });

  // Lead Status catalog
  await this.createCatalogWithValues(workspaceId, {
    type: 'LEAD_STATUS',
    code: 'LEAD_STATUS',
    name: 'Trạng Thái Lead',
    values: [
      { value: 'NEW', label: 'Chưa Tiếp Xúc', order: 1 },
      // ...
    ]
  });

  console.log('✅ All workspace catalogs initialized');
}

private async createCatalogWithValues(
  workspaceId: string,
  { type, code, name, values }: {
    type: string;
    code: string;
    name: string;
    values: { value: string; label: string; order: number }[];
  }
) {
  try {
    // Check if catalog already exists
    const existing = await this.prisma.catalog.findFirst({
      where: { workspaceId, code }
    });

    if (existing) {
      console.log(`⏭️  Catalog ${code} already exists, skipping...`);
      return;
    }

    const catalog = await this.prisma.catalog.create({
      data: { workspaceId, type, code, name }
    });

    await this.prisma.catalogValue.createMany({
      data: values.map(v => ({
        catalogId: catalog.id,
        value: v.value,
        label: v.label,
        order: v.order,
      }))
    });

    console.log(`✅ Created catalog: ${code}`);
  } catch (error) {
    console.error(`❌ Error creating catalog ${code}:`, error.message);
    // Don't throw - continue initialization
  }
}
```

### Step 3: Create Catalog API Helper Service
```typescript
// src/modules/catalog/catalog-helper.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogHelperService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogValuesByType(workspaceId: string, type: string) {
    const catalog = await this.prisma.catalog.findFirst({
      where: { workspaceId, type },
      include: { values: { orderBy: { order: 'asc' } } }
    });

    return {
      data: catalog?.values?.map(v => ({
        value: v.value,
        label: v.label,
        order: v.order,
      })) || []
    };
  }

  async getCatalogValueOptions(workspaceId: string, catalogType: string) {
    const result = await this.getCatalogValuesByType(workspaceId, catalogType);
    return result.data.map(v => ({
      value: v.value,
      label: v.label
    }));
  }
}
```

### Step 4: Frontend Utility Hook
```typescript
// apps/web/src/hooks/useCatalogValues.ts
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

export function useCatalogValues(
  workspaceId: string | undefined,
  catalogType: string
) {
  const [values, setValues] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(
          `/workspaces/${workspaceId}/catalogs?type=${catalogType}`
        );
        const catalog = res.data?.data?.[0];
        const catalogValues = catalog?.values?.map((v: any) => ({
          value: v.value,
          label: v.label,
        })) || [];
        setValues(catalogValues);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load catalog'));
        console.error(`Failed to load ${catalogType} catalog:`, err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [workspaceId, catalogType]);

  return { values, loading, error };
}
```

### Step 5: Update Frontend Components
```typescript
// Example: Using in combobox
import { useCatalogValues } from '@/hooks/useCatalogValues';

export function PropertyTypeSelect() {
  const { workspace } = useAuth();
  const { values: propertyTypes } = useCatalogValues(
    workspace?.id,
    'PROPERTY_TYPE'
  );

  return (
    <select>
      <option value="">-- Chọn loại --</option>
      {propertyTypes.map(type => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
  );
}
```

---

## Catalog API Endpoints (Existing)

```
GET    /workspaces/:workspaceId/catalogs
       Parameters: ?type=ROLE&code=ROLE
       Response: { data: [{ id, type, code, name, values: [...] }] }

GET    /workspaces/:workspaceId/catalogs/:id
       Response: { data: { id, type, code, name, values: [...] } }

POST   /workspaces/:workspaceId/catalogs
       Body: { type, code, name }
       Response: { data: { id, type, code, name } }

PATCH  /workspaces/:workspaceId/catalogs/:id
       Body: { name }
       Response: { data: { id, type, code, name, values: [...] } }

DELETE /workspaces/:workspaceId/catalogs/:id
       Response: { code: 'DELETED' }
```

---

## Testing Checklist

### Backend Tests
```bash
# Test catalog creation on workspace init
npm run test src/modules/auth/auth.service.spec.ts

# Test catalog endpoints
npm run test:e2e
```

### Frontend Tests
```bash
# Test hook behavior
// apps/web/src/hooks/__tests__/useCatalogValues.test.ts

it('should load catalog values', async () => {
  // Mock API
  const { result } = renderHook(() => useCatalogValues('workspace-1', 'ROLE'));
  
  // Wait for load
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  
  // Verify
  expect(result.current.values).toHaveLength(6); // 6 role values
});
```

---

## Migration Path for Existing Workspaces

Nếu bạn có existing workspaces từ trước khi implement auto-initialization:

```typescript
// scripts/migrate-catalogs.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingWorkspaces() {
  const workspacesWithoutRoleCatalog = await prisma.workspace.findMany({
    where: {
      members: {
        some: {} // Has members
      }
    },
    select: { id: true }
  });

  console.log(`Found ${workspacesWithoutRoleCatalog.length} workspaces to migrate`);

  for (const workspace of workspacesWithoutRoleCatalog) {
    const hasCatalog = await prisma.catalog.findFirst({
      where: { workspaceId: workspace.id, code: 'ROLE' }
    });

    if (!hasCatalog) {
      // Create catalogs for this workspace
      console.log(`Creating catalogs for workspace ${workspace.id}...`);
      // Call same initialization logic
    }
  }

  console.log('✅ Migration complete!');
}

migrateExistingWorkspaces();
```

---

## Success Metrics

✅ Tất cả combobox load từ API, không hard-code  
✅ Khi tạo workspace mới, tất cả catalogs được tạo tự động  
✅ User có thể edit catalog values từ admin panel  
✅ Frontend hook `useCatalogValues` được reuse ở nhiều nơi  
✅ E2E tests verify workflow: Create workspace → Invite member → Select role from modal  
✅ Existing workspaces được migrate với catalogs bị thiếu  


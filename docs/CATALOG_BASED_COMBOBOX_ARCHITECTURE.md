# Catalog-Based Combobox Architecture

## Nguyên Tắc Thiết Kế

**Tất cả dữ liệu khởi tạo dạng combobox phải:**
1. Được định nghĩa trong **danh mục (Catalog)**
2. Được tạo tự động khi khởi tạo workspace
3. Có thể chỉnh sửa bởi user (dynamic, không hard-code)
4. Được liên kết từ Prisma relations

---

## Danh Sách Catalogs Cần Thiết

### 1. **ROLE Catalog** ✅
**Đã Implement**
- **Mục đích**: Quản lý vai trò người dùng
- **Loại**: `ROLE`
- **Mã**: `ROLE`
- **Giá trị hiện tại**:
  ```
  ADMIN → Quản trị viên
  MANAGER → Quản lý
  SALES → Nhân viên bán hàng
  PARTNER → Đối tác (NEW)
  OWNER → Chủ sở hữu
  VIEWER → Người xem
  ```

### 2. **DEPARTMENT Catalog** (TODO)
**Chưa Implement - Cần Thêm**
- **Mục đích**: Danh sách phòng ban
- **Loại**: `DEPARTMENT`
- **Mã**: `DEPARTMENT`
- **Giá trị mẫu**:
  ```
  SALES → Bộ Phận Kinh Doanh
  MARKETING → Bộ Phận Marketing
  OPERATIONS → Bộ Phận Vận Hành
  SUPPORT → Bộ Phận Hỗ Trợ
  ```

### 3. **PROPERTY_TYPE Catalog** (TODO)
**Chưa Implement - Cần Thêm**
- **Mục đích**: Loại hình property
- **Loại**: `PROPERTY_TYPE`
- **Mã**: `PROPERTY_TYPE`
- **Giá trị mẫu**:
  ```
  APARTMENT → Căn Hộ
  HOUSE → Nhà Riêng
  LAND → Đất Đai
  COMMERCIAL → Thương Mại
  INDUSTRIAL → Công Nghiệp
  ```

### 4. **PROPERTY_STATUS Catalog** (TODO)
**Chưa Implement - Cần Thêm**
- **Mục đích**: Trạng thái property
- **Loại**: `PROPERTY_STATUS`
- **Mã**: `PROPERTY_STATUS`
- **Giá trị mẫu**:
  ```
  AVAILABLE → Có Sẵn
  SOLD → Đã Bán
  RENTED → Đã Cho Thuê
  UNDER_OFFER → Đang Đàm Phán
  ```

### 5. **LEAD_STATUS Catalog** (TODO)
**Chưa Implement - Cần Thêm**
- **Mục đích**: Trạng thái lead
- **Loại**: `LEAD_STATUS`
- **Mã**: `LEAD_STATUS`
- **Giá trị mẫu**:
  ```
  NEW → Chưa Tiếp Xúc
  CONTACTED → Đã Liên Hệ
  QUALIFIED → Đủ Điều Kiện
  NEGOTIATING → Đang Đàm Phán
  CLOSED_WON → Thành Công
  CLOSED_LOST → Mất
  ```

---

## Cách Implement Catalog Mới

### Bước 1: Thêm vào Prisma Schema
```prisma
// schema.prisma - Không cần thay đổi, schema đã generic
model Catalog {
  id          String   @id @default(uuid())
  type        String   // e.g. 'ROLE' | 'DEPARTMENT' | 'PROPERTY_TYPE'
  code        String
  name        String
  workspaceId String
  parentId    String?
  
  // ...relations...
  @@unique([code, workspaceId])
}
```

### Bước 2: Cập nhật Auto-Initialization
```typescript
// auth.service.ts - Cập nhật initializeWorkspaceCatalogs()

private async initializeWorkspaceCatalogs(workspaceId: string) {
  // Existing: Create ROLE catalog
  // ...

  // NEW: Create DEPARTMENT catalog
  await this.createCatalog(workspaceId, {
    type: 'DEPARTMENT',
    code: 'DEPARTMENT',
    name: 'Phòng Ban',
    values: [
      { value: 'SALES', label: 'Bộ Phận Kinh Doanh', order: 0 },
      { value: 'MARKETING', label: 'Bộ Phận Marketing', order: 1 },
      { value: 'OPERATIONS', label: 'Bộ Phận Vận Hành', order: 2 },
    ]
  });

  // NEW: Create PROPERTY_TYPE catalog
  await this.createCatalog(workspaceId, {
    type: 'PROPERTY_TYPE',
    code: 'PROPERTY_TYPE',
    name: 'Loại Hình Bất Động Sản',
    values: [
      { value: 'APARTMENT', label: 'Căn Hộ', order: 0 },
      { value: 'HOUSE', label: 'Nhà Riêng', order: 1 },
      // ...
    ]
  });
}

private async createCatalog(
  workspaceId: string,
  { type, code, name, values }: CatalogTemplate
) {
  try {
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
  } catch (error) {
    // Catalog already exists - skip
    if (!error.message.includes('Unique constraint')) {
      throw error;
    }
  }
}
```

### Bước 3: Frontend - Tải từ API
```typescript
// component/combobox.tsx
const loadDepartmentOptions = async (workspaceId: string) => {
  // Instead of hardcoded:
  // const options = ['SALES', 'MARKETING', ...];

  // Load from API:
  const res = await apiClient.get(
    `/workspaces/${workspaceId}/catalogs?type=DEPARTMENT`
  );
  
  const catalog = res.data?.data?.[0];
  return catalog?.values?.map(v => ({
    value: v.value,
    label: v.label
  })) || [];
};
```

---

## Database Schema Pattern

```sql
-- Catalogs: Định nghĩa danh mục
INSERT INTO catalogs (id, workspaceId, type, code, name, createdAt, updatedAt)
VALUES (uuid(), 'workspace-1', 'ROLE', 'ROLE', 'Vai trò', NOW(), NOW());

-- Catalog Values: Giá trị cụ thể
INSERT INTO catalog_values (id, catalogId, value, label, "order", createdAt, updatedAt)
VALUES 
  (uuid(), '{catalog-id}', 'ADMIN', 'Quản trị viên', 0, NOW(), NOW()),
  (uuid(), '{catalog-id}', 'MANAGER', 'Quản lý', 1, NOW(), NOW());

-- Linking: Liên kết đến entities
-- Ví dụ: workspace_members sử dụng role từ role catalog
SELECT r.* FROM roles r
  JOIN catalog_values cv ON r.code = cv.value
  JOIN catalogs c ON cv.catalogId = c.id
  WHERE c.type = 'ROLE' AND c.workspaceId = 'workspace-1';
```

---

## API Endpoints Hỗ Trợ Catalogs

Hiện tại có:
```
GET    /workspaces/:workspaceId/catalogs              → List all catalogs
GET    /workspaces/:workspaceId/catalogs/:id          → Get single catalog
POST   /workspaces/:workspaceId/catalogs              → Create new catalog
PATCH  /workspaces/:workspaceId/catalogs/:id          → Update catalog
DELETE /workspaces/:workspaceId/catalogs/:id          → Delete catalog
```

**Cần thêm để hỗ trợ better filtering:**
```
GET    /workspaces/:workspaceId/catalogs?type=ROLE   → Get by type
GET    /workspaces/:workspaceId/catalogs/ROLE/values → Get values only
```

---

## Checklist Triển Khai

Khi thêm *combobox mới*:

- [ ] Xác định kiểu dữ liệu (ROLE, DEPARTMENT, etc.)
- [ ] Thêm catalog template vào `initializeWorkspaceCatalogs()`
- [ ] Viết API endpoint để lấy dữ liệu catalog
- [ ] Cập nhật frontend component để gọi API
- [ ] Thêm integration test
- [ ] Viết migration script nếu cần update existing workspaces
- [ ] Update documentation

---

## Constants để Tránh Magic Strings

```typescript
// constants/catalogs.ts
export enum CATALOG_TYPE {
  ROLE = 'ROLE',
  DEPARTMENT = 'DEPARTMENT',
  PROPERTY_TYPE = 'PROPERTY_TYPE',
  PROPERTY_STATUS = 'PROPERTY_STATUS',
  LEAD_STATUS = 'LEAD_STATUS',
}

export const CATALOG_TEMPLATES = {
  [CATALOG_TYPE.ROLE]: {
    code: 'ROLE',
    name: 'Vai trò',
    values: [
      { value: 'ADMIN', label: 'Quản trị viên', order: 0 },
      // ...
    ]
  },
  [CATALOG_TYPE.DEPARTMENT]: {
    code: 'DEPARTMENT',
    name: 'Phòng Ban',
    values: [
      // ...
    ]
  },
  // ...
};

// usage
const catalog = await catalogService.getByType(
  workspaceId, 
  CATALOG_TYPE.ROLE
);
```

---

## Lợi Ích Của Cách Tiếp Cận Này

✅ **Centralized Data Management** - Tất cả options được quản lý ở một chỗ  
✅ **Dynamic & Flexible** - User có thể thay đổi options mà không cần code change  
✅ **Scalable** - Dễ thêm catalogs mới  
✅ **Type-Safe** - Dùng TypeScript enums  
✅ **Consistency** - Cùng data structure cho tất cả comboboxes  
✅ **Audit Trail** - Có thể track khi nào option bị thay đổi  
✅ **Multi-Workspace** - Mỗi workspace có options riêng  


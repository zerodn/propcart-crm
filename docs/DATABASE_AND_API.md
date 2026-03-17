# PropCart CRM — Database Schema & API Reference

## Database ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    User {
        uuid id PK
        string phone UK
        string email
        string fullName
        string addressLine
        string provinceCode
        string provinceName
        string wardCode
        string wardName
        datetime emailVerifiedAt
        string emailVerifyToken UK
        string googleId UK
        string passwordHash
        int status
        string avatarUrl
        string gender
        datetime dateOfBirth
        datetime createdAt
        datetime updatedAt
    }

    Workspace {
        uuid id PK
        string type
        string name
        uuid ownerUserId FK
        int status
        datetime createdAt
    }

    WorkspaceMember {
        uuid id PK
        uuid workspaceId FK
        uuid userId FK
        uuid roleId FK
        int status
        datetime joinedAt
        string displayName
        string workspaceEmail
        string workspacePhone
        string avatarUrl
        string gender
        datetime dateOfBirth
        string workspaceCity
        string workspaceAddress
        string attachmentUrl
    }

    Role {
        uuid id PK
        string code UK
        string name
        string description
        datetime createdAt
    }

    Permission {
        uuid id PK
        string code UK
        string name
        string module
        datetime createdAt
    }

    RolePermission {
        uuid id PK
        uuid roleId FK
        uuid permissionId FK
    }

    UserDevice {
        uuid id PK
        uuid userId FK
        string deviceHash
        string platform
        datetime lastActive
        datetime createdAt
    }

    RefreshToken {
        uuid id PK
        uuid userId FK
        uuid deviceId FK
        uuid workspaceId
        string tokenHash UK
        datetime expiresAt
        bool revoked
        datetime createdAt
    }

    WorkspaceInvitation {
        uuid id PK
        uuid workspaceId FK
        uuid invitedByUserId FK
        string invitedPhone
        uuid invitedUserId FK
        uuid roleId FK
        string token UK
        int status
        string declineReason
        datetime expiresAt
        datetime respondedAt
        datetime createdAt
    }

    Catalog {
        uuid id PK
        string type
        string code
        string name
        uuid workspaceId
        uuid parentId FK
        datetime createdAt
        datetime updatedAt
    }

    CatalogValue {
        uuid id PK
        uuid catalogId FK
        string value
        string label
        string color
        int order
        datetime createdAt
        datetime updatedAt
    }

    Department {
        uuid id PK
        uuid workspaceId
        string code
        string name
        string description
        datetime createdAt
        datetime updatedAt
    }

    DepartmentMember {
        uuid id PK
        uuid departmentId FK
        uuid userId FK
        uuid roleId FK
    }

    Notification {
        uuid id PK
        uuid userId FK
        string type
        string payload
        bool read
        datetime createdAt
    }

    UserDocument {
        uuid id PK
        uuid userId FK
        uuid workspaceId FK
        enum documentType
        string fileName
        string fileType
        int fileSize
        string objectKey UK
        string fileUrl
        datetime createdAt
    }

    PropertyWarehouse {
        uuid id PK
        uuid workspaceId FK
        string name
        string code
        string type
        string description
        int status
        decimal latitude
        decimal longitude
        string provinceCode
        string provinceName
        string wardCode
        string wardName
        string fullAddress
        uuid createdByUserId FK
        datetime createdAt
        datetime updatedAt
    }

    PropertyProduct {
        uuid id PK
        uuid workspaceId FK
        uuid warehouseId FK
        string name
        string unitCode
        json tags
        string propertyType
        string zone
        string block
        string direction
        decimal area
        decimal priceWithoutVat
        decimal priceWithVat
        bool isContactForPrice
        bool isHidden
        string promotionProgram
        json policyImageUrls
        json productDocuments
        string callPhone
        string zaloPhone
        json contactMemberIds
        json contacts
        string transactionStatus
        string note
        uuid createdByUserId FK
        datetime createdAt
        datetime updatedAt
    }

    Project {
        uuid id PK
        uuid workspaceId FK
        string name
        string projectType
        uuid ownerId
        string displayStatus
        string saleStatus
        string bannerUrl
        json bannerUrls
        text overviewHtml
        string address
        string province
        string district
        string ward
        string latitude
        string longitude
        string googleMapUrl
        text locationDescriptionHtml
        string videoUrl
        string videoDescription
        json contacts
        json planningStats
        json progressUpdates
        json documentItems
        json subdivisions
        json zoneImages
        json productImages
        json amenityImages
        uuid createdByUserId FK
        datetime createdAt
        datetime updatedAt
    }

    %% Relations
    User ||--o{ Workspace : "owns"
    User ||--o{ WorkspaceMember : "member of"
    User ||--o{ UserDevice : "has"
    User ||--o{ RefreshToken : "has"
    User ||--o{ WorkspaceInvitation : "invited by"
    User ||--o{ WorkspaceInvitation : "invited user"
    User ||--o{ Notification : "receives"
    User ||--o{ DepartmentMember : "member of"
    User ||--o{ UserDocument : "has"
    User ||--o{ PropertyWarehouse : "created"
    User ||--o{ PropertyProduct : "created"
    User ||--o{ Project : "created"

    Workspace ||--o{ WorkspaceMember : "has"
    Workspace ||--o{ WorkspaceInvitation : "has"
    Workspace ||--o{ UserDocument : "has"
    Workspace ||--o{ PropertyWarehouse : "has"
    Workspace ||--o{ PropertyProduct : "has"
    Workspace ||--o{ Project : "has"

    Role ||--o{ WorkspaceMember : "assigned to"
    Role ||--o{ RolePermission : "has"
    Role ||--o{ WorkspaceInvitation : "assigned in"
    Role ||--o{ DepartmentMember : "assigned to"

    Permission ||--o{ RolePermission : "included in"

    UserDevice ||--o{ RefreshToken : "has"

    Catalog ||--o{ CatalogValue : "has values"
    Catalog ||--o{ Catalog : "parent of"

    Department ||--o{ DepartmentMember : "has"

    PropertyWarehouse ||--o{ PropertyProduct : "contains"
```

---

## API Reference

### 🔐 Auth — `/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/phone/send-otp` | Gửi OTP đến số điện thoại |
| POST | `/auth/phone/verify-otp` | Xác thực OTP, trả về JWT |
| POST | `/auth/google` | Đăng nhập bằng Google OAuth |
| POST | `/auth/refresh` | Làm mới access token |
| POST | `/auth/switch-workspace` | Chuyển workspace đang dùng |
| GET  | `/auth/workspaces` | Lấy danh sách workspaces của user |
| POST | `/auth/logout` | Đăng xuất, revoke refresh token |
| GET  | `/auth/email/verify` | Xác thực email qua token |

---

### 👤 User / Profile — `/me`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/me/profile` | Lấy thông tin profile |
| PATCH  | `/me/profile` | Cập nhật profile |
| POST   | `/me/profile/email/send-verification` | Gửi email xác thực |
| POST   | `/me/profile/upload-avatar` | Upload ảnh đại diện |
| GET    | `/me/profile/documents` | Danh sách tài liệu cá nhân |
| POST   | `/me/profile/documents` | Upload tài liệu cá nhân |
| GET    | `/me/profile/documents/:documentId/download` | Download tài liệu |
| PATCH  | `/me/profile/documents/:documentId/type` | Cập nhật loại tài liệu |
| DELETE | `/me/profile/documents/:documentId` | Xóa tài liệu |

---

### 🏢 Workspace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/me/invitations` | Danh sách lời mời của user |
| POST   | `/invitations/:token/accept` | Chấp nhận lời mời |
| POST   | `/invitations/:token/decline` | Từ chối lời mời |
| POST   | `/workspaces/:workspaceId/invitations` | Tạo lời mời thành viên |
| GET    | `/workspaces/:workspaceId/invitations` | Danh sách lời mời |
| GET    | `/workspaces/:workspaceId/invitations/declined` | Lời mời đã từ chối |
| DELETE | `/workspaces/:workspaceId/invitations/:invitationId` | Hủy lời mời |
| GET    | `/workspaces/:workspaceId/members` | Danh sách thành viên |
| PATCH  | `/workspaces/:workspaceId/members/:memberId` | Cập nhật thành viên |
| POST   | `/workspaces/:workspaceId/members/:memberId/upload-avatar` | Upload avatar thành viên |

---

### 📋 Catalog — `/workspaces/:workspaceId/catalogs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/workspaces/:workspaceId/catalogs` | Tạo danh mục |
| GET    | `/workspaces/:workspaceId/catalogs` | Danh sách danh mục |
| GET    | `/workspaces/:workspaceId/catalogs/:id` | Chi tiết danh mục |
| PATCH  | `/workspaces/:workspaceId/catalogs/:id` | Cập nhật danh mục |
| DELETE | `/workspaces/:workspaceId/catalogs/:id` | Xóa danh mục |

---

### 🏛 Department — `/workspaces/:workspaceId/departments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/workspaces/:workspaceId/departments` | Tạo phòng ban |
| GET    | `/workspaces/:workspaceId/departments` | Danh sách phòng ban |
| GET    | `/workspaces/:workspaceId/departments/member-options` | Danh sách nhân sự có thể thêm |
| GET    | `/workspaces/:workspaceId/departments/role-options` | Danh sách vai trò |
| GET    | `/workspaces/:workspaceId/departments/member-search` | Tìm kiếm nhân sự |
| PATCH  | `/workspaces/:workspaceId/departments/:id` | Cập nhật phòng ban |
| DELETE | `/workspaces/:workspaceId/departments/:id` | Xóa phòng ban |
| POST   | `/workspaces/:workspaceId/departments/:departmentId/members` | Thêm nhân sự vào phòng |
| PATCH  | `/workspaces/:workspaceId/departments/:departmentId/members/:userId/role` | Cập nhật vai trò nhân sự |
| DELETE | `/workspaces/:workspaceId/departments/:departmentId/members/:userId` | Xóa nhân sự khỏi phòng |

---

### 🔔 Notification — `/me/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/me/notifications` | Danh sách thông báo |
| GET    | `/me/notifications/count` | Số thông báo chưa đọc |
| PATCH  | `/me/notifications/:id/read` | Đánh dấu đã đọc |
| GET    | `/me/notifications/stream` | SSE stream thông báo real-time |

---

### 🔑 Permission — `/workspaces/:workspaceId/permissions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/workspaces/:workspaceId/permissions` | Danh sách permissions |
| POST   | `/workspaces/:workspaceId/permissions` | Tạo permission |
| POST   | `/workspaces/:workspaceId/permissions/roles/:roleId` | Gán permission cho role |
| DELETE | `/workspaces/:workspaceId/permissions/roles/:roleId/:permissionId` | Xóa permission khỏi role |

---

### 🏷 Role — `/workspaces/:workspaceId/roles`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/workspaces/:workspaceId/roles` | Tạo role |
| GET    | `/workspaces/:workspaceId/roles` | Danh sách roles |
| PATCH  | `/workspaces/:workspaceId/roles/:id` | Cập nhật role |
| DELETE | `/workspaces/:workspaceId/roles/:id` | Xóa role |

---

### 🏗 Warehouse — `/workspaces/:workspaceId/warehouses`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/workspaces/:workspaceId/warehouses` | Tạo kho hàng |
| GET    | `/workspaces/:workspaceId/warehouses` | Danh sách kho hàng |
| GET    | `/workspaces/:workspaceId/warehouses/:id` | Chi tiết kho hàng |
| PATCH  | `/workspaces/:workspaceId/warehouses/:id` | Cập nhật kho hàng |
| DELETE | `/workspaces/:workspaceId/warehouses/:id` | Xóa kho hàng |

---

### 📦 Product — `/workspaces/:workspaceId/products`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/workspaces/:workspaceId/products` | Tạo sản phẩm |
| GET    | `/workspaces/:workspaceId/products` | Danh sách sản phẩm |
| GET    | `/workspaces/:workspaceId/products/:id` | Chi tiết sản phẩm |
| PATCH  | `/workspaces/:workspaceId/products/:id` | Cập nhật sản phẩm |
| DELETE | `/workspaces/:workspaceId/products/:id` | Xóa sản phẩm |
| POST   | `/workspaces/:workspaceId/products/upload-files` | Upload file sản phẩm |

---

### 🏙 Project — `/workspaces/:workspaceId/projects`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/workspaces/:workspaceId/projects` | Tạo dự án |
| GET    | `/workspaces/:workspaceId/projects` | Danh sách dự án |
| GET    | `/workspaces/:workspaceId/projects/:id` | Chi tiết dự án |
| PATCH  | `/workspaces/:workspaceId/projects/:id` | Cập nhật dự án |
| DELETE | `/workspaces/:workspaceId/projects/:id` | Xóa dự án |
| POST   | `/workspaces/:workspaceId/projects/upload-image` | Upload hình ảnh dự án |

---

### 📁 Upload — `/upload`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/upload/temp` | Upload file tạm thời (TTL 24h) |

---

### 🌐 Portal (Public API) — `/portal`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/portal/:workspaceId/projects` | Danh sách dự án công khai |
| GET    | `/portal/:workspaceId/projects/:id` | Chi tiết dự án công khai |
| GET    | `/portal/:workspaceId/project-types` | Loại dự án |
| GET    | `/portal/:workspaceId/provinces` | Danh sách tỉnh/thành |
| GET    | `/portal/:workspaceId/catalog-options` | Tùy chọn danh mục |
| GET    | `/portal/:workspaceId/products/:id` | Chi tiết sản phẩm công khai |
| POST   | `/portal/:workspaceId/products/:id/booking-request` | Gửi yêu cầu đặt cọc |

---

## Summary

| Module | Tables | APIs |
|--------|--------|------|
| Auth | - | 8 |
| User/Profile | users, user_documents, user_devices, refresh_tokens | 9 |
| Workspace | workspaces, workspace_members, workspace_invitations | 10 |
| Catalog | catalogs, catalog_values | 5 |
| Department | departments, department_members | 10 |
| Notification | notifications | 4 |
| Permission | permissions, role_permissions | 4 |
| Role | roles | 4 |
| Warehouse | property_warehouses | 5 |
| Product | property_products | 6 |
| Project | projects | 6 |
| Upload | - | 1 |
| Portal | - | 7 |
| **Total** | **16 tables** | **79 APIs** |

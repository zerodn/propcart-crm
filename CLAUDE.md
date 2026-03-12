# PropCart CRM — Claude Code Guide

## Project

SaaS bất động sản | 100k+ users | Multi-tenant workspace-based architecture

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Backend      | NestJS (TypeScript) + Prisma ORM    |
| Database     | PostgreSQL 15+                      |
| Cache        | Redis                               |
| Auth         | JWT (access 15min / refresh 7 days) |
| File Storage | MinIO (self-hosted S3-compatible)   |
| Web          | Next.js (Admin / Manager)           |
| Mobile       | Flutter (Sales / Partner)           |
| Test         | Jest + Supertest                    |
| Container    | Docker                              |
| CI/CD        | GitHub Actions                      |

---

## System Architecture — Microservice Design

Hệ thống tổ chức theo **microservice**. Mỗi service được deploy độc lập.

```
                          ┌─────────────────────┐
 Client (Web/Mobile) ───► │   API Gateway        │
                          │  (NestJS Gateway)    │
                          └──────────┬──────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
   ┌──────▼──────┐           ┌───────▼──────┐         ┌────────▼──────┐
   │ Auth Service │           │ Core Service │         │ Upload Service │
   │  (NestJS)   │           │  (NestJS)    │         │   (NestJS)     │
   │             │           │              │         │                │
   │ auth/       │           │ workspace/   │         │ /upload        │
   │ user/       │           │ lead/        │         │ → MinIO        │
   └─────────────┘           │ property/    │         └────────────────┘
                             └──────────────┘
```

### Service Split Rules

| Service            | Trách nhiệm                    | Lý do tách                                                       |
| ------------------ | ------------------------------ | ---------------------------------------------------------------- |
| **auth-service**   | Login, JWT, user, device       | Foundation, high security                                        |
| **core-service**   | Workspace, Lead, Property, CRM | Business logic chính                                             |
| **upload-service** | File upload → MinIO            | Upload gây tốn tài nguyên I/O, tách để không ảnh hưởng API chính |

### Communication giữa services

- **Sync (HTTP):** API Gateway → Service (via REST/gRPC)
- **Async (Event):** Service → Service (via Redis Pub/Sub hoặc Message Queue)
- Upload xong → emit event `file.uploaded` → core-service xử lý link

---

## File Upload — MinIO

Tất cả file upload đều đi qua MinIO với **Workspace-Scoped storage** + **Functional grouping**.

### MinIO Bucket Structure (Workspace-Scoped)

```
propcart-crm/
├── {workspace_id}/
│   ├── documents/
│   │   ├── profile/{userId}/{date}/{uuid}.{ext}      ← User profile documents
│   │   └── members/{date}/{uuid}.{ext}               ← Member workspace documents
│   ├── avatars/{userId}/{date}/{uuid}.{ext}          ← User avatars (workspace-scoped)
│   ├── properties/{date}/{uuid}.{ext}                ← Property images
│   └── temp/{uuid}.{ext}                             ← Temporary files (TTL 24h)
└── documents/users/{userId}/{date}/{uuid}.{ext}      ← Legacy format (backward compat)
```

### Functional Groups

| Folder                | Purpose               | Scope            | URL Pattern                                                     |
| --------------------- | --------------------- | ---------------- | --------------------------------------------------------------- |
| **documents/profile** | User profile docs     | User + Workspace | `{workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}` |
| **documents/members** | Member workspace docs | Workspace        | `{workspace_id}/documents/members/{date}/{uuid}.{ext}`          |
| **avatars**           | User avatars          | User + Workspace | `{workspace_id}/avatars/{userId}/{date}/{uuid}.{ext}`           |
| **properties**        | Property images       | Workspace        | `{workspace_id}/properties/{date}/{uuid}.{ext}`                 |
| **temp**              | Temporary files (TTL) | Workspace        | `{workspace_id}/temp/{uuid}.{ext}`                              |

### Upload Methods

**User Profile Document:**

```typescript
uploadUserDocument(userId: string, file: UploadFile, workspaceId?: string)
// Production: {workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}
// Legacy: documents/users/{userId}/{date}/{uuid}.{ext}
```

**Member Workspace Document:**

```typescript
uploadMemberDocument(workspaceId: string, file: UploadFile)
// Path: {workspace_id}/documents/members/{date}/{uuid}.{ext}
```

**Avatar:**

```typescript
uploadAvatar(workspaceId: string, userId: string, file: UploadFile)
// Path: {workspace_id}/avatars/{userId}/{date}/{uuid}.{ext}
```

**Property Image:**

```typescript
uploadPropertyImage(workspaceId: string, file: UploadFile)
// Path: {workspace_id}/properties/{date}/{uuid}.{ext}
```

**Temporary File:**

```typescript
uploadTemporaryFile(workspaceId: string, file: UploadFile)
// Path: {workspace_id}/temp/{uuid}.{ext}
```

### Benefits

- ✅ **Workspace Isolation**: Mỗi workspace hoàn toàn tách biệt trên MinIO
- ✅ **Functional Organization**: Files sắp xếp theo chức năng (profile, avatars, properties, etc)
- ✅ **Easy Cleanup**: Xoá cả workspace → xoá `{workspace_id}/` folder
- ✅ **Backward Compatible**: Legacy path vẫn hoạt động cho lên cũ
- ✅ **Multi-Tenant Safe**: Không bao giờ query cross-workspace

### API Integration

**User Service** - Profile Documents:

```
POST /me/profile/documents
  → minioService.uploadUserDocument(userId, file, workspaceId)
  → storage: {workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}
```

**Workspace Service** - Member Documents:

```
POST /workspaces/{workspaceId}/members/{memberId}/documents?
  → minioService.uploadMemberDocument(workspaceId, file)
  → storage: {workspace_id}/documents/members/{date}/{uuid}.{ext}
```

### File URL Pattern

```
https://minio.propcart.vn/propcart-crm/{workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}
https://minio.propcart.vn/propcart-crm/{workspace_id}/avatars/{userId}/{date}/{uuid}.{ext}
https://minio.propcart.vn/propcart-crm/{workspace_id}/properties/{date}/{uuid}.{ext}
```

### Env MinIO

```env
MINIO_ENDPOINT=minio.propcart.vn
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=true
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=https://minio.propcart.vn
```

---

## Frontend Quality Standards

Áp dụng cho **tất cả trang** trong Next.js Web App. Đo bằng Lighthouse CI trong pipeline.

### Lighthouse Targets

| Metric         | Target |
| -------------- | ------ |
| Performance    | ≥ 95   |
| Accessibility  | ≥ 90   |
| Best Practices | ≥ 90   |
| SEO            | ≥ 95   |

### Cross-Browser & Responsive Support

Phải hoạt động đúng trên:

| Browser                 | Phiên bản         |
| ----------------------- | ----------------- |
| Chrome                  | Latest 2 versions |
| Firefox                 | Latest 2 versions |
| Safari                  | Latest 2 versions |
| Edge                    | Latest 2 versions |
| Chrome Mobile (Android) | Latest            |
| Safari Mobile (iOS)     | Latest            |

Breakpoints (Tailwind convention):

| Breakpoint | Width          |
| ---------- | -------------- |
| Mobile     | 320px – 767px  |
| Tablet     | 768px – 1023px |
| Desktop    | 1024px+        |

### UI/UX Rules

- Mọi action async phải có loading state
- Mọi form phải có error state rõ ràng (inline validation)
- Mọi trang phải có skeleton loading (không dùng spinner toàn trang)
- Accessibility: `aria-label` trên mọi icon button, contrast ratio ≥ 4.5:1
- Images: dùng `next/image` với `sizes` + `priority` đúng context
- Fonts: `next/font` để tránh layout shift (CLS = 0)
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Project Structure

```
src/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      dto/
      guards/
      strategies/
    workspace/
    user/
    <other-modules>/
  common/
    decorators/
    guards/
    interceptors/
    filters/
    pipes/
  config/
prisma/
  schema.prisma
  migrations/
test/
  e2e/
```

---

## Naming Conventions

| Target              | Convention           | Example                  |
| ------------------- | -------------------- | ------------------------ |
| Files               | kebab-case           | `auth.service.ts`        |
| Classes             | PascalCase           | `AuthService`            |
| Methods / Variables | camelCase            | `switchWorkspace()`      |
| DB table names      | snake_case           | `workspace_members`      |
| DB column names     | snake_case           | `workspace_id`           |
| Prisma models       | PascalCase           | `WorkspaceMember`        |
| API routes          | kebab-case           | `/auth/switch-workspace` |
| Env variables       | UPPER_SNAKE_CASE     | `JWT_ACCESS_SECRET`      |
| Permission codes    | SCREAMING_SNAKE_CASE | `LEAD_CREATE`            |

---

## API Response Format

```json
// Success
{ "data": { ... }, "meta": { ... } }

// Success (list)
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }

// Error
{ "code": "ERROR_CODE", "message": "Mô tả lỗi", "statusCode": 400 }
```

---

## NestJS Key Patterns

### Guards (apply in order)

1. `JwtAuthGuard` — validates JWT, injects `req.user`
2. `WorkspaceGuard` — validates workspace membership active
3. `PermissionGuard` — validates RBAC role permission

### req.user shape (after JwtAuthGuard)

```typescript
{
  userId: string;
  workspaceId: string;
  role: string; // e.g. 'OWNER' | 'ADMIN' | 'SALES'
  workspaceType: string; // 'PERSONAL' | 'COMPANY'
  deviceId: string;
}
```

### DTO Validation

Luôn dùng `class-validator` + `class-transformer` cho mọi request body.

---

## Database Rules

- UUID primary key: `@id @default(uuid())`
- **Tất cả business tables PHẢI có `workspaceId`**
- Index bắt buộc: `@@index([workspaceId])` và `@@index([workspaceId, id])`
- Query luôn bắt đầu bằng `WHERE workspace_id = ?`
- Không bao giờ query cross-tenant

---

## Security Rules

- Mọi request authed phải qua: JWT valid → Workspace active → Role permission
- External client phải gửi: `x-timestamp` + `x-signature` (HMAC-SHA256)
- Reject nếu timestamp lệch > 60 giây
- Rate limit: Login 5 req/min/IP | API 120 req/min/user
- Device binding: token linked to `device_hash`

---

## Implemented Business Scope (Updated 2026-03-04)

### 1) Invitation Management (Implemented)

#### Business Rules

- Lời mời workspace hỗ trợ đầy đủ trạng thái: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `CANCELLED`
- User có thể **accept** hoặc **decline** lời mời
- Khi decline, user có thể nhập `reason` và được lưu vào `declineReason`
- Danh sách lời mời hiển thị đầy đủ lịch sử phản hồi (bao gồm lý do từ chối)

#### APIs

- `POST /workspaces/:workspaceId/invitations` (body: `phone`, `role_code`)
- `GET /me/invitations`
- `POST /invitations/:token/accept`
- `POST /invitations/:token/decline`
- `DELETE /workspaces/:workspaceId/invitations/:invitationId`

#### Permissions

- `WORKSPACE_MEMBER_INVITE`

### 2) Catalog & Role Source (Implemented)

#### Business Rules

- Danh mục hỗ trợ cấu trúc cha-con qua `parentId`
- Danh mục hỗ trợ danh sách `values[]` (value/label/order)
- Catalog `Vai trò` được tự khởi tạo theo workspace
- Chức năng mời thành viên lấy vai trò từ catalog `Vai trò` (không hard-code)

#### Default Role Catalog Values

- `ADMIN` — Quản trị viên
- `SALES` — Nhân viên bán hàng
- `MANAGER` — Quản lý
- `OWNER` — Chủ sở hữu
- `VIEWER` — Người xem

#### APIs

- `POST /workspaces/:workspaceId/catalogs`
- `GET /workspaces/:workspaceId/catalogs`
- `GET /workspaces/:workspaceId/catalogs/:id`
- `PATCH /workspaces/:workspaceId/catalogs/:id`
- `DELETE /workspaces/:workspaceId/catalogs/:id`
- `GET /workspaces/:workspaceId/roles` (data source từ catalog `ROLE`)

#### Permissions

- `CATALOG_CREATE`
- `CATALOG_UPDATE`
- `CATALOG_DELETE`

### 3) Department Management (Implemented)

#### Business Fields

- `name` — Tên phòng ban
- `code` — Mã phòng ban
- `memberCount` — Số lượng nhân sự trong phòng
- `members[]` — Danh sách nhân sự thuộc phòng, có role gán theo từng người

#### Department UI/UX (Web)

- Trang `/department` hiển thị danh sách phòng ban dạng **grid card**
- Mỗi card hiển thị: Tên phòng, Mã phòng, Số lượng nhân sự
- Action chính trên card: `Quản lý nhân sự & gán quyền`, `Sửa`, `Xóa`
- Modal quản lý nhân sự cho phép:
  - Thêm nhân sự vào phòng (`user + role`)
  - Xóa nhân sự khỏi phòng
  - Cập nhật role (gán quyền) cho từng nhân sự trong phòng

#### Department APIs

- `POST /workspaces/:workspaceId/departments`
- `GET /workspaces/:workspaceId/departments`
- `PATCH /workspaces/:workspaceId/departments/:id`
- `DELETE /workspaces/:workspaceId/departments/:id`
- `GET /workspaces/:workspaceId/departments/member-options`
- `GET /workspaces/:workspaceId/departments/role-options`
- `POST /workspaces/:workspaceId/departments/:departmentId/members`
- `PATCH /workspaces/:workspaceId/departments/:departmentId/members/:userId/role`
- `DELETE /workspaces/:workspaceId/departments/:departmentId/members/:userId`

#### Permissions

- `DEPARTMENT_CREATE`
- `DEPARTMENT_UPDATE`
- `DEPARTMENT_DELETE`

### 4) Frontend Interaction Standards (Applied)

- Không dùng browser system confirm (`window.confirm`) cho nghiệp vụ chính
- Dùng dialog đặc thù (`ConfirmDialog`, `CatalogValuesDialog`, `DepartmentMembersDialog`)
- Mọi action async có loading state + toast feedback rõ ràng

### 5) Authorization Notes

- Guard chain: `JwtAuthGuard` → `WorkspaceGuard` → `PermissionGuard`
- `OWNER` có full-access fallback trong guard để tránh lock do seed dữ liệu cũ

---

## How to Read MVP Docs

- Location: [docs/mvp/](docs/mvp/)
- Naming: `mvp-XX-<feature-name>.md`
- Template: [docs/mvp/\_TEMPLATE.md](docs/mvp/_TEMPLATE.md)
- **Implement theo thứ tự**: MVP-01 → MVP-02 → MVP-03 → ...
- Mỗi MVP định nghĩa: Database Schema → Prisma Schema → APIs → Business Flows → NestJS Structure → Tests

---

## Implementation Checklist Per MVP

1. Đọc toàn bộ MVP doc trước khi viết code
2. Thêm Prisma models vào `prisma/schema.prisma`
3. Chạy `npx prisma migrate dev --name <migration-name>`
4. Tạo NestJS module theo cấu trúc trong MVP doc
5. Implement theo thứ tự: service → repository → controller → guards
6. Register module trong `AppModule`
7. Viết unit tests (Jest)
8. Viết e2e tests (Supertest)
9. Chạy `npm run test` và `npm run test:e2e` — phải xanh hết

---

## Environment Variables Pattern

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Redis
REDIS_URL=redis://...

# API Security
API_CLIENT_SECRET=

# OAuth
GOOGLE_CLIENT_ID=

# MinIO (upload-service)
MINIO_ENDPOINT=minio.propcart.vn
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=true
```

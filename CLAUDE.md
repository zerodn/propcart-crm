# PropCart CRM — Claude Code Guide

## Project
SaaS bất động sản | 100k+ users | Multi-tenant workspace-based architecture

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS (TypeScript) + Prisma ORM |
| Database | PostgreSQL 15+ |
| Cache | Redis |
| Auth | JWT (access 15min / refresh 7 days) |
| Web | Next.js (Admin / Manager) |
| Mobile | Flutter (Sales / Partner) |
| Test | Jest + Supertest |
| Container | Docker |
| CI/CD | GitHub Actions |

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

| Target | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `auth.service.ts` |
| Classes | PascalCase | `AuthService` |
| Methods / Variables | camelCase | `switchWorkspace()` |
| DB table names | snake_case | `workspace_members` |
| DB column names | snake_case | `workspace_id` |
| Prisma models | PascalCase | `WorkspaceMember` |
| API routes | kebab-case | `/auth/switch-workspace` |
| Env variables | UPPER_SNAKE_CASE | `JWT_ACCESS_SECRET` |
| Permission codes | SCREAMING_SNAKE_CASE | `LEAD_CREATE` |

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
  role: string;           // e.g. 'OWNER' | 'ADMIN' | 'SALES'
  workspaceType: string;  // 'PERSONAL' | 'COMPANY'
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

## How to Read MVP Docs

- Location: [docs/mvp/](docs/mvp/)
- Naming: `mvp-XX-<feature-name>.md`
- Template: [docs/mvp/_TEMPLATE.md](docs/mvp/_TEMPLATE.md)
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
```

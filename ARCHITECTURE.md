# PropCart CRM — System Architecture

> **Audience:** AI assistants (Codepilot, Claude Code, etc.) and new developers.
> **Purpose:** Single source of truth for the current architecture, including all optimizations applied from v1.0 baseline.
> **Last updated:** 2026-03-15

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Backend Modules](#4-backend-modules)
5. [Database Schema](#5-database-schema)
6. [Authentication & Security](#6-authentication--security)
7. [Caching Architecture](#7-caching-architecture)
8. [Background Jobs (BullMQ)](#8-background-jobs-bullmq)
9. [File Storage (MinIO)](#9-file-storage-minio)
10. [Search (Elasticsearch)](#10-search-elasticsearch)
11. [Portal Public API](#11-portal-public-api)
12. [Frontend Apps](#12-frontend-apps)
13. [API Conventions](#13-api-conventions)
14. [Optimization Changes (v1.1)](#14-optimization-changes-v11)
15. [Known Patterns & Pitfalls](#15-known-patterns--pitfalls)
16. [Environment Variables](#16-environment-variables)
17. [Development Commands](#17-development-commands)

---

## 1. System Overview

**PropCart CRM** is a B2B SaaS real estate platform serving 100k+ users. The system is multi-tenant — every piece of business data is scoped to a **workspace**.

```
                         ┌──────────────────────┐
  Client                 │   NestJS Backend      │
  (Web / Mobile)  ──►   │   localhost:3000       │
                         └─────────┬────────────┘
                                   │
           ┌───────────────────────┼────────────────────────┐
           │                       │                        │
     ┌─────▼─────┐         ┌───────▼──────┐      ┌─────────▼──────┐
     │  MySQL 8  │         │  Redis 7      │      │  MinIO         │
     │  (Prisma) │         │  Cache+Queue  │      │  (S3 storage)  │
     └───────────┘         └──────────────┘      └────────────────┘
                                   │
                           ┌───────▼──────┐
                           │ Elasticsearch │
                           │  (search)     │
                           └──────────────┘
```

**Multi-tenant model:** Every business table has `workspaceId`. Queries always start with `WHERE workspace_id = ?`. No cross-tenant data ever leaks.

---

## 2. Tech Stack

| Layer              | Technology                                  | Version   |
| ------------------ | ------------------------------------------- | --------- |
| Backend API        | NestJS + TypeScript                         | 10.3.x    |
| ORM                | Prisma                                      | 5.17.x    |
| Database           | MySQL                                       | 8.0+      |
| Cache / Queue      | Redis (via ioredis)                         | 7.x       |
| Queue Engine       | BullMQ (`@nestjs/bullmq`)                   | 11.x      |
| File Storage       | MinIO (S3-compatible, self-hosted)          | 8.x       |
| Full-text Search   | Elasticsearch (`@nestjs/elasticsearch`)     | 8.x       |
| Auth               | JWT (access 15 min / refresh 7 days)        | —         |
| Admin Web          | Next.js + Tailwind + Radix UI               | 14.2.x    |
| Public Portal      | Next.js + Tailwind                          | 14.2.x    |
| Testing            | Jest + ts-jest + Supertest                  | 29.x      |
| Container          | Docker                                      | —         |
| CI/CD              | GitHub Actions                              | —         |

---

## 3. Repository Structure

```
PropCartCRM/
├── src/                          # NestJS backend
│   ├── main.ts                   # Bootstrap (CORS, body limit 50MB, global pipes/filters)
│   ├── app.module.ts             # Root module — global Redis cache, BullMQ, throttler
│   ├── config/
│   │   └── configuration.ts     # ENV loader (nodeEnv, jwt, redis, db, minio, google)
│   ├── prisma/
│   │   ├── prisma.module.ts      # Global module
│   │   └── prisma.service.ts     # PrismaClient with connection-pool tuning ★
│   ├── elasticsearch/
│   │   ├── elasticsearch.module.ts
│   │   └── elasticsearch.service.ts   # member + project indexing ★
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts      # → {code, message, statusCode}
│   │   ├── guards/
│   │   │   └── api-signature.guard.ts        # HMAC-SHA256 global guard
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts       # → {data, meta} wrapper
│   │   ├── mail/
│   │   │   ├── mail.module.ts
│   │   │   └── mail.service.ts               # sendBookingRequestEmail etc.
│   │   ├── queues/
│   │   │   ├── notification.queue.ts         # Job type constants & interfaces ★
│   │   │   ├── notification.processor.ts     # BullMQ worker ★
│   │   │   └── notification-queue.module.ts  # registerQueue + processor ★
│   │   ├── storage/
│   │   │   ├── minio.module.ts
│   │   │   ├── minio.service.ts              # Streaming upload (disk → MinIO) ★
│   │   │   └── multer-disk-storage.ts        # diskStorage config (tmpdir) ★
│   │   └── utils/
│   │       └── html-sanitizer.util.ts        # XSS sanitizer (sanitize-html) ★
│   └── modules/
│       ├── auth/                 # Login, OTP, Google, JWT, device
│       ├── user/                 # Profile, documents
│       ├── workspace/            # Workspace CRUD, invitations, members
│       ├── role/                 # RBAC roles
│       ├── permission/           # RBAC permissions
│       ├── catalog/              # Dynamic lookup tables
│       ├── department/           # Teams & member assignment
│       ├── product/              # Real estate units/products
│       ├── project/              # Real estate projects ★ (ES + cache)
│       ├── warehouse/            # Inventory warehouses
│       ├── notification/         # In-app notifications
│       ├── upload/               # Upload orchestration
│       ├── portal/               # Public portal API ★ (cache + BullMQ)
│       └── cleanup/              # Scheduled maintenance cron jobs
├── prisma/
│   ├── schema.prisma             # MySQL 8 schema (27 models)
│   ├── migrations/               # 16 migrations
│   └── seed.ts                   # Seed script
├── apps/
│   ├── web/                      # Admin/Manager dashboard (Next.js)
│   └── portal/                   # Public project portal (Next.js)
├── docs/
│   ├── mvp/                      # Feature specifications
│   └── *.md                      # Architecture & integration guides
├── CLAUDE.md                     # AI coding guidelines (authoritative)
└── ARCHITECTURE.md               # ← this file
```

> ★ = modified or created during v1.1 optimizations

---

## 4. Backend Modules

### Global Setup (`app.module.ts`)

Three critical global providers configured here:

```typescript
// 1. Cache — Redis in prod, in-memory in dev
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async (cfg) => {
    if (cfg.get('nodeEnv') === 'production') {
      const { redisStore } = await import('cache-manager-ioredis-yet');
      return { store: await redisStore({ host, port }), ttl: 300_000 };
    }
    return { ttl: 300_000 }; // in-memory for dev
  },
});

// 2. BullMQ — global Redis connection
BullModule.forRootAsync({
  useFactory: (cfg) => ({
    connection: { host: cfg.get('redis.host'), port: cfg.get('redis.port') },
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
  }),
});

// 3. Global API signature guard (HMAC-SHA256)
{ provide: APP_GUARD, useClass: ApiSignatureGuard }
```

### Guard Chain

Every protected endpoint must be decorated in this exact order:

```typescript
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
@RequirePermission('SOME_PERMISSION_CODE')
```

| Guard             | Responsibility                                      | Failure code          |
| ----------------- | --------------------------------------------------- | --------------------- |
| `JwtAuthGuard`    | Validates JWT; injects `req.user`; checks blacklist | `TOKEN_REVOKED` (401) |
| `WorkspaceGuard`  | Validates active workspace membership               | `WORKSPACE_MEMBER_NOT_FOUND` (403) |
| `PermissionGuard` | Checks RBAC role has required permission code       | `FORBIDDEN` (403)     |

`req.user` shape after `JwtAuthGuard`:
```typescript
interface JwtPayload {
  sub: string;          // userId
  workspaceId: string;
  role: string;         // e.g. 'OWNER' | 'ADMIN' | 'SALES'
  workspaceType: string; // 'PERSONAL' | 'COMPANY'
  deviceId: string;
  jti?: string;         // JWT ID — used for blacklisting on logout ★
}
```

### Module Dependency Map

```
AppModule
 ├── PrismaModule (global)
 ├── ElasticsearchModule (global)
 ├── CacheModule (global, Redis/in-memory)
 ├── BullModule (global, Redis)
 ├── NotificationQueueModule
 │    ├── BullModule.registerQueue('notification')
 │    ├── PrismaModule
 │    ├── MailModule
 │    └── NotificationProcessor (worker)
 ├── AuthModule
 │    ├── PrismaModule
 │    ├── UserModule
 │    ├── JwtModule
 │    └── CacheModule (CACHE_MANAGER for OTP + blacklist)
 ├── ProjectModule
 │    ├── MinioModule
 │    └── ElasticsearchModule
 ├── PortalModule
 │    ├── PrismaModule
 │    ├── ElasticsearchModule
 │    ├── NotificationQueueModule
 │    └── CacheModule (CACHE_MANAGER for portal cache)
 └── ... other feature modules
```

---

## 5. Database Schema

**Engine:** MySQL 8.0+, managed via Prisma 5.
**Datasource name in schema:** `db`
**Location:** `prisma/schema.prisma`

### Key Models

| Model                | Purpose                                              | Key Fields                                          |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `User`               | System user account                                  | `phone` (unique), `email`, `googleId`, `status`     |
| `Workspace`          | Multi-tenant root entity                             | `type` (PERSONAL/COMPANY), `ownerUserId`            |
| `WorkspaceMember`    | User ↔ Workspace with scoped overrides               | `workspaceId`, `userId`, `roleId`, `status`         |
| `Role`               | RBAC role (OWNER/ADMIN/SALES/MANAGER/VIEWER)         | `code` (unique)                                     |
| `Permission`         | RBAC permission code (e.g. `PROJECT_CREATE`)         | `code` (unique), `module`                           |
| `RolePermission`     | Role ↔ Permission M:N join                           | composite unique `[roleId, permissionId]`           |
| `WorkspaceInvitation`| Invitation lifecycle                                 | `status` (0–4), `token` (unique), `declineReason`   |
| `UserDevice`         | Device binding for JWT                               | `deviceHash` (unique per user), `platform`          |
| `RefreshToken`       | Stored hashed refresh tokens                         | `tokenHash` (unique), `revoked`, `expiresAt`        |
| `Catalog`            | Dynamic lookup tables (roles, doc types, etc.)       | `type`, `code`, `workspaceId`, `parentId`           |
| `CatalogValue`       | Catalog dropdown options                             | `catalogId`, `value`, `label`, `color`, `order`     |
| `Department`         | Organizational unit                                  | `workspaceId`, `code`, `name`                       |
| `DepartmentMember`   | User ↔ Department with role assignment               | unique `[departmentId, userId]`                     |
| `Notification`       | In-app notification                                  | `userId`, `type`, `payload` (JSON), `read`          |
| `UserDocument`       | User/member uploaded document                        | `documentType` (CCCD/HDLD/CHUNG_CHI/OTHER)          |
| `PropertyWarehouse`  | Real estate inventory location                       | `workspaceId`, `code` (unique per ws)               |
| `PropertyProduct`    | Individual real estate unit                          | `unitCode` (unique per ws), `transactionStatus`     |
| `Project`            | Real estate development project                      | `displayStatus`, `saleStatus`, JSON fields          |

### Project Model (JSON fields)

The `Project` model stores rich structured data in JSON columns:

```
bannerUrls       Json?   → MediaItem[] = [{originalUrl, fileName, thumbnailUrl, description}]
zoneImages       Json?   → MediaItem[]
productImages    Json?   → MediaItem[]
amenityImages    Json?   → MediaItem[]
overviewHtml     String? → Sanitized Tiptap HTML (XSS-safe) ★
locationDescriptionHtml String? → Sanitized Tiptap HTML ★
videoDescription String? → Sanitized Tiptap HTML ★
subdivisions     Json?   → ProjectSubdivision[] (complex nested structure)
contacts         Json?   → ProjectContact[]
planningStats    Json?   → PlanningStat[]
progressUpdates  Json?   → ProjectProgressUpdate[]
documentItems    Json?   → ProjectDocumentItem[]
```

### Database Rules (Mandatory)

1. Every business table has `workspaceId` field
2. Required indexes: `@@index([workspaceId])` and `@@index([workspaceId, id])`
3. All queries begin with `WHERE workspace_id = ?` — never omit this
4. UUID primary keys: `@id @default(uuid())`
5. Never query cross-tenant data

---

## 6. Authentication & Security

### Authentication Flow

```
POST /auth/send-otp
  → validate phone → check not banned → generate OTP (dev: '999999')
  → store in Redis key `otp:{phone}` with 120s TTL
  → (prod) send via SMS

POST /auth/verify-otp
  → get OTP from Redis → validate code → increment attempts
  → if new user: create User + personal Workspace + seed Catalogs
  → upsertDevice → issueTokens → return {access_token, refresh_token}
```

### Token Issuance (`issueTokens`)

```typescript
// Access token — 15min, includes jti for blacklisting
const jti = uuidv4();
const accessToken = jwtService.sign({ ...payload, jti });

// Refresh token — 7 days, stored as SHA-256 hash in DB
const rawRefreshToken = uuidv4();
const tokenHash = sha256(rawRefreshToken);
await prisma.refreshToken.create({ data: { tokenHash, deviceId, workspaceId, ... } });
```

### JWT Blacklist on Logout ★

When a user logs out, the current access token is immediately invalidated:

```typescript
// auth.controller.ts — logout
@Post('logout')
@UseGuards(JwtAuthGuard)
logout(@Headers('authorization') authorization: string, @Body('refresh_token') refreshToken: string) {
  const accessToken = authorization?.replace(/^Bearer\s+/i, '') ?? '';
  return this.authService.logout(accessToken, refreshToken);
}

// auth.service.ts — logout
async logout(accessToken: string, refreshToken: string) {
  // 1. Decode jti + exp from access token (trusted since it passed JwtAuthGuard)
  const decoded = jwtService.decode(accessToken) as { jti?: string; exp?: number };
  if (decoded?.jti && decoded?.exp) {
    const remainingMs = decoded.exp * 1000 - Date.now();
    if (remainingMs > 0) {
      await cacheManager.set(`blacklist:${decoded.jti}`, 1, remainingMs);
    }
  }
  // 2. Revoke refresh token in DB
  const tokenHash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
}
```

### JWT Strategy — Blacklist Check ★

```typescript
// jwt.strategy.ts
async validate(payload: JwtPayload): Promise<JwtPayload> {
  if (payload.jti) {
    const revoked = await cacheManager.get(`blacklist:${payload.jti}`);
    if (revoked) throw new UnauthorizedException({ code: 'TOKEN_REVOKED' });
  }
  return payload;
}
```

### Device Binding

Every token is bound to a `device_hash`. On refresh, the device must match:

```
refreshToken → tokenHash in DB → linked to deviceId → UserDevice.deviceHash
```

If device mismatch: `DEVICE_MISMATCH` error (401).

### External API Security

All external API calls require HMAC-SHA256 signature:
- Headers: `x-timestamp`, `x-signature`
- Reject if timestamp delta > 60 seconds
- Secret: `API_CLIENT_SECRET` env var

---

## 7. Caching Architecture

### Cache Configuration ★

**File:** `src/app.module.ts`

```typescript
// Production → Redis
store: await redisStore({ host, port }), ttl: 300_000ms (5 min)

// Development → in-memory (no Redis needed)
{ ttl: 300_000 }
```

The `CACHE_MANAGER` token is available globally everywhere via `@Inject(CACHE_MANAGER)`.

### Portal Cache Strategy ★

**File:** `src/modules/portal/portal.controller.ts`

```
TTL_PROJECT = 5 min   (project detail + list pages)
TTL_META    = 10 min  (project types, provinces, catalog options)
```

**Cache key patterns:**
```
portal:project:{workspaceId}:{projectId}   → raw project data (without live prices)
portal:projects:{workspaceId}:{page}:{limit}:{search}:{type}:{province}  → list pages
portal:meta:{workspaceId}:types            → project type options
portal:meta:{workspaceId}:provinces        → available provinces
portal:meta:{workspaceId}:catalog:{type}   → catalog options
```

### Live Price Separation ★

Project data is cached, but **product prices are NEVER cached** — they are always fetched fresh:

```typescript
// portal.controller.ts
async getProject(workspaceId, projectId) {
  const cacheKey = `portal:project:${workspaceId}:${projectId}`;

  // 1. Fetch static project data (cached 5 min)
  let project = await cacheManager.get(cacheKey);
  if (!project) {
    project = await prisma.project.findFirst(...);
    await cacheManager.set(cacheKey, project, TTL_PROJECT);
  }

  // 2. ALWAYS enrich with live prices (never cached)
  return enrichWithLivePrices(project);
}

private async enrichWithLivePrices(project) {
  // Deep-clone to avoid mutating the cached object
  const enriched = JSON.parse(JSON.stringify(project));
  // Fetch current product prices from DB for each subdivision's fundProducts
  // ... merge live prices into enriched copy
  return enriched;
}
```

### Cache Invalidation ★

When a project is updated or deleted, portal cache is invalidated:

```typescript
// project.service.ts → invalidatePortalCache()
private async invalidatePortalCache(workspaceId, projectId): Promise<void> {
  try {
    await cacheManager.del(`portal:project:${workspaceId}:${projectId}`);

    // Redis: pattern-delete all list-cache entries
    const store = (cacheManager as any).store;
    if (store?.client?.keys) {
      const keys = await store.client.keys(`portal:projects:${workspaceId}:*`);
      if (keys.length > 0) await store.client.del(keys);
      const metaKeys = await store.client.keys(`portal:meta:${workspaceId}:*`);
      if (metaKeys.length > 0) await store.client.del(metaKeys);
    }
  } catch {
    // Cache failure MUST NOT break the main write path
  }
}
```

---

## 8. Background Jobs (BullMQ)

### Architecture ★

**Queue name:** `'notification'` (constant: `NOTIFICATION_QUEUE`)
**Files:**
- `src/common/queues/notification.queue.ts` — constants + interfaces
- `src/common/queues/notification.processor.ts` — worker (extends `WorkerHost`)
- `src/common/queues/notification-queue.module.ts` — module

### Job Types

```typescript
// notification.queue.ts
export const NotificationJobType = {
  SEND_EMAIL:           'send-email',
  CREATE_NOTIFICATION:  'create-notification',
} as const;

export interface SendEmailJob {
  type: 'booking-request';
  to: string;
  recipientName: string;
  productName: string;
  unitCode?: string | null;
  saleName: string;
  agency?: string;
  phone: string;
  notes?: string;
}

export interface CreateNotificationJob {
  userId: string;
  notificationType: string;
  payload: Record<string, unknown>;
}
```

### Enqueuing Jobs (Portal Booking Request)

```typescript
// portal.controller.ts — createBookingRequest
await notificationQueue.add(NotificationJobType.CREATE_NOTIFICATION, {
  userId: agentUserId,
  notificationType: 'BOOKING_REQUEST',
  payload: { productId, buyerName, ... },
} as CreateNotificationJob);

await notificationQueue.add(NotificationJobType.SEND_EMAIL, {
  type: 'booking-request',
  to: agentEmail,
  ...
} as SendEmailJob);

// Response is immediate — jobs processed asynchronously
return { message: 'Booking request submitted' };
```

### Retry Policy

Configured globally in `app.module.ts`:
```
attempts: 3
backoff: exponential, 2s initial
removeOnComplete: 100 (keep last 100 completed jobs)
removeOnFail: 500 (keep last 500 failed jobs for inspection)
```

### Module Export

`NotificationQueueModule` exports `BullModule` so any importing module can use `@InjectQueue(NOTIFICATION_QUEUE)`:

```typescript
// notification-queue.module.ts
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE }), PrismaModule, MailModule],
  providers: [NotificationProcessor],
  exports: [BullModule],   // ← allows @InjectQueue in importing modules
})
```

---

## 9. File Storage (MinIO)

### Disk-Streaming Upload ★

Before v1.1, files were loaded entirely into RAM as `Buffer`. Now they are streamed from disk:

```typescript
// multer-disk-storage.ts
export const multerDiskStorage = diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});
```

```typescript
// minio.service.ts
interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;   // memory upload (legacy)
  path?: string;     // disk upload (preferred) ★
}

private toStream(file: UploadFile): Readable {
  return file.path ? fs.createReadStream(file.path) : Readable.from(file.buffer!);
}

private cleanupDisk(file: UploadFile): void {
  if (file.path) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
}

// All upload methods now use streaming:
async uploadPropertyImage(workspaceId, file) {
  try {
    await minioClient.putObject(bucket, objectKey, this.toStream(file), file.size);
    return { fileUrl: ... };
  } finally {
    this.cleanupDisk(file);  // always delete temp file
  }
}
```

### Storage Path Conventions

```
propcart-crm/
└── {workspace_id}/
    ├── documents/
    │   ├── profile/{userId}/{YYYYMMDD}/{uuid}.{ext}   ← user profile docs
    │   └── members/{YYYYMMDD}/{uuid}.{ext}             ← workspace member docs
    ├── avatars/{userId}/{YYYYMMDD}/{uuid}.{ext}
    ├── properties/{YYYYMMDD}/{uuid}.{ext}             ← project/product images
    └── temp/{uuid}.{ext}                              ← auto-deleted after 24h
```

---

## 10. Search (Elasticsearch)

### Indices ★

**File:** `src/elasticsearch/elasticsearch.service.ts`

| Index               | Purpose                              | Key fields                                             |
| ------------------- | ------------------------------------ | ------------------------------------------------------ |
| `workspace-members` | Member full-text search              | `searchText` (ngram), `workspaceId` (keyword)          |
| `workspace-projects`| Project full-text search             | `name^3`, `address` (ngram), `workspaceId` (keyword)   |

Both indices use:
- ngram tokenizer (min 2, max 20 grams)
- `standard` analyzer for search queries
- `workspaceId` filter to enforce tenant isolation

### Project Search Flow

```typescript
// portal.controller.ts — listProjects with search
if (search) {
  const esIds = await esService.searchProjects(workspaceId, search, { projectType, province });

  if (esIds.length > 0) {
    where = { ...baseWhere, id: { in: esIds } };   // ES hit → DB fetch by IDs
  } else {
    where = { ...baseWhere, name: { contains: search } };  // fallback: DB LIKE
  }
}
```

**Graceful degradation:** If Elasticsearch is unavailable, `searchProjects()` catches all errors and returns `[]`, triggering the DB LIKE fallback. Production search never fails due to ES being down.

### Index Maintenance

Projects are indexed fire-and-forget (never blocks the API response):
```typescript
// project.service.ts — create/update
this.esService.indexProject({ projectId, workspaceId, name, address, province, ... });
// no await — fire and forget
```

---

## 11. Portal Public API

### Endpoints

```
GET  /portal/:workspaceId/projects          → list published projects (cached)
GET  /portal/:workspaceId/projects/:id      → project detail (cached data + live prices)
GET  /portal/:workspaceId/project-types     → available project types (cached)
GET  /portal/:workspaceId/provinces         → available provinces (cached)
GET  /portal/:workspaceId/catalog/:type     → catalog options (cached)
POST /portal/:workspaceId/booking-requests  → submit booking (BullMQ async)
```

### Cache Behavior

| Endpoint          | Cache TTL | Notes                                    |
| ----------------- | --------- | ---------------------------------------- |
| `listProjects`    | 5 min     | Includes ES search; cache key includes all query params |
| `getProject`      | 5 min     | Static data only; live prices always fresh              |
| `getProjectTypes` | 10 min    | Metadata                                                |
| `getProvinces`    | 10 min    | Metadata                                                |
| `getCatalogOptions`| 10 min   | Metadata                                                |
| `createBookingRequest` | —    | No cache; enqueues BullMQ jobs; returns immediately     |

---

## 12. Frontend Apps

### Admin Web (`apps/web/`)

Internal dashboard at `localhost:3001`.

**Key pages:**
- `/login` — phone + OTP authentication
- `/dashboard` — overview
- `/workspace/members` — workspace member management
- `/invitations` — pending invitations (accept/decline)
- `/catalog` — dynamic catalog management
- `/department` — department & team management
- `/permissions` — RBAC permission management
- `/product` — real estate unit management
- `/warehouse` — warehouse/inventory management
- `/project` — project management with wizard ★
- `/profile` — user profile & documents
- `/notifications` — notification center

**Project Wizard Flow:**

The project form is a multi-step wizard saved step-by-step via PATCH:

```
Step 0 (Overview):   name, type, status, banner, overview HTML, zone/product/amenity images, contacts, planning stats
Step 1 (Location):   address, province, district, ward, coordinates, location HTML
Step 2 (Subdivisions): subdivision groups + tower details + fund products + floor plans
Step 3 (Progress):   progress updates with images/videos
Step 4 (Documents):  legal documents

Each step → PATCH /workspaces/:id/projects/:id (silent save)
```

**Media handling:**
- `MediaItem = { originalUrl, fileName, thumbnailUrl?, description? }`
- `toCollectionField(items)` — converts array to nullable format (null if empty)

### Public Portal (`apps/portal/`)

Public-facing portal at `localhost:3002`.

**Key pages:**
- `/` — homepage with map + project list
- `/du-an` — projects listing with filters
- `/du-an/[slug]` — project detail with rich media

---

## 13. API Conventions

### Response Format

```json
// Single resource
{ "data": { "id": "...", ... }, "meta": {} }

// Collection
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }

// Error
{ "code": "ERROR_CODE", "message": "Human readable", "statusCode": 400 }
```

### Error Codes Reference

| Code                        | HTTP | When                                       |
| --------------------------- | ---- | ------------------------------------------ |
| `USER_BANNED`               | 403  | Banned user attempts login                 |
| `OTP_INVALID`               | 400  | Wrong or expired OTP                       |
| `GOOGLE_TOKEN_INVALID`      | 401  | Google token verification failed           |
| `PHONE_REQUIRED`            | 200  | Google login but no phone registered yet   |
| `REFRESH_TOKEN_INVALID`     | 401  | Token not found in DB                      |
| `REFRESH_TOKEN_REVOKED`     | 401  | Token has been revoked                     |
| `DEVICE_MISMATCH`           | 401  | Device hash doesn't match token            |
| `TOKEN_REVOKED`             | 401  | Access token blacklisted after logout      |
| `WORKSPACE_MEMBER_NOT_FOUND`| 403  | User not in workspace                      |
| `FORBIDDEN`                 | 403  | Insufficient RBAC permissions              |

### DTO Validation

All request bodies use `class-validator` + `class-transformer`. Nullable fields use `@IsOptional()` which permits both `undefined` and `null` to pass validation.

### Naming Conventions

| Target              | Convention           | Example                 |
| ------------------- | -------------------- | ----------------------- |
| Files               | kebab-case           | `auth.service.ts`       |
| Classes             | PascalCase           | `AuthService`           |
| Methods/Variables   | camelCase            | `switchWorkspace()`     |
| DB tables           | snake_case           | `workspace_members`     |
| DB columns          | snake_case           | `workspace_id`          |
| Prisma models       | PascalCase           | `WorkspaceMember`       |
| API routes          | kebab-case           | `/auth/switch-workspace`|
| Env variables       | UPPER_SNAKE_CASE     | `JWT_ACCESS_SECRET`     |
| Permission codes    | SCREAMING_SNAKE_CASE | `PROJECT_CREATE`        |

---

## 14. Optimization Changes (v1.1)

All changes below were applied to the v1.0 baseline (`ee64065`). These are **production-ready optimizations** — do not revert them.

### ✅ O1 — Redis Cache for Portal

**Problem:** Portal API endpoints executed Prisma queries on every request with no caching.
**Fix:** `CacheModule.registerAsync()` with Redis in prod, in-memory in dev. Portal endpoints cache with TTL_PROJECT=5min and TTL_META=10min.
**Files:** `app.module.ts`, `portal/portal.controller.ts`

### ✅ O2 — XSS Sanitization for HTML Fields

**Problem:** Tiptap-generated HTML stored directly in DB without sanitization — XSS risk.
**Fix:** `sanitizeRichText()` utility wraps `sanitize-html` to strip scripts, iframes, event handlers while keeping all valid Tiptap formatting.
**Files:** `common/utils/html-sanitizer.util.ts` (new), `project/project.service.ts`

**⚠️ Critical import pattern:** `sanitize-html` uses `export =` (CommonJS). Without `esModuleInterop: true`, you MUST use:
```typescript
// CORRECT
import sanitizeHtml = require('sanitize-html');

// WRONG (causes TypeError at runtime: sanitize_html_1.default is not a function)
import sanitizeHtml from 'sanitize-html';
```

### ✅ O3 — Upload Streaming (Disk → MinIO)

**Problem:** Files loaded entirely into Node.js RAM as `Buffer` — RAM spikes on large uploads.
**Fix:** Multer `diskStorage` writes to `os.tmpdir()`, then `fs.createReadStream()` pipes to MinIO. Temp file deleted in `finally` block.
**Files:** `common/storage/multer-disk-storage.ts` (new), `minio.service.ts`, `upload/upload.module.ts`, `upload/upload.service.ts`, `project/project.controller.ts`

### ✅ O4 — Live Price Separation from Cache

**Problem:** Caching entire project including product prices caused stale price data.
**Fix:** Only static project data is cached. `enrichWithLivePrices()` deep-clones the cached object and always fetches current prices from DB.
**Files:** `portal/portal.controller.ts`

### ✅ O5 — JWT Blacklist on Logout

**Problem:** After logout, the access token remained valid until expiry (up to 15min window).
**Fix:** `jti` (UUID) embedded in each access token. On logout, `blacklist:{jti}` key stored in Redis with TTL = remaining lifetime. `JwtStrategy.validate()` rejects blacklisted tokens.
**Files:** `auth/auth.service.ts`, `auth/auth.controller.ts`, `auth/strategies/jwt.strategy.ts`

### ✅ O6 — DB Connection Pool Configuration

**Problem:** Default Prisma pool (10 connections × N instances) could exhaust PostgreSQL/MySQL connections.
**Fix:** `PrismaService` constructor reads `DATABASE_CONNECTION_LIMIT` (default 5) and `DATABASE_POOL_TIMEOUT` (default 10) from env, appends them to `DATABASE_URL` at runtime.
**Files:** `prisma/prisma.service.ts`

```typescript
// prisma.service.ts constructor
const separator = baseUrl.includes('?') ? '&' : '?';
const datasourceUrl = `${baseUrl}${separator}connection_limit=${limit}&pool_timeout=${timeout}`;
super({ datasources: { db: { url: datasourceUrl } } });
```

> Note: datasource name in `schema.prisma` is `db`. If schema changes the datasource name, update `{ datasources: { db: ... } }` accordingly.

### ✅ O7 — Elasticsearch Full-text Search for Projects

**Problem:** Project search used `LIKE '%query%'` — full table scan at scale.
**Fix:** `workspace-projects` Elasticsearch index with ngram analyzer for Vietnamese fuzzy search. Fallback to DB LIKE when ES returns empty (graceful degradation).
**Files:** `elasticsearch/elasticsearch.service.ts`, `portal/portal.controller.ts`, `project/project.service.ts`, `project/project.module.ts`

### ✅ O8 — BullMQ Background Jobs

**Problem:** Booking request handler synchronously awaited email sending and notification creation — blocking the HTTP response.
**Fix:** `notificationQueue.add()` enqueues jobs and returns immediately. `NotificationProcessor` handles execution asynchronously with retries.
**Files:** `common/queues/*` (3 new files), `portal/portal.controller.ts`, `portal/portal.module.ts`, `app.module.ts`

---

## 15. Known Patterns & Pitfalls

### Prisma JSON Fields

For nullable JSON columns, use `toNullableJsonInput()`:
```typescript
function toNullableJsonInput(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;   // ← required for nullable JSON
  return value as Prisma.InputJsonValue;
}
```

### sanitize-html Import

Always use the require-style TypeScript import (see O2 above). Adding `esModuleInterop: true` to `tsconfig.json` would also fix this, but hasn't been applied yet.

### Cache Invalidation Must Not Fail

Any cache invalidation code that could fail MUST be wrapped in try-catch:
```typescript
try {
  await cacheManager.del(key);
  // ... more cache ops
} catch {
  // NEVER throw here — cache failure must not break writes
}
```

### Fire-and-Forget for ES Indexing

Elasticsearch indexing is never awaited:
```typescript
this.esService.indexProject({ ... }); // no await
```
`ElasticsearchService` methods always try-catch internally and log errors without re-throwing.

### BullMQ Queue Access

Only modules that import `NotificationQueueModule` can use `@InjectQueue(NOTIFICATION_QUEUE)`. Currently: `PortalModule`.

### WorkspaceGuard vs URL workspaceId

`WorkspaceGuard` validates `user.workspaceId` from the JWT, **not** the `:workspaceId` URL parameter. The service layer uses the URL parameter for data scoping. Keep these consistent in the frontend.

### OWNER Role Bypass

`PermissionGuard` gives full access to `role === 'OWNER'` without checking permissions table:
```typescript
if (user.role === 'OWNER') return true;
```
This prevents OWNER lockout when the DB is seeded with missing permissions.

### Connection Pool with PgBouncer/Proxies

If a connection pooler (PgBouncer, RDS Proxy) is in front of the DB, set:
```env
DATABASE_CONNECTION_LIMIT=1
```
The pooler manages the actual connections; each app instance should request only 1.

---

## 16. Environment Variables

```env
# ─── Application ────────────────────────────────────────────
NODE_ENV=development                    # production | development | test
PORT=3000

# ─── Database ───────────────────────────────────────────────
DATABASE_URL=mysql://user:pass@localhost:3306/propcart_crm?charset=utf8mb4
DATABASE_CONNECTION_LIMIT=5            # connections per Prisma instance (default: 5) ★
DATABASE_POOL_TIMEOUT=10               # seconds to wait for connection (default: 10) ★

# ─── JWT ────────────────────────────────────────────────────
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_TEMP_EXPIRES=10m                   # for Google OAuth temp token

# ─── Redis ──────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ─── API Security ───────────────────────────────────────────
API_CLIENT_SECRET=<min 32 chars>       # HMAC-SHA256 key for external API clients

# ─── Google OAuth ───────────────────────────────────────────
GOOGLE_CLIENT_ID=                      # from Google Cloud Console

# ─── MinIO ──────────────────────────────────────────────────
MINIO_ENDPOINT=minio.propcart.vn
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=true
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=https://minio.propcart.vn

# ─── Elasticsearch ──────────────────────────────────────────
ELASTICSEARCH_NODE=http://localhost:9200   # optional; ES search degrades to DB LIKE if down ★
```

---

## 17. Development Commands

```bash
# ─── Backend ───────────────────────────────────────────────

# Install dependencies
npm install

# Run in dev mode (hot reload)
npm run start:dev

# Type-check without building
npx tsc --noEmit

# Run unit tests
npm run test
npm run test:watch
npm run test:cov

# Run E2E tests
npm run test:e2e

# Lint & format
npm run lint
npm run format

# ─── Database ──────────────────────────────────────────────

# Apply pending migrations
npx prisma migrate dev --name <migration-name>

# Generate Prisma client (after schema change)
npx prisma generate

# Open Prisma Studio (GUI browser)
npx prisma studio

# Seed database
npm run prisma:seed

# ─── Frontend ──────────────────────────────────────────────

# Admin web (port 3001)
cd apps/web && npm install && npm run dev

# Public portal (port 3002)
cd apps/portal && npm install && npm run dev
```

---

## Appendix: File Change Index (v1.1)

| File                                          | Change Type | Description                              |
| --------------------------------------------- | ----------- | ---------------------------------------- |
| `src/app.module.ts`                           | Modified    | CacheModule (Redis), BullModule added    |
| `src/prisma/prisma.service.ts`                | Modified    | Connection pool URL params ★             |
| `src/common/utils/html-sanitizer.util.ts`     | **New**     | XSS sanitizer using sanitize-html        |
| `src/common/storage/multer-disk-storage.ts`   | **New**     | Disk-based multer storage config         |
| `src/common/storage/minio.service.ts`         | Modified    | Streaming upload via disk path           |
| `src/common/queues/notification.queue.ts`     | **New**     | Job type constants + interfaces          |
| `src/common/queues/notification.processor.ts` | **New**     | BullMQ worker                            |
| `src/common/queues/notification-queue.module.ts` | **New**  | Queue module                             |
| `src/elasticsearch/elasticsearch.service.ts`  | Modified    | Added project index + searchProjects     |
| `src/modules/auth/auth.service.ts`            | Modified    | jti in tokens, blacklist on logout       |
| `src/modules/auth/auth.controller.ts`         | Modified    | logout accepts Authorization header      |
| `src/modules/auth/strategies/jwt.strategy.ts` | Modified    | Blacklist check in validate()            |
| `src/modules/auth/auth.service.spec.ts`       | Modified    | logout test updated for new signature    |
| `src/modules/project/project.service.ts`      | Modified    | sanitizeRichText, ES index, cache inval. |
| `src/modules/project/project.module.ts`       | Modified    | ElasticsearchModule added                |
| `src/modules/project/project.controller.ts`   | Modified    | diskStorage on upload-image              |
| `src/modules/upload/upload.module.ts`         | Modified    | diskStorage in MulterModule              |
| `src/modules/upload/upload.service.ts`        | Modified    | Pass disk path to MinIO                  |
| `src/modules/portal/portal.controller.ts`     | Modified    | Full rewrite: cache + ES + BullMQ        |
| `src/modules/portal/portal.module.ts`         | Modified    | NotificationQueueModule + ES added       |

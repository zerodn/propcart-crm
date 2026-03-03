# MVP-01: Authentication & Workspace User Management

Project: PropCart CRM SaaS
Version: 2.0.0
Module: auth, workspace, user
Depends on: (none — đây là foundation)
Status: READY

---

# 1. MỤC TIÊU / OBJECTIVE

[VI] Xây dựng hệ thống Authentication + Workspace Management — nền móng cho toàn bộ PropCart CRM SaaS. Mọi module khác phụ thuộc vào MVP này.

[EN] Build the Authentication + Workspace Management system — the foundation layer for all other modules.

System must support:
- SaaS multi-tenant architecture
- Personal workspace auto-created per user
- Multiple company workspace memberships per user
- Company workspace invite flow với user approval
- Workspace switching (new JWT per workspace)
- RBAC per workspace
- Secure API (HMAC signature + device binding)
- High-performance database (100k+ users)

---

# 2. CORE CONCEPT

## 2.1 User & Workspace Model

Mỗi user:
- Sở hữu **1 Personal Workspace** (tạo tự động khi register)
- Có thể tham gia **nhiều Company Workspace**
- **Company Workspace** có thể mời user tham gia và phải được user approve
- Có **role khác nhau** ở mỗi workspace
- Có thể **switch workspace** → nhận JWT mới cho workspace đó

Authorization luôn dựa trên: **User + Workspace + Role**

## 2.2 Workspace Types

| Type | Mô tả |
|------|-------|
| `PERSONAL` | Workspace riêng tư, tự động tạo khi register |
| `COMPANY` | Workspace tổ chức, do OWNER tạo |

## 2.3 JWT Strategy

- Mỗi JWT chứa `workspaceId` + `role` → authorization theo workspace context
- Switch workspace = issue JWT mới (không dùng lại JWT cũ)
- Access token: 15 phút | Refresh token: 7 ngày

---

# 3. DATABASE SCHEMA

> Xem CLAUDE.md — Database Rules: UUID PK, workspace_id on all tables, index (workspace_id, id)

## 3.1 users — Bảng người dùng

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| phone | varchar(20) | UNIQUE | Số điện thoại (nullable nếu đăng ký Google trước) |
| email | varchar(255) | NULLABLE | Email |
| google_id | varchar(255) | UNIQUE NULLABLE | Google OAuth ID |
| password_hash | varchar(255) | NULLABLE | Null nếu chỉ dùng OAuth |
| status | smallint | NOT NULL DEFAULT 1 | 1=active, 0=inactive, 2=banned |
| created_at | timestamp | NOT NULL DEFAULT now() | |
| updated_at | timestamp | NOT NULL | |

Indexes:
- `idx_users_phone` → (phone)
- `idx_users_google_id` → (google_id)
- `idx_users_email` → (email)

---

## 3.2 workspaces — Bảng workspace

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| type | varchar(20) | NOT NULL | 'PERSONAL' hoặc 'COMPANY' |
| name | varchar(255) | NOT NULL | Tên workspace |
| owner_user_id | uuid | FK NOT NULL | User sở hữu workspace |
| status | smallint | NOT NULL DEFAULT 1 | 1=active, 0=inactive |
| created_at | timestamp | NOT NULL DEFAULT now() | |

Indexes:
- `idx_workspace_owner` → (owner_user_id)
- `idx_workspace_type` → (type)

Foreign keys:
- `owner_user_id` → `users.id`

---

## 3.3 workspace_members ⭐ CRITICAL TABLE

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| workspace_id | uuid | FK NOT NULL | Workspace |
| user_id | uuid | FK NOT NULL | User thành viên |
| role_id | uuid | FK NOT NULL | Role trong workspace này |
| status | smallint | NOT NULL DEFAULT 1 | 1=active, 0=inactive, 2=invited |
| joined_at | timestamp | NOT NULL DEFAULT now() | |

Indexes:
- `idx_wm_workspace_user` → (workspace_id, user_id) UNIQUE
- `idx_wm_user_workspace` → (user_id, workspace_id)
- `idx_wm_role` → (role_id)

Foreign keys:
- `workspace_id` → `workspaces.id`
- `user_id` → `users.id`
- `role_id` → `roles.id`

---

## 3.4 roles — Bảng vai trò

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| code | varchar(50) | UNIQUE NOT NULL | Mã role: OWNER, ADMIN, MANAGER, SALES, PARTNER |
| name | varchar(100) | NOT NULL | Tên hiển thị |
| description | varchar(255) | NULLABLE | Mô tả role |
| created_at | timestamp | NOT NULL DEFAULT now() | |

Seed data:
- `OWNER` — Chủ sở hữu workspace
- `ADMIN` — Quản trị viên
- `MANAGER` — Quản lý
- `SALES` — Nhân viên kinh doanh
- `PARTNER` — Đối tác

Indexes:
- `idx_roles_code` → (code) UNIQUE

---

## 3.5 permissions — Bảng quyền hạn

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| code | varchar(100) | UNIQUE NOT NULL | Mã permission: LEAD_CREATE, LEAD_VIEW, ... |
| name | varchar(255) | NOT NULL | Tên quyền |
| module | varchar(50) | NOT NULL | Module sở hữu: auth, lead, property, ... |
| created_at | timestamp | NOT NULL DEFAULT now() | |

Indexes:
- `idx_permissions_code` → (code) UNIQUE
- `idx_permissions_module` → (module)

---

## 3.6 role_permissions — Bảng gán quyền cho role

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| role_id | uuid | FK NOT NULL | Role |
| permission_id | uuid | FK NOT NULL | Permission |

Indexes:
- `idx_rp_role_permission` → (role_id, permission_id) UNIQUE

Foreign keys:
- `role_id` → `roles.id`
- `permission_id` → `permissions.id`

---

## 3.7 user_devices — Bảng thiết bị (device binding)

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| user_id | uuid | FK NOT NULL | User sở hữu device |
| device_hash | varchar(255) | NOT NULL | Hash định danh thiết bị |
| platform | varchar(20) | NULLABLE | 'ios', 'android', 'web' |
| last_active | timestamp | NOT NULL DEFAULT now() | Lần dùng cuối |
| created_at | timestamp | NOT NULL DEFAULT now() | |

Indexes:
- `idx_devices_user_hash` → (user_id, device_hash) UNIQUE

Foreign keys:
- `user_id` → `users.id`

---

## 3.8 workspace_invitations — Bảng lời mời tham gia workspace

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| workspace_id | uuid | FK NOT NULL | Workspace mời |
| invited_by_user_id | uuid | FK NOT NULL | User gửi lời mời (OWNER/ADMIN) |
| invited_phone | varchar(20) | NOT NULL | Số điện thoại được mời |
| invited_user_id | uuid | FK NULLABLE | User được mời (null nếu chưa đăng ký) |
| role_id | uuid | FK NOT NULL | Role sẽ gán khi accept |
| token | varchar(255) | UNIQUE NOT NULL | Token để accept/decline (UUID random) |
| status | smallint | NOT NULL DEFAULT 0 | 0=pending, 1=accepted, 2=declined, 3=expired, 4=cancelled |
| expires_at | timestamp | NOT NULL | Hết hạn sau 7 ngày kể từ ngày tạo |
| responded_at | timestamp | NULLABLE | Thời điểm user phản hồi |
| created_at | timestamp | NOT NULL DEFAULT now() | |

Indexes:
- `idx_wi_workspace` → (workspace_id, status)
- `idx_wi_invited_phone` → (invited_phone, status)
- `idx_wi_token` → (token) UNIQUE
- `idx_wi_invited_user` → (invited_user_id, status)

Foreign keys:
- `workspace_id` → `workspaces.id`
- `invited_by_user_id` → `users.id`
- `invited_user_id` → `users.id` (nullable)
- `role_id` → `roles.id`

> **Lưu ý:** Mỗi workspace chỉ có 1 invitation pending cho 1 phone. Kiểm tra UNIQUE (workspace_id, invited_phone, status=0) trước khi tạo mới.

---

## 3.9 refresh_tokens — Bảng refresh token

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| user_id | uuid | FK NOT NULL | User |
| device_id | uuid | FK NOT NULL | Device binding |
| token_hash | varchar(255) | UNIQUE NOT NULL | Hash của refresh token |
| workspace_id | uuid | FK NOT NULL | Workspace context |
| expires_at | timestamp | NOT NULL | Thời gian hết hạn |
| revoked | boolean | NOT NULL DEFAULT false | Đã thu hồi |
| created_at | timestamp | NOT NULL DEFAULT now() | |

Indexes:
- `idx_rt_token_hash` → (token_hash) UNIQUE
- `idx_rt_user_device` → (user_id, device_id)

---

# 4. PRISMA SCHEMA

```prisma
model User {
  id           String   @id @default(uuid())
  phone        String?  @unique
  email        String?
  googleId     String?  @unique
  passwordHash String?
  status       Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  workspaces     Workspace[]
  memberships    WorkspaceMember[]
  devices        UserDevice[]
  refreshTokens  RefreshToken[]

  @@index([email])
  @@map("users")
}

model Workspace {
  id          String   @id @default(uuid())
  type        String   // 'PERSONAL' | 'COMPANY'
  name        String
  ownerUserId String
  status      Int      @default(1)
  createdAt   DateTime @default(now())

  owner   User              @relation(fields: [ownerUserId], references: [id])
  members WorkspaceMember[]

  @@index([ownerUserId])
  @@index([type])
  @@map("workspaces")
}

model WorkspaceMember {
  id          String   @id @default(uuid())
  workspaceId String
  userId      String
  roleId      String
  status      Int      @default(1)
  joinedAt    DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  user      User      @relation(fields: [userId], references: [id])
  role      Role      @relation(fields: [roleId], references: [id])

  @@unique([workspaceId, userId])
  @@index([userId, workspaceId])
  @@map("workspace_members")
}

model Role {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())

  members     WorkspaceMember[]
  permissions RolePermission[]

  @@map("roles")
}

model Permission {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  module    String
  createdAt DateTime @default(now())

  roles RolePermission[]

  @@index([module])
  @@map("permissions")
}

model RolePermission {
  id           String @id @default(uuid())
  roleId       String
  permissionId String

  role       Role       @relation(fields: [roleId], references: [id])
  permission Permission @relation(fields: [permissionId], references: [id])

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

model UserDevice {
  id          String   @id @default(uuid())
  userId      String
  deviceHash  String
  platform    String?
  lastActive  DateTime @default(now())
  createdAt   DateTime @default(now())

  user          User           @relation(fields: [userId], references: [id])
  refreshTokens RefreshToken[]

  @@unique([userId, deviceHash])
  @@map("user_devices")
}

model WorkspaceInvitation {
  id                String    @id @default(uuid())
  workspaceId       String
  invitedByUserId   String
  invitedPhone      String
  invitedUserId     String?
  roleId            String
  token             String    @unique @default(uuid())
  status            Int       @default(0) // 0=pending,1=accepted,2=declined,3=expired,4=cancelled
  expiresAt         DateTime
  respondedAt       DateTime?
  createdAt         DateTime  @default(now())

  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  invitedBy     User      @relation("InvitedBy", fields: [invitedByUserId], references: [id])
  invitedUser   User?     @relation("InvitedUser", fields: [invitedUserId], references: [id])
  role          Role      @relation(fields: [roleId], references: [id])

  @@index([workspaceId, status])
  @@index([invitedPhone, status])
  @@index([invitedUserId, status])
  @@map("workspace_invitations")
}

model RefreshToken {
  id          String   @id @default(uuid())
  userId      String
  deviceId    String
  workspaceId String
  tokenHash   String   @unique
  expiresAt   DateTime
  revoked     Boolean  @default(false)
  createdAt   DateTime @default(now())

  user   User       @relation(fields: [userId], references: [id])
  device UserDevice @relation(fields: [deviceId], references: [id])

  @@index([userId, deviceId])
  @@map("refresh_tokens")
}
```

---

# 5. API ENDPOINTS

## 5.1 POST /auth/phone/send-otp

**[VI] Mô tả:** Gửi OTP về số điện thoại để đăng nhập / đăng ký.
**Auth required:** ❌ Public
**Rate limit:** 5 req/min/IP

**Request Body:**
```json
{ "phone": "+84901234567" }
```

**Request DTO:**
```typescript
export class SendOtpDto {
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;
}
```

**Response 200:**
```json
{ "data": { "message": "OTP sent", "expires_in": 120 } }
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `PHONE_INVALID` | 422 | Số điện thoại không hợp lệ |
| `RATE_LIMIT_EXCEEDED` | 429 | Quá 5 lần/phút |
| `USER_BANNED` | 403 | Tài khoản bị khóa |

> **DEV MODE:** OTP cố định = `999999`

---

## 5.2 POST /auth/phone/verify-otp

**[VI] Mô tả:** Xác thực OTP, tạo tài khoản nếu chưa có, trả về JWT.
**Auth required:** ❌ Public

**Request Body:**
```json
{
  "phone": "+84901234567",
  "otp": "999999",
  "device_hash": "sha256-of-device-fingerprint",
  "platform": "web"
}
```

**Response 200:**
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user": {
      "id": "uuid",
      "phone": "+84901234567"
    },
    "workspace": {
      "id": "uuid",
      "type": "PERSONAL",
      "name": "My Workspace"
    }
  }
}
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `OTP_INVALID` | 400 | OTP sai |
| `OTP_EXPIRED` | 400 | OTP hết hạn (>120s) |
| `OTP_MAX_ATTEMPTS` | 429 | Nhập sai quá 5 lần |

---

## 5.3 POST /auth/google

**[VI] Mô tả:** Đăng nhập bằng Google OAuth token.
**Auth required:** ❌ Public

**Request Body:**
```json
{
  "google_token": "google-id-token-from-client",
  "device_hash": "sha256-of-device-fingerprint",
  "platform": "web"
}
```

**Response 200:** (giống 5.2)

**Special case — phone chưa có:**
```json
{
  "data": {
    "status": "PHONE_REQUIRED",
    "temp_token": "eyJ..."
  }
}
```
→ Frontend phải gọi thêm `POST /auth/phone/link` với `temp_token` để liên kết số điện thoại.

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `GOOGLE_TOKEN_INVALID` | 401 | Token Google không hợp lệ |
| `GOOGLE_TOKEN_EXPIRED` | 401 | Token hết hạn |

---

## 5.4 POST /auth/refresh

**[VI] Mô tả:** Refresh access token bằng refresh token.
**Auth required:** ❌ Public (nhưng cần refresh_token hợp lệ)

**Request Body:**
```json
{
  "refresh_token": "eyJ...",
  "device_hash": "sha256-of-device-fingerprint"
}
```

**Response 200:**
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `REFRESH_TOKEN_INVALID` | 401 | Token không tồn tại |
| `REFRESH_TOKEN_EXPIRED` | 401 | Token hết hạn |
| `REFRESH_TOKEN_REVOKED` | 401 | Token đã bị thu hồi |
| `DEVICE_MISMATCH` | 401 | device_hash không khớp |

---

## 5.5 POST /auth/switch-workspace

**[VI] Mô tả:** Chuyển sang workspace khác, nhận JWT mới của workspace đó.
**Auth required:** ✅ JWT (bất kỳ workspace nào)
**Permission:** (không cần permission riêng, chỉ cần là member)

**Request Body:**
```json
{ "workspace_id": "uuid" }
```

**Response 200:**
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "workspace": {
      "id": "uuid",
      "type": "COMPANY",
      "name": "ABC Real Estate"
    },
    "role": "SALES"
  }
}
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `WORKSPACE_NOT_FOUND` | 404 | Workspace không tồn tại |
| `WORKSPACE_MEMBER_NOT_FOUND` | 403 | User không phải thành viên |
| `WORKSPACE_MEMBER_INACTIVE` | 403 | Membership bị vô hiệu |

---

## 5.6 GET /auth/workspaces

**[VI] Mô tả:** Lấy danh sách workspaces của user hiện tại (để hiển thị workspace switcher).
**Auth required:** ✅ JWT

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "PERSONAL",
      "name": "My Workspace",
      "role": "OWNER",
      "is_active": true
    },
    {
      "id": "uuid",
      "type": "COMPANY",
      "name": "ABC Real Estate",
      "role": "SALES",
      "is_active": false
    }
  ]
}
```

---

## 5.7 POST /workspaces/:workspaceId/invitations

**[VI] Mô tả:** OWNER hoặc ADMIN gửi lời mời tham gia workspace đến số điện thoại.
**Auth required:** ✅ JWT + Workspace
**Permission:** `WORKSPACE_MEMBER_INVITE`

**Request Body:**
```json
{
  "phone": "+84901234567",
  "role_code": "SALES"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "invited_phone": "+84901234567",
    "role": "SALES",
    "status": "pending",
    "expires_at": "2026-03-09T00:00:00Z"
  }
}
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `INVITATION_ALREADY_PENDING` | 409 | Phone đã có invitation pending trong workspace này |
| `MEMBER_ALREADY_EXISTS` | 409 | User đã là thành viên workspace |
| `ROLE_NOT_FOUND` | 404 | Role code không hợp lệ |
| `FORBIDDEN` | 403 | Không phải OWNER/ADMIN |

---

## 5.8 GET /me/invitations

**[VI] Mô tả:** Lấy danh sách lời mời đang chờ phản hồi của user hiện tại.
**Auth required:** ✅ JWT (bất kỳ workspace)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "token": "uuid-token",
      "workspace": {
        "id": "uuid",
        "name": "ABC Real Estate",
        "type": "COMPANY"
      },
      "invited_by": {
        "id": "uuid",
        "phone": "+84900000001"
      },
      "role": "SALES",
      "expires_at": "2026-03-09T00:00:00Z"
    }
  ]
}
```

---

## 5.9 POST /invitations/:token/accept

**[VI] Mô tả:** User chấp nhận lời mời → trở thành thành viên workspace.
**Auth required:** ✅ JWT (bất kỳ workspace)

**Response 200:**
```json
{
  "data": {
    "workspace": {
      "id": "uuid",
      "name": "ABC Real Estate",
      "type": "COMPANY"
    },
    "role": "SALES",
    "message": "Joined workspace successfully"
  }
}
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `INVITATION_NOT_FOUND` | 404 | Token không tồn tại |
| `INVITATION_EXPIRED` | 400 | Invitation quá 7 ngày |
| `INVITATION_ALREADY_RESPONDED` | 409 | Đã accept hoặc decline trước đó |
| `INVITATION_PHONE_MISMATCH` | 403 | Phone của JWT user khác với phone được mời |

---

## 5.10 POST /invitations/:token/decline

**[VI] Mô tả:** User từ chối lời mời.
**Auth required:** ✅ JWT (bất kỳ workspace)

**Response 200:**
```json
{ "data": { "message": "Invitation declined" } }
```

**Error Codes:** (giống 5.9, trừ INVITATION_PHONE_MISMATCH vẫn áp dụng)

---

## 5.11 DELETE /workspaces/:workspaceId/invitations/:invitationId

**[VI] Mô tả:** OWNER/ADMIN huỷ lời mời đang pending.
**Auth required:** ✅ JWT + Workspace
**Permission:** `WORKSPACE_MEMBER_INVITE`

**Response 200:**
```json
{ "data": { "message": "Invitation cancelled" } }
```

**Error Codes:**

| Code | HTTP | Khi nào |
|------|------|---------|
| `INVITATION_NOT_FOUND` | 404 | Không tồn tại |
| `INVITATION_ALREADY_RESPONDED` | 409 | Đã được phản hồi, không huỷ được |

---

## 5.12 POST /auth/logout

**[VI] Mô tả:** Đăng xuất — thu hồi refresh token.
**Auth required:** ✅ JWT

**Request Body:**
```json
{ "refresh_token": "eyJ..." }
```

**Response 200:**
```json
{ "data": { "message": "Logged out successfully" } }
```

---

# 6. BUSINESS LOGIC FLOWS

## 6.1 Phone Register / Login

**[VI] Mô tả:** Luồng đăng ký / đăng nhập bằng OTP. Tự động tạo tài khoản nếu chưa có.

```
POST /auth/phone/send-otp:
1. Validate phone format
2. Check user status (nếu tồn tại) → reject nếu BANNED
3. Generate OTP (DEV: 999999 | PROD: random 6 digits)
4. Save OTP + expiry (120s) vào Redis: key = otp:{phone}
5. Send OTP via SMS (DEV: skip)
6. Return { expires_in: 120 }

POST /auth/phone/verify-otp:
1. Validate phone + otp + device_hash
2. Lấy OTP từ Redis → kiểm tra tồn tại, chưa expired, đúng giá trị
3. Xóa OTP khỏi Redis
4. Tìm user theo phone:
   - Nếu chưa có → tạo user mới
   - Nếu có rồi → dùng user hiện tại
5. Nếu user mới → tạo PERSONAL workspace + gán role OWNER
6. Upsert user_devices (user_id + device_hash)
7. Xác định active workspace = PERSONAL workspace
8. Issue access_token + refresh_token
9. Lưu refresh_token hash vào DB
10. Return tokens + user info + workspace info
```

**Error paths:**
- OTP không tồn tại trong Redis → `OTP_INVALID`
- OTP sai → increment attempts, nếu >= 5 → `OTP_MAX_ATTEMPTS`
- OTP hết hạn → `OTP_EXPIRED`

---

## 6.2 Google OAuth Login

```
POST /auth/google:
1. Verify google_token với Google API
2. Extract { google_id, email, name } từ token
3. Tìm user theo google_id hoặc email:
   a. Tìm thấy → proceed
   b. Chưa có → tạo user mới (phone = null)
4. Nếu user.phone == null:
   → Return { status: 'PHONE_REQUIRED', temp_token }
   → Dừng lại, chờ frontend link số điện thoại
5. Nếu phone đã có → flow tiếp theo giống Phone Login (bước 5 trở đi)
```

---

## 6.3 Workspace Switch

```
POST /auth/switch-workspace:
1. Xác thực JWT hiện tại (JwtAuthGuard)
2. Validate workspace_id tồn tại
3. Kiểm tra membership: workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 1
4. Nếu không phải member → WORKSPACE_MEMBER_NOT_FOUND
5. Load role của user trong workspace này
6. Issue JWT mới với { workspaceId, role, workspaceType }
7. Return token mới + workspace info
```

---

## 6.4 Workspace Invitation — Gửi lời mời

**[VI] Mô tả:** OWNER/ADMIN mời user bằng số điện thoại vào workspace.

```
POST /workspaces/:workspaceId/invitations:
1. Xác thực JWT + kiểm tra requester có role OWNER hoặc ADMIN
2. Validate phone format
3. Tìm user theo phone → lấy invited_user_id (nullable nếu chưa đăng ký)
4. Kiểm tra user chưa là member: workspace_members WHERE workspace_id=? AND user_id=?
   → Nếu đã là member → MEMBER_ALREADY_EXISTS
5. Kiểm tra không có invitation pending:
   workspace_invitations WHERE workspace_id=? AND invited_phone=? AND status=0
   → Nếu có → INVITATION_ALREADY_PENDING
6. Validate role_code tồn tại trong bảng roles
7. Tạo WorkspaceInvitation record:
   - token = uuid()
   - expires_at = now() + 7 ngày
   - status = 0 (pending)
8. Gửi thông báo đến invited_phone (SMS hoặc in-app push nếu user đã có app)
9. Return invitation info
```

**Error paths:**
- Requester không phải OWNER/ADMIN → `FORBIDDEN`
- Phone đã có invitation pending → `INVITATION_ALREADY_PENDING`
- Phone user đã là member → `MEMBER_ALREADY_EXISTS`

---

## 6.5 Workspace Invitation — Accept / Decline

**[VI] Mô tả:** User phản hồi lời mời tham gia workspace.

```
POST /invitations/:token/accept:
1. Tìm invitation theo token → nếu không có → INVITATION_NOT_FOUND
2. Kiểm tra status = 0 (pending) → nếu != 0 → INVITATION_ALREADY_RESPONDED
3. Kiểm tra expires_at > now() → nếu hết hạn → INVITATION_EXPIRED
4. Kiểm tra invited_phone == req.user.phone → nếu không khớp → INVITATION_PHONE_MISMATCH
5. Tạo WorkspaceMember record:
   - workspace_id, user_id (req.user.userId), role_id từ invitation
   - status = 1 (active)
6. Cập nhật WorkspaceInvitation:
   - status = 1 (accepted)
   - responded_at = now()
   - invited_user_id = req.user.userId (nếu trước đó null)
7. Return workspace info + role

POST /invitations/:token/decline:
1-4. Giống accept
5. Cập nhật WorkspaceInvitation:
   - status = 2 (declined)
   - responded_at = now()
6. Return confirmation
```

---

## 6.6 Token Refresh

```
POST /auth/refresh:
1. Validate refresh_token format
2. Tìm refresh_token trong DB theo token_hash
3. Kiểm tra: tồn tại + chưa expired + chưa revoked
4. Kiểm tra device_hash khớp với device trong DB
5. Revoke refresh_token cũ
6. Issue access_token mới + refresh_token mới
7. Lưu refresh_token mới vào DB
8. Return tokens mới
```

---

# 7. JWT STRUCTURE

```json
{
  "sub": "user_id (uuid)",
  "workspaceId": "uuid",
  "role": "SALES",
  "workspaceType": "COMPANY",
  "deviceId": "uuid",
  "iat": 1700000000,
  "exp": 1700000900
}
```

Lifetimes:
- Access token: `15m`
- Refresh token: `7d`

---

# 8. API SECURITY

## 8.1 Device Binding
Token chứa `deviceId`. Mọi request đều kiểm tra `device_hash` của request khớp với device trong DB. Mismatch → reject 401.

## 8.2 API Signature (External Clients — Mobile/Web)

Headers bắt buộc:
```
x-timestamp: <unix_timestamp_ms>
x-signature: <hmac_sha256>
```

Cách tính signature:
```
HMAC_SHA256(
  method + "\n" + path + "\n" + body_json + "\n" + timestamp,
  API_CLIENT_SECRET
)
```

Reject nếu:
- `|now - timestamp| > 60000ms` → `SIGNATURE_EXPIRED`
- Signature không khớp → `SIGNATURE_INVALID`

## 8.3 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| POST /auth/phone/send-otp | 5 req/min/IP |
| POST /auth/phone/verify-otp | 5 attempts/OTP |
| Tất cả API authed | 120 req/min/user |

---

# 9. NESTJS MODULE STRUCTURE

```
src/modules/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      send-otp.dto.ts
      verify-otp.dto.ts
      google-auth.dto.ts
      switch-workspace.dto.ts
      refresh-token.dto.ts
    strategies/
      jwt.strategy.ts
      google.strategy.ts
    guards/
      jwt-auth.guard.ts
      workspace.guard.ts
      permission.guard.ts
    decorators/
      current-user.decorator.ts
      require-permission.decorator.ts
  workspace/
    workspace.module.ts
    workspace.controller.ts
    workspace.service.ts
    invitation.service.ts
    dto/
      invite-member.dto.ts
  user/
    user.module.ts
    user.service.ts
```

**Module dependencies:**
```typescript
// auth.module.ts
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({ ... }),
    CacheModule,         // Redis — cho OTP
    WorkspaceModule,
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, WorkspaceGuard, PermissionGuard],
  exports: [AuthService, JwtAuthGuard, WorkspaceGuard, PermissionGuard],
})
export class AuthModule {}
```

---

# 10. UNIT TEST CASES

File: `src/modules/auth/auth.service.spec.ts`

- [ ] ✅ `sendOtp`: Gửi OTP thành công → lưu vào Redis
- [ ] ✅ `verifyOtp`: OTP đúng, user chưa có → tạo user + personal workspace
- [ ] ✅ `verifyOtp`: OTP đúng, user đã có → login thành công
- [ ] ✅ `switchWorkspace`: Thành viên hợp lệ → trả JWT mới
- [ ] ✅ `refreshToken`: Refresh token hợp lệ → trả token mới
- [ ] ❌ `verifyOtp`: OTP sai → `OTP_INVALID`
- [ ] ❌ `verifyOtp`: OTP hết hạn → `OTP_EXPIRED`
- [ ] ❌ `switchWorkspace`: Không phải member → `WORKSPACE_MEMBER_NOT_FOUND`
- [ ] ❌ `refreshToken`: Refresh token đã revoke → `REFRESH_TOKEN_REVOKED`
- [ ] ❌ `refreshToken`: Device mismatch → `DEVICE_MISMATCH`
- [ ] ❌ Request thiếu signature → `SIGNATURE_INVALID`
- [ ] ✅ `sendInvitation`: OWNER gửi invite → tạo invitation record
- [ ] ✅ `acceptInvitation`: User accept → tạo workspace_member record
- [ ] ✅ `declineInvitation`: User decline → cập nhật status=2
- [ ] ❌ `sendInvitation`: Phone đã là member → `MEMBER_ALREADY_EXISTS`
- [ ] ❌ `sendInvitation`: Đã có invitation pending → `INVITATION_ALREADY_PENDING`
- [ ] ❌ `sendInvitation`: Role SALES gửi invite → `FORBIDDEN`
- [ ] ❌ `acceptInvitation`: Invitation hết hạn → `INVITATION_EXPIRED`
- [ ] ❌ `acceptInvitation`: Phone mismatch → `INVITATION_PHONE_MISMATCH`

---

# 11. ACCEPTANCE CRITERIA

✅ User đăng ký phone lần đầu → tự động có Personal Workspace
✅ User có thể join nhiều Company Workspace
✅ Switch workspace → JWT mới chứa đúng workspaceId + role
✅ Role thay đổi theo từng workspace
✅ Device mismatch → request bị reject
✅ API signature invalid/expired → request bị reject
✅ OTP hết hạn sau 120 giây
✅ Refresh token xoay vòng (rotate on use)
✅ OWNER/ADMIN gửi invitation đến số điện thoại bất kỳ
✅ User nhận và thấy danh sách invitations pending
✅ Accept invitation → tự động trở thành member với đúng role
✅ Decline invitation → không ảnh hưởng gì
✅ Invitation hết hạn sau 7 ngày
✅ Không thể accept invitation bằng tài khoản khác phone
✅ Tất cả unit test pass

---

# 12. SCALE EXPECTATION

| Metric | Target |
|--------|--------|
| Users | 100k+ |
| Concurrent users | 5k |
| Workspaces | 20k+ |
| API latency p95 | < 150ms |
| Auth latency p95 | < 200ms |

---

# 13. CI/CD REQUIREMENT

```
PR → Unit Test → Build Docker → Push Registry → Deploy Staging → Health Check → Production Rolling Deploy
```

Rollback:
- Revert to previous Docker image tag
- Git tag restore

---

# 14. IMPLEMENTATION NOTES

- **Personal Workspace naming:** Dùng số điện thoại hoặc email làm tên mặc định, user có thể đổi sau
- **OTP Storage:** Lưu trong Redis với TTL=120s, key = `otp:{phone}`, value = `{ code, attempts }`
- **Refresh token rotation:** Mỗi lần refresh → revoke token cũ, issue token mới. Implement sliding window.
- **Google + Phone linking:** Nếu email trùng với user đã đăng ký bằng phone → merge account, không tạo mới
- **Invitation expiry job:** Cần cron job (hoặc check on-demand) để expire invitation quá 7 ngày. Set `status=3`.
- **Invitation + unregistered user:** Nếu invited_phone chưa có tài khoản → sau khi đăng ký bằng số đó, hệ thống tự link `invited_user_id` và hiện invitation pending.
- **Microservice context:** MVP-01 thuộc **auth-service**. Xem CLAUDE.md — System Architecture để biết service split rules.
- **File upload:** MVP này không có file upload. Xem CLAUDE.md — File Upload MinIO cho kiến trúc upload.
- **Frontend quality:** Trang login/auth phải đạt Lighthouse Performance ≥ 95, SEO ≥ 95. Xem CLAUDE.md — Frontend Quality Standards.
- **Out of scope (MVP này):** Tạo Company Workspace (user tự tạo), quản lý member sau khi join — thuộc MVP sau

---

# END MVP-01

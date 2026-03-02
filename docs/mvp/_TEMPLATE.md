# MVP-XX: [Tên Chức Năng / Feature Name]

Project: PropCart CRM SaaS
Version: 1.0.0
Module: [tên-module]
Depends on: [MVP-01, MVP-0X, ...]
Status: DRAFT | READY | IN_PROGRESS | DONE

---

# 1. MỤC TIÊU / OBJECTIVE

[VI] Mô tả ngắn gọn chức năng này làm gì, phục vụ ai, giải quyết bài toán gì.

[EN] Brief description: what this feature does, who it serves, what problem it solves.

---

# 2. CORE CONCEPT

[VI] Giải thích logic nghiệp vụ cốt lõi. Claude cần hiểu rõ phần này để implement đúng.

[EN] Explain the core business logic. Claude must understand this before implementing.

Key rules:
- Rule 1
- Rule 2
- Rule 3

---

# 3. DATABASE SCHEMA

> Xem thêm CLAUDE.md — Database Rules

## 3.1 [table_name] — [Mô tả bảng]

| column | type | constraint | description |
|--------|------|------------|-------------|
| id | uuid | PK NOT NULL | Primary key |
| workspace_id | uuid | FK NOT NULL | Tenant isolation |
| [field] | [type] | [constraint] | [Mô tả] |
| status | smallint | NOT NULL DEFAULT 1 | 1=active, 0=inactive |
| created_at | timestamp | NOT NULL DEFAULT now() | |
| updated_at | timestamp | NOT NULL | |

Indexes:
- `idx_[table]_workspace` → (workspace_id)
- `idx_[table]_workspace_id` → (workspace_id, id)
- `idx_[table]_[field]` → ([field]) — nếu cần lookup theo field

Foreign keys:
- `workspace_id` → `workspaces.id`
- `[other_id]` → `[other_table].id`

---

## 3.2 [table_name_2] — (nếu có)

...

---

# 4. PRISMA SCHEMA

```prisma
model [ModelName] {
  id          String   @id @default(uuid())
  workspaceId String
  // --- fields ---
  status      Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // --- relations ---
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
  @@index([workspaceId, id])
  @@map("[table_name]")
}
```

---

# 5. API ENDPOINTS

## 5.1 [METHOD] [/path/to/endpoint]

**[VI] Mô tả:** Chức năng của endpoint này.
**[EN] Description:** What this endpoint does.

**Auth required:** ✅ JWT + Workspace
**Permission:** `[PERMISSION_CODE]` | ❌ Public

---

**Request Headers:**
```
Authorization: Bearer <access_token>
x-timestamp: <unix_timestamp>
x-signature: <hmac_sha256>
```

**Request Body:**
```json
{
  "field1": "string",
  "field2": 123
}
```

**Request DTO:**
```typescript
export class [ActionEntity]Dto {
  @IsString()
  @IsNotEmpty()
  field1: string;

  @IsNumber()
  @Min(0)
  field2: number;
}
```

**Response 200/201:**
```json
{
  "data": {
    "id": "uuid",
    "field1": "value"
  }
}
```

**Error Codes:**

| Code | HTTP Status | Khi nào xảy ra |
|------|-------------|----------------|
| `[ENTITY]_NOT_FOUND` | 404 | Không tìm thấy resource |
| `[ENTITY]_ALREADY_EXISTS` | 409 | Đã tồn tại |
| `VALIDATION_ERROR` | 422 | Input không hợp lệ |
| `UNAUTHORIZED` | 401 | JWT không hợp lệ |
| `FORBIDDEN` | 403 | Không có quyền |

---

## 5.2 [METHOD] [/path/to/endpoint-2]

[Lặp lại pattern trên cho mỗi endpoint]

---

# 6. BUSINESS LOGIC FLOWS

## 6.1 [Tên Flow]

**[VI] Mô tả:** Luồng xử lý chính khi [user action].

```
1. Validate input DTO
2. [Bước xử lý 2]
3. [Bước xử lý 3]
4. [Bước xử lý 4]
5. Return response
```

**Error paths:**
- Nếu [điều kiện] → throw `[ERROR_CODE]` (HTTP 4XX)
- Nếu [điều kiện] → throw `[ERROR_CODE]` (HTTP 4XX)

---

## 6.2 [Tên Flow 2]

...

---

# 7. NESTJS MODULE STRUCTURE

```
src/modules/[module-name]/
  [module-name].module.ts
  [module-name].controller.ts
  [module-name].service.ts
  [module-name].repository.ts      ← optional, nếu query phức tạp
  dto/
    create-[entity].dto.ts
    update-[entity].dto.ts
    [action]-[entity].dto.ts
  entities/
    [entity].entity.ts             ← Prisma type alias / response type
  guards/
    [specific-guard].guard.ts      ← nếu có guard riêng
  interfaces/
    [entity].interface.ts          ← nếu cần
```

**Module dependencies:**
```typescript
@Module({
  imports: [
    PrismaModule,
    // JwtModule, CacheModule, ... (liệt kê dependencies)
  ],
  controllers: [[ModuleName]Controller],
  providers: [[ModuleName]Service],
  exports: [[ModuleName]Service],  // nếu module khác cần dùng
})
export class [ModuleName]Module {}
```

---

# 8. UNIT TEST CASES

Phải tự chạy được trong CI. File: `[module-name].service.spec.ts`

- [ ] ✅ [Happy path - case thành công chính]
- [ ] ✅ [Happy path - case thành công phụ]
- [ ] ❌ [Fail - invalid input]
- [ ] ❌ [Fail - resource not found]
- [ ] ❌ [Fail - unauthorized / no permission]
- [ ] ❌ [Fail - conflict / already exists]
- [ ] ⚠️ [Edge case]

---

# 9. ACCEPTANCE CRITERIA

✅ [Tiêu chí 1 — có thể test được]
✅ [Tiêu chí 2 — có thể test được]
✅ [Tiêu chí 3 — có thể test được]

---

# 10. IMPLEMENTATION NOTES

[Ghi chú đặc biệt để Claude implement đúng. Phần này quan trọng nếu logic không hiển nhiên.]

- **[Lưu ý 1]:** Giải thích lý do / cách làm
- **[Lưu ý 2]:** Giải thích lý do / cách làm
- **Out of scope:** Những gì KHÔNG làm trong MVP này

---

# END MVP-XX

# MinIO Workspace-Scoped Storage Implementation

## Overview

PropCart CRM sử dụng MinIO (S3-compatible) để lưu trữ file với **workspace-scoped** isolation và **functional grouping**. Mỗi workspace được cách biệt hoàn toàn trong MinIO, giúp tăng cường bảo mật và dễ quản lý.

## Bucket Structure

```
Bucket: propcart-crm
├── {workspace_id}/                                    ← Tất cả file của workspace này
│   ├── documents/
│   │   ├── profile/{userId}/{date}/{uuid}.{ext}      ← User profile documents
│   │   └── members/{date}/{uuid}.{ext}               ← Member profile documents
│   ├── avatars/{userId}/{date}/{uuid}.{ext}          ← User avatars
│   ├── properties/{date}/{uuid}.{ext}                ← Property images
│   └── temp/{uuid}.{ext}                             ← Temporary files (TTL 24h)
└── documents/users/{userId}/{date}/{uuid}.{ext}      ← Legacy path (backward compat)
```

## Functional Groups

### 1. **documents/profile** - User Profile Documents
- **Purpose**: Tài liệu cá nhân của user (CCCD, hợp đồng lao động, chứng chỉ, etc)
- **Scope**: User + Workspace
- **Path**: `{workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}`
- **Method**: `uploadUserDocument(userId, file, workspaceId)`
- **API**: `POST /me/profile/documents`

### 2. **documents/members** - Member Workspace Documents
- **Purpose**: Tài liệu riêng của member trong workspace (khác với user profile)
- **Scope**: Workspace-only (không liên kết với user)
- **Path**: `{workspace_id}/documents/members/{date}/{uuid}.{ext}`
- **Method**: `uploadMemberDocument(workspaceId, file)`
- **API**: `POST /workspaces/{workspaceId}/members/{memberId}/documents`

### 3. **avatars** - User Avatars
- **Purpose**: Ảnh đại diện của user trong workspace
- **Scope**: User + Workspace
- **Path**: `{workspace_id}/avatars/{userId}/{date}/{uuid}.{ext}`
- **Method**: `uploadAvatar(workspaceId, userId, file)`
- **API**: `POST /me/avatar` (với workspaceId từ context)

### 4. **properties** - Property Images
- **Purpose**: Ảnh bất động sản, danh sách ảnh dự án
- **Scope**: Workspace-only
- **Path**: `{workspace_id}/properties/{date}/{uuid}.{ext}`
- **Method**: `uploadPropertyImage(workspaceId, file)`
- **API**: `POST /properties/{propertyId}/images`

### 5. **temp** - Temporary Files
- **Purpose**: File tạm thời (upload nhưng chưa confirm, draft, etc)
- **Scope**: Workspace-only
- **TTL**: 24 giờ (auto-delete)
- **Path**: `{workspace_id}/temp/{uuid}.{ext}`
- **Method**: `uploadTemporaryFile(workspaceId, file)`

## Implementation Details

### Backend - MinIO Service

File: `src/common/storage/minio.service.ts`

```typescript
// User Profile Document (with workspace)
async uploadUserDocument(userId: string, file: UploadFile, workspaceId?: string) {
  // Production: {workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}
  // Legacy: documents/users/{userId}/{date}/{uuid}.{ext}
}

// Member Document
async uploadMemberDocument(workspaceId: string, file: UploadFile)
// Path: {workspace_id}/documents/members/{date}/{uuid}.{ext}

// Avatar
async uploadAvatar(workspaceId: string, userId: string, file: UploadFile)
// Path: {workspace_id}/avatars/{userId}/{date}/{uuid}.{ext}

// Property Image
async uploadPropertyImage(workspaceId: string, file: UploadFile)
// Path: {workspace_id}/properties/{date}/{uuid}.{ext}

// Temporary File
async uploadTemporaryFile(workspaceId: string, file: UploadFile)
// Path: {workspace_id}/temp/{uuid}.{ext}
```

### Backend Integration Points

**User Service** (`src/modules/user/user.service.ts`):
```typescript
async uploadDocument(userId: string, workspaceId: string, documentType, file) {
  const uploaded = await this.minioService.uploadUserDocument(userId, file, workspaceId);
  // Save metadata to DB with workspaceId
}
```

**Workspace Service** (TODO):
```typescript
async uploadMemberDocument(workspaceId: string, memberId: string, file) {
  const uploaded = await this.minioService.uploadMemberDocument(workspaceId, file);
  // Associate with member
}
```

## Security Considerations

### ✅ Workspace Isolation
- Mỗi workspace lưu trữ trong folder riêng `{workspace_id}/`
- Không bao giờ có cross-workspace access
- Query bắt buộc filter `WHERE workspace_id = ?`

### ✅ Access Control
- Frontend xem file → Backend validate ownership
- Download URL → cần auth token
- Public URL → chỉ user/admin của workspace đó

### ✅ Legacy Compatibility
- Old path `documents/users/{userId}/...` vẫn hỗ trợ
- Migration không bắt buộc (các file cũ vẫn work)
- Các file mới sẽ tự động dùng workspace-scoped path

## Migration Strategy

### For Existing Databases
```sql
-- No migration needed for DB schema
-- File path format change là transparent
-- Old paths vẫn access được via legacy method
```

### For Existing Files
```
OLD: documents/users/userId-123/2026-03-01/file.pdf
NEW: workspace-abc/documents/profile/userId-123/2026-03-01/file.pdf
```

```sql
UPDATE user_documents 
SET object_key = CONCAT('workspace-id/', object_key)
WHERE object_key LIKE 'documents/users/%'
AND workspace_id IS NOT NULL;
```

## File URL Examples

```
Profile Document:
https://minio.propcart.vn/propcart-crm/workspace-123/documents/profile/user-456/2026-03-06/abc-def-123.pdf

Member Document:
https://minio.propcart.vn/propcart-crm/workspace-123/documents/members/2026-03-06/xyz-789.pdf

Avatar:
https://minio.propcart.vn/propcart-crm/workspace-123/avatars/user-456/2026-03-06/avatar-def.jpg

Property Image:
https://minio.propcart.vn/propcart-crm/workspace-123/properties/2026-03-06/property-img.jpg
```

## Best Practices

### 1. **Always Pass workspaceId**
```typescript
// ✅ GOOD
const result = await minioService.uploadUserDocument(userId, file, workspaceId);

// ❌ BAD - confuses with legacy path
const result = await minioService.uploadUserDocument(userId, file);
```

### 2. **Validate Workspace Owner Before Upload**
```typescript
async uploadDocument(userId: string, workspaceId: string, file: UploadFile) {
  // Verify user is member of workspace
  const member = await this.workspaceService.validateMember(userId, workspaceId);
  if (!member) throw ForbiddenException();
  
  return this.minioService.uploadUserDocument(userId, file, workspaceId);
}
```

### 3. **Always Use Appropriate Method**
```typescript
// For user profile docs
minioService.uploadUserDocument(userId, file, workspaceId)

// For member-specific docs
minioService.uploadMemberDocument(workspaceId, file)

// For avatars
minioService.uploadAvatar(workspaceId, userId, file)

// For property images
minioService.uploadPropertyImage(workspaceId, file)

// For temporary/draft files
minioService.uploadTemporaryFile(workspaceId, file)
```

### 4. **Cleanup Temporary Files**
```typescript
// Cron job or scheduled task
async cleanupOldTempFiles(workspaceId: string, olderThanHours = 24) {
  const tempFolder = `${workspaceId}/temp/`;
  // List all files in temp folder
  // Delete files older than 24h
}
```

## Environment Configuration

```env
# MinIO Endpoints
MINIO_ENDPOINT=minio.propcart.vn
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=true
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=https://minio.propcart.vn
```

## Testing Checklist

- [ ] Upload user profile document → verify path contains `{workspace_id}/documents/profile/{userId}/...`
- [ ] Upload member document → verify path contains `{workspace_id}/documents/members/...`
- [ ] Upload avatar → verify path contains `{workspace_id}/avatars/{userId}/...`
- [ ] List files from workspace A → should not see files from workspace B
- [ ] Delete workspace → verify all files in `{workspace_id}/` folder are removed
- [ ] Legacy files still accessible → old paths still work
- [ ] Cross-workspace query blocked → cannot access files from other workspace

## Future Enhancements

1. **Lifecycle Policies**: Auto-delete temp files after 24h via MinIO lifecycle rules
2. **Replication**: Mirror workspace folders across regions for disaster recovery
3. **Versioning**: Keep file versions for audit trail
4. **Encryption**: Server-side encryption per workspace
5. **Pricing Tiers**: Track storage per workspace for billing

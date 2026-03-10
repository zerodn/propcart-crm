# Quản lý File Tạm và Cleanup Tự động

## Tổng quan

Hệ thống đã được cấu hình để quản lý file upload tạm thời và tự động dọn dẹp các file không được sử dụng.

## Vấn đề đã giải quyết

**Trước đây:**
- Khi user upload file trong form Product, file được upload ngay lập tức vào thư mục `{workspace_id}/properties/`
- Nếu user cancel form hoặc không nhấn "Tạo mới", file vẫn tồn tại trên server → **rác file**
- Không có cơ chế tự động dọn dẹp → lãng phí storage

**Giải pháp:**
- File upload vào thư mục tạm: `{workspace_id}/temp/{uuid}.{ext}`
- Cronjob tự động xóa file temp > 24h mỗi ngày lúc 3:00 AM
- Khi user thực sự tạo/cập nhật product, file vẫn giữ trong temp (reference qua URL)

---

## Cấu trúc MinIO Storage

### Workspace-Scoped Temp Folder

```
propcart-crm/
├── {workspace_id}/
│   ├── temp/
│   │   └── {uuid}.{ext}           ← File tạm (TTL 24h, auto cleanup)
│   ├── properties/{date}/{uuid}.{ext}  ← File chính thức (không dùng cho product upload nữa)
│   └── documents/...
```

---

## Flow Upload File

### 1. User chọn file trong Product Form

```typescript
// Frontend: product-form.tsx
const handleDocumentUpload = async (files: FileList | null) => {
  // Upload NGAY LẬP TỨC (chưa submit form)
  const uploaded = await onUploadFiles(Array.from(files));
  
  // Lưu vào state local
  setProductDocuments(prev => [...prev, ...uploaded]);
};
```

### 2. Backend upload vào temp folder

```typescript
// Backend: product.service.ts
async uploadFiles(workspaceId: string, files: Express.Multer.File[]) {
  // Upload vào thư mục TEMP thay vì properties
  const uploaded = await Promise.all(
    files.map((file) => this.minioService.uploadTemporaryFile(workspaceId, file)),
  );
  
  return uploaded; // { fileName, fileUrl, objectKey }
}
```

### 3. User submit form → Lưu product với file URL

```typescript
// product.service.ts
async create(workspaceId: string, dto: CreateProductDto) {
  // productDocuments chứa URL từ temp folder
  const product = await this.prisma.propertyProduct.create({
    data: {
      ...dto,
      productDocuments: dto.productDocuments, // File URLs từ temp
    }
  });
}
```

**Lưu ý:** File vẫn nằm trong `/temp/`, nhưng được reference trong database. File sẽ tồn tại ít nhất 24h kể từ lúc upload.

---

## Cleanup Scheduler

### Cron Job tự động

**File:** `src/modules/cleanup/cleanup.service.ts`

```typescript
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async handleTempFileCleanup() {
  // Xóa file temp > 24h30m (24h + 30min buffer)
  // Buffer 30 phút để tránh xóa nhầm file đang được upload khi cron chạy
  const result = await this.minioService.cleanupTempFiles(24, 30);
}
```

**Thời gian chạy:** Mỗi ngày 3:00 AM  
**TTL:** 24 giờ + 30 phút buffer = **24h30m**  
**Buffer rationale:** Tránh race condition khi file đang upload đúng lúc cron chạy

### Logic Cleanup

```typescript
// minio.service.ts
async cleanupTempFiles(olderThanHours: number = 24, bufferMinutes: number = 30) {
  // Calculate cutoff time with buffer
  const totalMinutes = (olderThanHours * 60) + bufferMinutes;
  const cutoffTime = new Date(now.getTime() - totalMinutes * 60 * 1000);
  
  // Only delete files with lastModified < cutoffTime
  // Example: File upload at 3:05 AM, cron runs at 3:00 AM next day
  // → File age = 23h55m < 24h30m → SAFE, not deleted
}
```

**Safety margin:**
- File có thể tồn tại tối đa: **24h 30m**
- Buffer 30 phút bảo vệ khỏi race condition
- Upload đúng lúc cron chạy → file vẫn an toàn
```

---

## API Cleanup thủ công (Optional)

Nếu cần test hoặc run manual cleanup, có thể expose API:

### Tạo Controller (Optional)

```typescript
// cleanup.controller.ts
import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CleanupService } from './cleanup.service';

@Controller('admin/cleanup')
@UseGuards(JwtAuthGuard)
export class CleanupController {
  constructor(private readonly cleanupService: CleanupService) {}

  @Post('temp-files')
  @Roles('OWNER', 'ADMIN') // Chỉ admin mới được chạy
  async cleanupTempFiles(
    @Query('hours') hours?: string,
    @Query('buffer') buffer?: string,
  ) {
    const olderThanHours = hours ? parseInt(hours, 10) : 24;
    const bufferMinutes = buffer ? parseInt(buffer, 10) : 30;
    return await this.cleanupService.manualCleanup(olderThanHours, bufferMinutes);
  }
}
```

**Endpoint:** `POST /admin/cleanup/temp-files?hours=24&buffer=30`

---

## MinIO Methods mới

### 1. `listObjectsByPrefix(prefix: string)`

Liệt kê tất cả object với prefix cụ thể:

```typescript
const files = await minioService.listObjectsByPrefix('temp/');
// Returns: [{ key, lastModified, size }, ...]
```

### 2. `cleanupTempFiles(olderThanHours: number, bufferMinutes: number)`

Xóa file temp cũ hơn X giờ (+ buffer Y phút):

```typescript
// Xóa file > 24h30m (default)
const result = await minioService.cleanupTempFiles(24, 30);
// Returns: { deleted: 150, errors: 2 }

// Custom: xóa file > 12h15m
const result = await minioService.cleanupTempFiles(12, 15);
```

**Parameters:**
- `olderThanHours` (default: 24) - Giờ tối thiểu
- `bufferMinutes` (default: 30) - Phút buffer để tránh xóa nhầm file đang upload

---

## Cấu hình

### Environment Variables

```env
# MinIO Configuration (hiện tại)
MINIO_ENDPOINT=minio.propcart.vn
MINIO_PORT=9000
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=true
```

### Cron Schedule

Mặc định: `EVERY_DAY_AT_3AM`

Có thể thay đổi trong `cleanup.service.ts`:

```typescript
@Cron(CronExpression.EVERY_12_HOURS)  // Chạy 2 lần/ngày
@Cron('0 */6 * * *')                  // Chạy mỗi 6 giờ
@Cron('0 0 * * 0')                    // Chạy mỗi Chủ nhật 12:00 AM
```

---

## Testing

### 1. Test Upload vào Temp

```bash
# Upload file qua product API
curl -X POST http://localhost:3000/workspaces/{wsId}/products/upload-files \
  -F "files=@test.pdf" \
  -H "Authorization: Bearer {token}"

# Check MinIO: file nằm trong {workspace_id}/temp/
```

### 2. Test Cleanup Manual

Nếu đã tạo API cleanup:

```bash
# Default: 24h + 30min buffer
curl -X POST http://localhost:3000/admin/cleanup/temp-files \
  -H "Authorization: Bearer {admin_token}"
  
# Custom: 1h + 15min buffer
curl -X POST "http://localhost:3000/admin/cleanup/temp-files?hours=1&buffer=15" \
  -H "Authorization: Bearer {admin_token}"
  
# Response: { "deleted": 5, "errors": 0 }
```

### 3. Test Cron Job

```typescript
// Trong cleanup.service.ts, thêm logging:
@Cron(CronExpression.EVERY_MINUTE) // Test mỗi phút
async handleTempFileCleanup() {
  console.log('🧹 Running cleanup...');
  // Test với file > 36 seconds + 30 seconds buffer = 1m06s
  const result = await this.minioService.cleanupTempFiles(0.01, 0.5);
  console.log('✅ Cleanup done:', result);
}
```

**Production setting:**
```typescript
// 24 giờ + 30 phút buffer
await this.minioService.cleanupTempFiles(24, 30);
```

---

## Logs

### Khi chạy cleanup

```
[CleanupService] Starting scheduled temp file cleanup...
[MinioService] Starting cleanup of temp files older than 24 hours (+ 30 min buffer)...
[MinioService] Deleted temp file: abc-123/temp/uuid-1.pdf
[MinioService] Deleted temp file: abc-123/temp/uuid-2.jpg
[MinioService] Cleanup completed: 2 files deleted, 0 errors
[CleanupService] Temp file cleanup completed: 2 files deleted, 0 errors
```

### Khi có lỗi

```
[MinioService] Failed to delete temp file: abc-123/temp/uuid-3.pdf { error details }
[MinioService] Cleanup completed: 2 files deleted, 1 errors
```

---

## Migration Notes

### Files đã upload trước đây

File cũ vẫn nằm trong `{workspace_id}/properties/` → **không bị ảnh hưởng**

Chỉ file mới (sau khi deploy code này) mới vào `/temp/`

### Nếu muốn migrate old files

Tùy chọn:
1. Giữ nguyên (backward compatible)
2. Viết script migrate từ `properties/` → `temp/` (nếu cần)
3. Update database URLs (nếu có)

---

## Monitoring

### Metrics cần theo dõi

1. **Số file bị cleanup mỗi ngày**: `deleted` count
2. **Số file lỗi khi cleanup**: `errors` count
3. **Storage usage** trong `/temp/` folder
4. **Cleanup duration**: time taken per run

### Alert triggers

- Nếu `errors > 10` trong 1 lần chạy → check MinIO connection
- Nếu `deleted > 1000` → có thể có vấn đề với flow submit form
- Nếu cleanup fails liên tục → check MinIO service health

---

## Best Practices

### 1. TTL hợp lý
- **24h + 30min buffer** là đủ cho user hoàn thành form
- Buffer 30 phút tránh race condition khi upload đúng lúc cron chạy
- Không set quá ngắn (< 1h) → user chưa kịp submit
- Không set quá dài (> 7 days) → tốn storage

### 2. Buffer time strategy
- **30 phút** (default) - Đủ cho hầu hết trường hợp upload
- Tăng lên **60 phút** nếu có nhiều file lớn (> 100MB)
- Giảm xuống **15 phút** nếu muốn cleanup nhanh hơn
- **Luôn có buffer** - KHÔNG BAO GIỜ set buffer = 0

### 2. Cleanup timing
- Chạy vào giờ thấp điểm (3 AM)
- Tránh chạy giờ cao điểm (8 AM - 5 PM)
- Buffer time bảo vệ upload concurrent với cron

### 3. Error handling
- Log rõ ràng từng file failed
- Không throw exception (để cleanup tiếp tục)
- Return statistics để monitor

### 4. Production considerations
- Test kỹ trước khi deploy
- Monitor storage usage
- Backup quan trọng trước khi cleanup
- Set retention policy cho MinIO bucket

---

## Troubleshooting

### File bị xóa quá sớm?

- Check TTL config: `cleanupTempFiles(24, 30)` → tăng lên
- Check buffer time: 30 phút có đủ không? → tăng thêm
- Check system clock: timezone sai → file bị xóa nhầm

### File đang upload bị xóa khi cron chạy?

- **KHÔNG THỂ XẢY RA** nếu có buffer time
- File mới upload: `lastModified = now` → age = 0 < 24h30m → KHÔNG xóa
- Verify buffer setting: phải > 0 (default 30 phút)
- Nếu vẫn xảy ra: tăng buffer lên 60 phút

### Cleanup không chạy?

- Check ScheduleModule đã import trong AppModule chưa
- Check cron expression syntax
- Check logs: có error trong cleanup không?

### MinIO listObjects trả về rỗng?

- Check bucket name
- Check prefix path: `temp/` vs `*/temp/`
- Check MinIO permissions

---

## Kết luận

✅ **Đã giải quyết:**
- File upload tạm thời vào `/temp/`
- Cleanup tự động mỗi ngày với buffer 30 phút
- Không còn rác file khi user cancel form
- **Race condition protected** - không xóa nhầm file đang upload

✅ **Modules mới:**
- `CleanupModule` + `CleanupService`
- MinIO methods: `listObjectsByPrefix()`, `cleanupTempFiles(hours, buffer)`

✅ **Thay đổi:**
- `product.service.ts`: `uploadPropertyImage` → `uploadTemporaryFile`
- `app.module.ts`: thêm `ScheduleModule` + `CleanupModule`
- **Buffer time 30 phút** để bảo vệ upload concurrent

✅ **Safety features:**
- TTL: 24h + 30min buffer = 24h30m
- File mới upload KHÔNG BAO GIỞ bị xóa khi cron chạy
- Configurable buffer time (default 30min, có thể tăng/giảm)

---

## Files đã sửa/tạo

1. ✅ `src/common/storage/minio.service.ts` - Added cleanup methods
2. ✅ `src/modules/product/product.service.ts` - Changed to temp upload
3. ✅ `src/modules/cleanup/cleanup.service.ts` - Created cron job
4. ✅ `src/modules/cleanup/cleanup.module.ts` - Created module
5. ✅ `src/app.module.ts` - Registered ScheduleModule + CleanupModule

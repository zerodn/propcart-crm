# Migration Guide: SQLite → MariaDB + Elasticsearch + MinIO

## 📊 Tóm Tắt Thay Đổi

| Thành Phần | Cũ | Mới | Lý Do |
|-----------|-----|-----|-------|
| **Database** | SQLite (dev.db) | MariaDB 11 | Production-ready, scaling tốt hơn |
| **Full-text Search** | None/Elasticsearch | Elasticsearch 8.13 | Search performance, Vietnamese analyzer |
| **File Storage** | None | MinIO (S3-compatible) | Self-hosted, CDN-ready |
| **Connection String** | `file:./prisma/dev.db` | `mysql://propcart:...@localhost:3306/propcart_crm` | Standard DB connection |

---

## 🚀 Quy Trình Migration (Step-by-Step)

### Giai Đoạn 1: Chuẩn Bị (15 phút)

#### 1.1 Backup Dữ Liệu SQLite
```bash
# Backup database cũ
cp prisma/dev.db prisma/dev.db.backup

# Export data to SQL file (optional)
sqlite3 prisma/dev.db ".dump" > backup.sql
```

#### 1.2 Cập Nhật Code

```bash
cd /Users/macbook/Documents/DuAn/Resdii/Source/PropCartCRM

# Stash changes nếu có
git add .
git commit -m "Backup before migration to MariaDB"

# Pull updates
git pull origin main  # hoặc branch hiện tại
```

#### 1.3 Cải Tổ Environment Variables
```bash
# Update .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000

# MariaDB (Mới)
DATABASE_URL=mysql://propcart:propcart_local@localhost:3306/propcart_crm?charset=utf8mb4

# JWT
JWT_ACCESS_SECRET=propcart_dev_access_secret_at_least_32_chars_long_1234567890
JWT_REFRESH_SECRET=propcart_dev_refresh_secret_at_least_32_chars_long_1234567890
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_TEMP_EXPIRES=10m

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_SCHEME=http
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# API Security
API_CLIENT_SECRET=propcart_dev_api_secret_at_least_32_chars_long_123456

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin_local
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=false
MINIO_REGION=us-east-1

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
EOF
```

---

### Giai Đoạn 2: Cập Nhật Dependencies (5 phút)

```bash
# Cài dependencies
npm install

# Tạo mới Prisma client cho MySQL
npx prisma generate
```

---

### Giai Đoạn 3: Khởi Động Infrastructure (10 phút)

#### 3.1 Start Docker Services
```bash
# Đảm bảo không có process cũ
docker-compose down -v 2>/dev/null || true
sleep 2

# Khởi động Docker
docker-compose up -d

# Chờ services ready
sleep 10

# Kiểm tra health
docker-compose ps

# Output expected:
# CONTAINER ID   IMAGE                                           STATUS              PORTS
# xxx            mariadb:11.0                                    Up (healthy)        0.0.0.0:3306->3306/tcp
# yyy            redis:7-alpine                                  Up (healthy)        0.0.0.0:6379->6379/tcp
# zzz            docker.elastic.co/elasticsearch/elasticsearch   Up (healthy)        0.0.0.0:9200->9200/tcp
# aaa            minio/minio:latest                              Up (healthy)        0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
```

#### 3.2 Kiểm Tra Kết Nối Database
```bash
# Test MariaDB connection
mysql -h localhost -u propcart -ppropcart_local -D propcart_crm \
  -e "SELECT VERSION();" 2>&1 || echo "❌ MariaDB not ready yet"

# Wait and retry if needed
sleep 5
mysql -h localhost -u propcart -ppropcart_local -D propcart_crm \
  -e "SELECT VERSION();"

# Expected output: version number like "11.0.1-MariaDB"
```

---

### Giai Đoạn 4: Prisma Migration (5 phút)

#### 4.1 Tạo/Apply Migration
```bash
# Option A: Fresh setup (nếu không cần giữ dữ liệu cũ)
npx prisma migrate reset --force

# Output: ✅ Reset successful

# Option B: Đẩy schema mà không khởi tạo lại (nếu có dữ liệu)
npx prisma db push
```

#### 4.2 Generate Prisma Client
```bash
npx prisma generate
```

#### 4.3 Kiểm Tra Schema
```bash
# Open Prisma Studio to verify
npm run prisma:studio

# Mở browser: http://localhost:5555
# Verify: Tất cả bảng đã được tạo
# - users, workspaces, workspace_members
# - roles, permissions, catalogs
# - departments, notifications, etc.
```

---

### Giai Đoạn 5: Seeding & Initial Data (5 phút)

#### 5.1 Seed Database
```bash
# Chạy seed script
npm run prisma:seed

# Output:
# 🌱 Seeding database...
# ✅ Seeded 5 roles
# ✅ Seeded 9 permissions
# ✅ Assigned permissions to OWNER and ADMIN roles
# ✅ Catalog templates ready for auto-initialization
# ✅ Seeding complete!
```

#### 5.2 Verify Seed Data
```bash
# Check roles
mysql -h localhost -u propcart -ppropcart_local propcart_crm \
  -e "SELECT code, name FROM roles LIMIT 5;"

# Expected:
# | code    | name       |
# | OWNER   | Owner      |
# | ADMIN   | Admin      |
# | MANAGER | Manager    |
# | SALES   | Sales      |
# | PARTNER | Partner    |
```

---

### Giai Đoạn 6: Khởi Động Development Servers (5 phút)

#### 6.1 Terminal 1: Backend
```bash
npm run start:dev

# Expected output:
# [9:21:23 AM] Starting incremental compilation...
# [9:21:24 AM] Found 0 errors. Watching for file changes.
# [Nest] 3667  - 03/05/2026, 9:21:23 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 3667  - 03/05/2026, 9:21:23 AM   LOG [NestApplication] Nest application successfully started
# 🚀 PropCart CRM API running on http://localhost:3000
```

#### 6.2 Terminal 2: Frontend
```bash
cd apps/web
npm run dev

# Expected output:
# ▲ Next.js 14.2.0
# - ready started server on 0.0.0.0:3001, url: http://localhost:3001
# ✓ Ready in 3s
```

---

### Giai Đoạn 7: Verification (10 phút)

#### 7.1 Test Backend Health
```bash
# Test API response format
curl -s http://localhost:3000/auth/workspaces \
  -H "Authorization: Bearer invalid_token" | jq .

# Should get: { "code": "UNAUTHORIZED", ... }
```

#### 7.2 Test Frontend Access
```bash
# Open browser
open http://localhost:3001/login

# Expected: Login page loads
```

#### 7.3 Test Database Connection
```bash
# Run test suite
npm run test 2>&1 | head -30

# Expected: Tests should pass (or fail gracefully)
```

#### 7.4 Test MinIO Access
```bash
# Open MinIO Admin Console
open http://localhost:9001

# Login: minioadmin / minioadmin_local
# Create bucket: propcart-crm
```

#### 7.5 Test Elasticsearch
```bash
# Check cluster health
curl -s http://localhost:9200/_cluster/health | jq .

# Expected: { "status": "yellow" or "green", "number_of_nodes": 1 }
```

---

## 📝 Migration từ SQLite sang MariaDB (Nếu Có Dữ Liệu Cũ)

### Cách 1: Dùng Prisma (Khuyên Dùng)

```bash
# Prisma sẽ handle schema migration tự động
npx prisma migrate deploy

# Nếu có custom migrations cũ, review và adapt
```

### Cách 2: Manual Export/Import

```bash
# 1. Export từ SQLite
sqlite3 prisma/dev.db ".dump" > export.sql

# Edit export.sql để remove SQLite-specific directives
sed -i '' '/PRAGMA/d; /BEGIN TRANSACTION/d; /COMMIT/d' export.sql

# 2. Adjust data types for MySQL
# Thay đổi: `someDateTime` DEFAULT CURRENT_TIMESTAMP 
# Thành: `someDateTime` DEFAULT CURRENT_TIMESTAMP

# 3. Import vào MariaDB
mysql -h localhost -u propcart -ppropcart_local propcart_crm < export.sql
```

### Cách 3: Script Node.js (Để Migrate Custom Data)

```typescript
// scripts/migrate-sqlite-to-mysql.ts
import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';

const newDb = new PrismaClient(); // MariaDB
const oldDb = new sqlite3.Database('./prisma/dev.db'); // SQLite

async function migrate() {
  // Read từ SQLite
  const users = await readFromSQLite('SELECT * FROM users');
  
  // Write vào MariaDB
  for (const user of users) {
    await newDb.user.create({ data: user });
  }
  
  console.log('✅ Migration complete!');
}

migrate().catch(console.error);
```

---

## ⚠️ Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

### "MariaDB connection refused"
```bash
# Check if running
docker ps | grep mariadb

# If not running, start
docker-compose up -d mariadb
docker logs propcart_mariadb
```

### "Tables already exist" error
```bash
# Option 1: Fresh start
docker-compose down -v
docker-compose up -d
npx prisma migrate reset --force

# Option 2: Skip existing
npx prisma db push --skip-generate
```

### "Elasticsearch not responding"
```bash
curl -s http://localhost:9200/_cluster/health

# If fails, restart
docker-compose restart elasticsearch
```

### "MinIO bucket not accessible"
```bash
# Ensure bucket exists
docker exec propcart_minio mc ls minio/
docker exec propcart_minio mc mb minio/propcart-crm 2>/dev/null || true
```

---

## ✅ Checklist Hoàn Thành

- [ ] Backup SQLite database
- [ ] Update .env with MariaDB config
- [ ] Docker-compose running (all 4 services healthy)
- [ ] Prisma migration applied
- [ ] Seed data created
- [ ] Backend server starting without errors
- [ ] Frontend loading at localhost:3001
- [ ] Tests passing
- [ ] MinIO accessible
- [ ] Elasticsearch cluster health OK

---

## 🎉 Migration Hoàn Tất!

Bây giờ hệ thống của bạn:
- ✅ Sử dụng **MariaDB** cho transactional data
- ✅ Có **Elasticsearch** cho full-text search
- ✅ Có **MinIO** cho file storage
- ✅ Tất cả autoinit **Catalogs** khi tạo workspace mới
- ✅ Sẵn sàng scale cho production

**Next Steps:**
1. Chạy integration tests để verify
2. Test các features critical (login, invite, search, upload)
3. Monitor logs: `docker-compose logs -f`
4. Backup regularly

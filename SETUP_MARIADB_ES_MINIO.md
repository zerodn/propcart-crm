# Hướng Dẫn Setup PropCart CRM với MariaDB + Elasticsearch + MinIO

## 📋 Yêu Cầu Tiên Quyết

- Docker & Docker Compose
- Node.js 18+
- npm hoặc yarn

## 🚀 Bước Cài Đặt

### 1. Clone Repository và Cài Đặt Dependencies

```bash
cd /Users/macbook/Documents/DuAn/Resdii/Source/PropCartCRM
npm install
```

### 2. Cấu Hình Environment Variables

```bash
# Copy file example
cp .env.example .env

# Edit .env với các giá trị phù hợp
# Hoặc dùng giá trị mặc định cho development:
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000

# MariaDB
DATABASE_URL=mysql://propcart:propcart_local@localhost:3306/propcart_crm?charset=utf8mb4

# JWT
JWT_ACCESS_SECRET=propcart_development_access_secret_minimum_32_characters_123
JWT_REFRESH_SECRET=propcart_development_refresh_secret_minimum_32_characters_123
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
API_CLIENT_SECRET=propcart_development_api_secret_minimum_32_characters_123

# Google OAuth (Optional for development)
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin_local
MINIO_BUCKET=propcart-crm
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
EOF
```

### 3. Khởi Động Docker Services

```bash
# Stop các services cũ nếu có
docker-compose down -v

# Khởi động các containers
docker-compose up -d

# Kiểm tra status
docker-compose ps

# Output mong muốn:
# NAME                 STATUS         PORTS
# propcart_mariadb     Up (healthy)   0.0.0.0:3306->3306/tcp
# propcart_redis       Up (healthy)   0.0.0.0:6379->6379/tcp
# propcart_elasticsearch Up (healthy)  0.0.0.0:9200->9200/tcp
# propcart_minio       Up (healthy)   0.0.0.0:9000->9000/tcp,0.0.0.0:9001->9001/tcp
```

### 4. Kiểm Tra Kết Nối Database và Tạo Migration

```bash
# Test kết nối MariaDB
npx prisma db push

# Nếu bị lỗi, chạy migration:
npx prisma migrate dev --name init_mariadb

# Kiểm tra schema:
npx prisma studio
```

### 5. Khởi Tạo Dữ Liệu (Seeding)

```bash
# Chạy seed script để tạo initial data
npm run prisma:seed

# Verify dữ liệu được tạo trong Prisma Studio
npm run prisma:studio
```

### 6. Tạo MinIO Buckets

```bash
# Access MinIO Admin Console
# URL: http://localhost:9001
# Login: minioadmin / minioadmin_local

# Hoặc dùng CLI:
docker exec propcart_minio mc mb minio/propcart-crm
docker exec propcart_minio mc policy set public minio/propcart-crm
```

### 7. Tạo Elasticsearch Indexes

```bash
# Test Elasticsearch connectivity
curl -X GET "localhost:9200/_cluster/health?pretty"

# Create index template (tùy chỉnh dựa theo requirements)
curl -X PUT "localhost:9200/_index_template/propcart_crm_template" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["propcart_crm*"],
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "vietnamese": {
            "type": "standard",
            "stopwords": "_vietnamese_"
          }
        }
      }
    }
  }'
```

### 8. Khởi Động Backend & Frontend

```bash
# Terminal 1: Backend (Dev Mode)
npm run start:dev

# Terminal 2: Frontend (Dev Mode)
cd apps/web
npm run dev

# Servers sẽ chạy trên:
# - Backend: http://localhost:3000
# - Frontend: http://localhost:3001
```

---

## 📊 Kiểm Tra Kết Nối Tất Cả Services

### MariaDB

```bash
docker exec -it propcart_mariadb mysql -u propcart -ppropcart_local propcart_crm \
  -e "SELECT VERSION(); SHOW TABLES LIMIT 5;"
```

### Redis

```bash
docker exec -it propcart_redis redis-cli PING
# Output: PONG
```

### Elasticsearch

```bash
curl -s http://localhost:9200/_cluster/health | jq .
```

### MinIO

```bash
docker exec propcart_minio mc ls minio/
```

---

## 🗂️ Cấu Trúc Dữ Liệu

### MariaDB Database Structure

```
propcart_crm/
├── users                    ← Users
├── workspaces              ← Workspaces
├── workspace_members       ← Workspace membership
├── workspace_invitations   ← Invitations
├── roles                   ← Roles
├── permissions             ← Permissions
├── role_permissions        ← Role-Permission mappings
├── catalogs                ← Data catalogs (Roles, Departments, etc.)
├── catalog_values          ← Catalog values
├── departments             ← Departments
├── department_members      ← Department members
├── notifications           ← Notifications
├── refresh_tokens          ← Refresh tokens
├── user_devices            ← Device bindings
└── ... (other tables)
```

### Elasticsearch Indexes

```
propcart_crm_members        ← Member search index
propcart_crm_properties     ← Property search index
propcart_crm_leads          ← Lead search index
```

### MinIO Buckets

```
propcart-crm/
├── avatars/               ← User avatars
├── properties/            ← Property images
├── documents/             ← Documents/contracts
├── temp/                  ← Temporary files (TTL 24h)
└── ...
```

---

## 🔄 Migration từ SQLite sang MariaDB

### Nếu bạn có dữ liệu cũ trong SQLite:

```bash
# 1. Export dữ liệu từ SQLite
# (Tùy chỉnh script này dựa trên schema của bạn)
sqlite3 prisma/dev.db ".mode dump" > export.sql

# 2. Xóa data cũ (optional)
npm run prisma:seed

# 3. Verify MariaDB đã có schema
npx prisma db push

# 4. Migrate dữ liệu cũ (manual hoặc script)
# - Tạo script Node.js để đọc SQLite và insert vào MariaDB
# - Hoặc export CSV từ SQLite và import vào MariaDB
```

---

## ⚠️ Troubleshooting

### "ECONNREFUSED" - Port Already in Use

```bash
# Find and kill existing processes
lsof -i :3306 -i :6379 -i :9200 -i :9000 | grep LISTEN
kill -9 <PID>

# hoặc
docker-compose down
```

### MariaDB Connection Error

```bash
# Check MariaDB logs
docker logs propcart_mariadb

# Restart service
docker-compose restart mariadb

# Verify credentials in .env
```

### Elasticsearch Not Ready

```bash
# Check healthy status
curl -s http://localhost:9200/_cluster/health
docker logs propcart_elasticsearch
```

### MinIO Can't Create Bucket

```bash
# Ensure MinIO is running
docker logs propcart_minio

# Remove existing data and restart
docker-compose down
docker volume rm propcart_minio_data
docker-compose up -d minio
```

---

## 📚 Tài Liệu Thêm

- [Prisma Documentation](https://www.prisma.io/docs/)
- [MariaDB Documentation](https://mariadb.com/docs/)
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [MinIO Documentation](https://min.io/docs/minio/container/index.html)

---

## 💡 Best Practices

1. **Always backup** data trước khi migrate
2. **Test locally** trước khi deploy
3. **Use environment variables** cho all secrets
4. **Monitor logs** - `docker-compose logs -f service_name`
5. **Regular backup** - Set up automated backups cho MariaDB

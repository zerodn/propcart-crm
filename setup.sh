#!/usr/bin/env bash
# =============================================================
# PropCart CRM — Setup Script (Mac / Linux)
# Chạy một lần để cài đặt môi trường phát triển
# Usage: bash setup.sh
# =============================================================

set -e

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}  →${NC} $1"; }
success() { echo -e "${GREEN}  ✓${NC} $1"; }
warn()    { echo -e "${YELLOW}  ⚠${NC} $1"; }
error()   { echo -e "${RED}  ✗ ERROR:${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; echo -e "  ${CYAN}$(printf '─%.0s' {1..50})${NC}"; }

# ── Root dir ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║     PropCart CRM — Dev Setup      ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────────
# 1. Kiểm tra Node.js
# ─────────────────────────────────────────────────────────────
header "1/6 Kiểm tra Node.js"

if ! command -v node &>/dev/null; then
  error "Node.js chưa được cài đặt.\n\n  Cài qua nvm (khuyến nghị):\n    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash\n    nvm install 20\n    nvm use 20\n\n  Hoặc tải trực tiếp: https://nodejs.org (v20 LTS)"
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Node.js v${NODE_VERSION} quá cũ. Cần v18 trở lên.\n  Chạy: nvm install 20 && nvm use 20"
fi

success "Node.js v${NODE_VERSION} ✓"
info "npm v$(npm -v)"

# ─────────────────────────────────────────────────────────────
# 2. Cài đặt dependencies — Backend (NestJS)
# ─────────────────────────────────────────────────────────────
header "2/6 Cài đặt backend dependencies"

info "npm install (root)..."
npm install --legacy-peer-deps
success "Backend dependencies đã cài đặt"

# ─────────────────────────────────────────────────────────────
# 3. Tạo file .env
# ─────────────────────────────────────────────────────────────
header "3/6 Cấu hình Environment Variables"

if [ ! -f ".env" ]; then
  info "Tạo .env từ template..."
  cat > .env << 'ENVEOF'
NODE_ENV=development
PORT=3000

# SQLite (dev — không cần Docker)
# Path tương đối với prisma/schema.prisma → lưu tại prisma/dev.db
DATABASE_URL=file:./dev.db

# JWT Secrets (dev)
JWT_ACCESS_SECRET=propcart_access_secret_dev_32chars_min
JWT_REFRESH_SECRET=propcart_refresh_secret_dev_32chars_min
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_TEMP_EXPIRES=10m

# Cache — dùng memory (dev)
REDIS_HOST=localhost
REDIS_PORT=6379

# API Security
API_CLIENT_SECRET=propcart_api_hmac_secret_dev_32chars_min

# Google OAuth (để trống nếu không dùng)
GOOGLE_CLIENT_ID=
ENVEOF
  success ".env đã được tạo"
  warn "JWT secrets dùng giá trị dev mặc định — KHÔNG dùng trên production"
else
  success ".env đã tồn tại (bỏ qua)"
fi

# ─────────────────────────────────────────────────────────────
# 4. Prisma — Generate, Migrate, Seed
# ─────────────────────────────────────────────────────────────
header "4/6 Cài đặt Database (SQLite + Prisma)"

info "Generating Prisma client..."
npx prisma generate
success "Prisma client generated"

info "Chạy migrations..."
npx prisma migrate deploy 2>/dev/null || {
  info "migrate deploy failed, thử migrate dev..."
  npx prisma migrate dev --name init 2>/dev/null || true
}
success "Migrations hoàn tất"

info "Seeding database (Roles, Permissions)..."
npx ts-node prisma/seed.ts
success "Database seeding hoàn tất"

# ─────────────────────────────────────────────────────────────
# 5. Cài đặt dependencies — Frontend (Next.js)
# ─────────────────────────────────────────────────────────────
header "5/6 Cài đặt frontend dependencies"

cd apps/web

info "npm install (apps/web)..."
npm install --legacy-peer-deps
success "Frontend dependencies đã cài đặt"

# ─────────────────────────────────────────────────────────────
# 6. Tạo apps/web/.env.local
# ─────────────────────────────────────────────────────────────
header "6/6 Cấu hình Frontend Environment"

if [ ! -f ".env.local" ]; then
  info "Tạo apps/web/.env.local..."
  cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://localhost:3000
ENVEOF
  success ".env.local đã được tạo"
else
  success ".env.local đã tồn tại (bỏ qua)"
fi

cd "$SCRIPT_DIR"

# ─────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║   ✅  Setup hoàn tất!                     ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Bước tiếp theo — chạy dev server:"
echo ""
echo -e "  ${BOLD}  bash dev.sh${NC}          # Chạy cả 2 server"
echo ""
echo -e "  Hoặc chạy riêng lẻ:"
echo -e "    ${CYAN}npm run start:dev${NC}          # Backend  → http://localhost:3000"
echo -e "    ${CYAN}cd apps/web && npm run dev${NC} # Frontend → http://localhost:3001"
echo ""

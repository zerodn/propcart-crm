#!/usr/bin/env bash
# =============================================================
# PropCart CRM — Dev Server Script (Mac / Linux)
# Khởi động Backend (NestJS) + Frontend (Next.js) cùng lúc
# Usage: bash dev.sh
# =============================================================

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ── Root dir ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Log dirs ──────────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"
API_LOG="$LOG_DIR/api.log"
WEB_LOG="$LOG_DIR/web.log"

# ── PID tracking ──────────────────────────────────────────────
API_PID=""
WEB_PID=""

# ─────────────────────────────────────────────────────────────
# Cleanup on exit / Ctrl+C
# ─────────────────────────────────────────────────────────────
CLEANED=0
cleanup() {
  [ "$CLEANED" -eq 1 ] && return
  CLEANED=1
  echo ""
  echo -e "${YELLOW}  Đang dừng servers...${NC}"
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null; echo -e "${GREEN}  ✓ Backend stopped${NC}"
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null; echo -e "${GREEN}  ✓ Frontend stopped${NC}"
  echo -e "${CYAN}  Bye! 👋${NC}"
}

trap cleanup INT TERM EXIT

# ─────────────────────────────────────────────────────────────
# Pre-flight checks
# ─────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo -e "${RED}  ✗ Chưa có file .env — chạy setup trước: bash setup.sh${NC}"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo -e "${RED}  ✗ Chưa cài dependencies — chạy setup trước: bash setup.sh${NC}"
  exit 1
fi

if [ ! -d "apps/web/node_modules" ]; then
  echo -e "${RED}  ✗ Frontend chưa cài dependencies — chạy setup trước: bash setup.sh${NC}"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║     PropCart CRM — Dev Servers            ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BLUE}Backend${NC}  → ${BOLD}http://localhost:3000${NC}"
echo -e "  ${MAGENTA}Frontend${NC} → ${BOLD}http://localhost:3001${NC}"
echo ""
echo -e "  ${YELLOW}Nhấn Ctrl+C để dừng tất cả${NC}"
echo ""
echo -e "  $(printf '─%.0s' {1..50})"
echo ""

# ─────────────────────────────────────────────────────────────
# Start Backend (NestJS)
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}  [API]${NC} Khởi động NestJS..."

(
  while IFS= read -r line; do
    echo -e "${BLUE}  [API]${NC} $line"
  done < <(npm run start:dev 2>&1)
) &
API_PID=$!

# ─────────────────────────────────────────────────────────────
# Start Frontend (Next.js) — chờ 2s để backend khởi tạo trước
# ─────────────────────────────────────────────────────────────
sleep 2

echo -e "${MAGENTA}  [WEB]${NC} Khởi động Next.js..."

(
  cd apps/web
  while IFS= read -r line; do
    echo -e "${MAGENTA}  [WEB]${NC} $line"
  done < <(npm run dev 2>&1)
) &
WEB_PID=$!

# ─────────────────────────────────────────────────────────────
# Wait — giữ script chạy, Ctrl+C sẽ trigger cleanup
# ─────────────────────────────────────────────────────────────
wait $API_PID $WEB_PID 2>/dev/null || true

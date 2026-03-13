#!/bin/bash

# PropCart CRM - Smart Restart Script
# Restarts Backend & Frontend servers
# Docker containers are only restarted if --docker flag is passed

PROJECT_DIR="/Users/macbook/Documents/DuAn/Resdii/Source/PropCartCRM"
BACKEND_LOG="/tmp/backend.log"
FRONTEND_LOG="/tmp/frontend.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check for --docker flag
RESTART_DOCKER=false
if [[ "$1" == "--docker" ]]; then
  RESTART_DOCKER=true
fi

# Function to check Docker container status
check_docker_containers() {
  docker ps --filter "name=propcart_" --format "{{.Names}}" 2>/dev/null | wc -l
}

# Display usage
display_usage() {
  echo -e "${BLUE}Usage: bash restart-servers.sh [OPTIONS]${NC}"
  echo -e "  (default)     - Restart backend & frontend servers only"
  echo -e "  --docker      - Restart Docker containers + backend & frontend"
  echo -e "\nExamples:"
  echo -e "  bash restart-servers.sh           # Backend + Frontend only"
  echo -e "  bash restart-servers.sh --docker  # Docker + Backend + Frontend"
}

echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${GREEN}PropCart CRM - Smart Restart${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"

# Step 1: Check Docker containers status
echo -e "\n${BLUE}🐳 Checking Docker containers...${NC}"
DOCKER_COUNT=$(check_docker_containers)

if [ "$DOCKER_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No Docker containers running${NC}"
  RESTART_DOCKER=true
  echo -e "${YELLOW}   → Will restart Docker automatically${NC}"
else
  echo -e "${GREEN}✅ Docker containers are running ($DOCKER_COUNT)${NC}"
  if [ "$RESTART_DOCKER" = false ]; then
    echo -e "${YELLOW}   (Use --docker flag to restart them)${NC}"
  fi
fi

# Step 2: Restart Docker if needed
if [ "$RESTART_DOCKER" = true ]; then
  echo -e "\n${RED}🔴 Restarting Docker containers...${NC}"
  cd "$PROJECT_DIR" || exit 1
  docker compose down > /dev/null 2>&1 || true
  docker compose up -d > /dev/null 2>&1
  sleep 15
  echo -e "${GREEN}✅ Docker containers restarted${NC}"
fi

# Step 3: Kill Node/npm processes
echo -e "\n${RED}🔴 Killing Node.js processes...${NC}"
pkill -9 node 2>/dev/null || true
pkill -9 npm 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Processes killed${NC}"

# Step 4: Clear logs
echo -e "\n${YELLOW}📝 Clearing old logs...${NC}"
rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
echo -e "${GREEN}✅ Logs cleared${NC}"

# Step 5: Verify project directory
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
  exit 1
fi

# Step 6: Start backend
echo -e "\n${GREEN}🟢 Starting backend (port 3000)...${NC}"
cd "$PROJECT_DIR" || exit 1

npm run start:dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
sleep 10
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Step 7: Start frontend
echo -e "\n${GREEN}🟢 Starting frontend (port 3001)...${NC}"
cd "$PROJECT_DIR/apps/web" || exit 1

npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
sleep 5
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

# Step 8: Output summary
echo -e "\n${YELLOW}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All servers restarted successfully!${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "Backend PID:  ${GREEN}$BACKEND_PID${NC} (port 3000)"
echo -e "Frontend PID: ${GREEN}$FRONTEND_PID${NC} (port 3001)"
echo -e "\n📋 View logs:"
echo -e "  Backend:  tail -f $BACKEND_LOG"
echo -e "  Frontend: tail -f $FRONTEND_LOG"
echo -e "\n📌 Access URLs:"
echo -e "  Backend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:3001${NC}"
echo -e "\n${YELLOW}════════════════════════════════════════${NC}"
echo -e "\n${BLUE}💡 Tips:${NC}"
echo -e "  • Use: bash restart-servers.sh --docker (to restart Docker too)"
echo -e "  • Docker auto-restarts if containers are down"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
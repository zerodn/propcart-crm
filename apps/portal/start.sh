#!/bin/bash

# Portal Start Script
# Starts the PropCart Portal (port 3002)

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting PropCart Portal (port 3002)...${NC}"

# Check if node_modules exists
if [ ! -d "apps/portal/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing portal dependencies...${NC}"
  cd apps/portal
  npm install
  cd ../..
fi

# Navigate to portal directory
cd apps/portal

# Start portal in development mode
echo -e "${YELLOW}▶️  Starting portal dev server...${NC}"
npm run dev &
PORTAL_PID=$!

echo -e "${GREEN}✅ Portal started with PID: $PORTAL_PID${NC}"
echo -e "${GREEN}📍 Portal URL: http://localhost:3002${NC}"
echo ""
echo "Press Ctrl+C to stop"

# Wait for the process
wait $PORTAL_PID

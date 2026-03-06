#!/bin/bash

echo "🔴 Killing all node/npm processes..."
killall -9 node npm 2>/dev/null
sleep 3

echo "✅ Ports cleared"

echo "🟢 Starting backend..."
cd /Users/macbook/Documents/DuAn/Resdii/Source/PropCartCRM
npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 10

echo "🟢 Starting frontend..."
cd /Users/macbook/Documents/DuAn/Resdii/Source/PropCartCRM/apps/web
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5

echo "✅ Servers started:"
echo "Backend PID: $BACKEND_PID (port 3000)"
echo "Frontend PID: $FRONTEND_PID (port 3001)"
echo "Logs:"
echo "  Backend:  cat /tmp/backend.log"
echo "  Frontend: cat /tmp/frontend.log"

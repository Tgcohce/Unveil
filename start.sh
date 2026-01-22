#!/bin/bash

# UNVEIL Startup Script
# Runs API server and Dashboard with ShadowWire integration

echo "🚀 Starting UNVEIL with ShadowWire Integration..."
echo "================================================"

# Check if API is already running on port 3005
if lsof -Pi :3005 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3005 is already in use. Stopping existing server..."
    kill -9 $(lsof -t -i:3005) 2>/dev/null || true
    sleep 2
fi

# Start API server
echo ""
echo "📡 Starting API Server (port 3005)..."
npx tsx src/api/server.ts &
API_PID=$!
echo "   PID: $API_PID"

# Wait for API to be ready
echo "   Waiting for API to be ready..."
sleep 3

# Test API
if curl -s http://localhost:3005/api/stats > /dev/null; then
    echo "   ✅ API Server is running!"
else
    echo "   ❌ API Server failed to start"
    exit 1
fi

# Start Dashboard
echo ""
echo "📊 Starting Dashboard..."
cd src/dashboard
npm run dev &
DASHBOARD_PID=$!
cd ../..

echo ""
echo "================================================"
echo "✅ UNVEIL is running!"
echo ""
echo "📡 API Server: http://localhost:3005"
echo "   - /api/stats"
echo "   - /api/compare (all 3 protocols)"
echo "   - /api/shadowwire/analysis"
echo ""
echo "📊 Dashboard: http://localhost:3000-3002"
echo "   (Check console output above for exact port)"
echo ""
echo "🔍 Available Protocols:"
echo "   1. Privacy Cash (Purple) - 16/100 score"
echo "   2. Confidential Transfers (Blue) - 0% adoption"
echo "   3. ShadowWire (Green) - 0 transactions"
echo ""
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $API_PID $DASHBOARD_PID 2>/dev/null; exit 0" INT TERM

# Keep script running
wait

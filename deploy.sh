#!/bin/bash
# Update and deploy script for UNVEIL dashboard

echo "🔄 Updating data and deploying to Vercel..."

# 1. Export data from SQLite to JSON
echo ""
echo "📊 Step 1: Exporting database to JSON..."
npx tsx export-to-json.ts

if [ $? -ne 0 ]; then
  echo "❌ Export failed!"
  exit 1
fi

# 2. Build the dashboard
echo ""
echo "🏗️ Step 2: Building dashboard..."
cd src/dashboard
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# 3. Deploy to Vercel
echo ""
echo "🚀 Step 3: Deploying to Vercel..."
vercel --prod --yes

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed!"
  exit 1
fi

echo ""
echo "✅ Update and deployment complete!"
echo ""
echo "🌐 Your dashboard is live at:"
echo "   https://dashboard-tgcohces-projects.vercel.app"

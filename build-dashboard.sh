#!/bin/bash
set -e

echo "Building UNVEIL Dashboard for Vercel..."
echo "========================================="

# Navigate to dashboard
cd src/dashboard

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Build complete!"
echo "Output: src/dashboard/dist"

#!/bin/bash
# Script to restart the dev server and clear caches

echo "🛑 Stopping dev server..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "🧹 Clearing Next.js cache..."
rm -rf .next

echo "✨ Starting fresh dev server..."
npm run dev

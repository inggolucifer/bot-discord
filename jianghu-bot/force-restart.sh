#!/bin/bash

# Navigate to the base directory
BASE_DIR="/root/bot-discord/jianghu-bot"
DASHBOARD_DIR="$BASE_DIR/web-dashboard"

# Restart Backend API & Bot
if [ -d "$BASE_DIR" ]; then
    echo "Restarting backend API & Discord bot (jianghu-bot)..."
    cd "$BASE_DIR"
    pm2 restart jianghu-bot || pm2 start ecosystem.config.js --only jianghu-bot
fi

if [ -d "$DASHBOARD_DIR" ]; then
    echo "Navigating to $DASHBOARD_DIR..."
    cd "$DASHBOARD_DIR"
else
    echo "Error: Directory $DASHBOARD_DIR not found."
    echo "Please update the DASHBOARD_DIR variable in the script."
    exit 1
fi

echo "Stopping PM2 web-frontend process..."
pm2 stop web-frontend

echo "Killing any lingering next.js processes..."
pkill -f "next-server" || true
pkill -f "next" || true

echo "Removing old .next build folder..."
rm -rf .next

echo "Rebuilding Next.js application..."
npm install --legacy-peer-deps
npm run build

if [ $? -eq 0 ]; then
    echo "Build successful! Restarting PM2 process..."
    pm2 start web-frontend
    pm2 save
    echo "All services (jianghu-bot & web-frontend) successfully force-restarted."
else
    echo "Build failed. Please check the logs."
    exit 1
fi


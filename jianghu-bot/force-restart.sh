#!/bin/bash

# Navigate to the dashboard directory (adjust path if needed)
DASHBOARD_DIR="/root/bot-discord/jianghu-bot/web-dashboard"

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
    echo "Web frontend successfully force-restarted."
else
    echo "Build failed. Please check the logs."
    exit 1
fi

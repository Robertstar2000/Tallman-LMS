#!/bin/sh

# Industrial Nexus: Synchronizing Personnel Registry
echo "🌱 BOOTSTRAP: Synchronizing Industrial Records..."
npm run seed

if [ "$NODE_ENV" = "production" ]; then
    echo "🚀 START: Launching Tallman Unified Server (Production Mode on Port 3120)..."
    npm start
else
    echo "🚀 START: Launching Tallman Unified Server (Development Mode on Port 3120)..."
    npm run dev:backend
fi

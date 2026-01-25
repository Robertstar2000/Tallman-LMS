#!/bin/bash

# Industrial Nexus: Synchronizing Personnel Registry
echo "🌱 BOOTSTRAP: Synchronizing Industrial Records..."
npm run seed

if [ "$NODE_ENV" = "production" ]; then
    echo "🏗️ BUILD: Compiling Industrial API Registry..."
    npm run build:server
    echo "🚀 START: Launching Tallman API Nexus (Production Mode)..."
    npm start
else
    echo "🚀 START: Launching Tallman API Nexus (Development/Watch Mode)..."
    npm run dev:backend
fi

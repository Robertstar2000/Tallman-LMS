#!/bin/bash

# Industrial Nexus: Synchronizing Personnel Registry
echo "🌱 BOOTSTRAP: Synchronizing Industrial Records..."
npm run seed

# Starting API Nexus
echo "🚀 START: Launching Tallman API Nexus..."
npm run dev:backend

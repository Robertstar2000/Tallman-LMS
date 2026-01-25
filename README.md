
# 🏗️ Tallman LMS: Technical Infrastructure & Deployment Registry

Welcome to the **Tallman Learning Management System (LMS)**. This is a high-fidelity, dual-stack industrial training platform designed for precision workforce development.

- **Local Developer Mode**: `docker-compose up --build` remains fully functional for your current workflow.
- **Industrial Swarm Mode**: `docker stack deploy -c docker-compose.swarm.yml tallman` is now the verified path for production migration.
- **Persistence Compliance**: Database and technical manual storage now follow the NFS shared storage protocol.

## 📋 Architecture Overview

The platform is architected as a decoupled system for maximum operational reliability:
- **Frontend Gateway (React/Vite)**: A state-of-the-art technical console utilizing Tailwind CSS, Glassmorphism aesthetics, and real-time state synchronization.
- **API Nexus (Node.js/Express)**: A robust industrial backend controlling personnel identity, curriculum storage, and AI service integration.
- **Data Layer (SQLite)**: A persistent technical registry storing global personnel data, technical manuals, and audit records.
- **AI Engine (Gemini 3)**: Autonomous curriculum architecting via `gemini-3-flash-preview` and visual synthesis via `gemini-3-pro-image-preview`.

---

## 🚀 Technical Grid Initialization (Deployment SOP)

### 1. Prerequisites
- **Node.js**: Version 18.0.0 or higher.
- **NPM/Yarn**: Latest stable build.
- **Google AI API Key**: Required for autonomous curriculum generation.

### 2. Environment Calibration
Create a `.env` file in the root directory and configure the following technical tokens:
```env
# API Security
JWT_SECRET="your_high_clearance_secret"

# LLM Integration
GEMINI_API_KEY="your_google_ai_key"

# Tunnel Protocols (Optional)
TUNNEL_PASSWORD="3080"
```

### 3. Service Activation
```powershell
# Step 1: Initialize Registry
npm install

# Step 2: Ignite Primary Systems (Full Stack)
# This triggers both the Frontend (3180) and the API Nexus (3185)
npm run dev
```

---

## 🌐 Network Configuration Matrix

| Service | Protocol | Access Point | Role |
| :--- | :--- | :--- | :--- |
| **Frontend** | HTTP/Vite | [http://localhost:3180](http://localhost:3180) | Technician Console |
| **API Nexus** | HTTP/JSON | [http://localhost:3185](http://localhost:3185) | Administrative Backend |
| **Database** | SQLITE3 | `./server/db.sqlite` | Global Identity Registry |

---

## 🛠️ Developer SOP (Standard Operating Procedures)

### Component Registry
- `/pages`: Core industrial consoles (LearnerDashboard, AdminDashboard, WorkforceRegistry).
- `/components`: Reusable UI modules (Sidebar, Navbar, CourseCard).
- `geminiService.ts`: The central nexus for all AI-autonomous operations.

### Deployment Hardening
Before production transition, perform the following technical audits:
1. **Visual Sync Audit**: Click "Visual Sync" in the Admin Console to verify image generation connectivity.
2. **Audit Logic Check**: Pass a mock technical quiz as a 'Technician' to ensure XP points synchronize correctly.
3. **Database Migration**: Ensure `initDb()` is called within `server/index.ts` to build the latest schema.

---

## 🛡️ Administrative Governance
Access the **Governance Registry** (Help/About) within the authenticated platform for exhaustive instructional manuals, industrial safety protocols, and SSL configuration guidelines.

> *Technical excellence is not an act, but a habit of precision.*
> **Property of Tallman Equipment Co. - Precision, Safety, Excellence.**

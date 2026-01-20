---
name: enterprise-app-foundation
description: A high-performance blueprint for distributed applications requiring dual-persistence, secure identity governance, and fault-tolerant AI orchestration.
---

# Enterprise Application Foundation (Technical Deep Dive)

This skill provides the architectural substrate for rebuilding industrial-grade distributed systems from a blank slate.

## 🏗️ 1. Infrastructure: Distributed Persistence Nexus

Implement a **Dialect-Agnostic Proxy** to support both local development and cluster-scale deployment.

### Persistence Logic Pattern
```typescript
interface DatabaseProxy {
  query: (sql: string, params?: any[]) => Promise<any>;
  run: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  transaction: (fn: () => Promise<void>) => Promise<void>;
}

// Dialect Translation Technique
const isPostgres = !!process.env.POSTGRES_HOST;
const translateParams = (text: string) => {
  let index = 1;
  return text.replace(/\?/g, () => `$${index++}`); // Converts ? to $1, $2, etc.
};
```

### Swarm-Ready Docker Configuration
- **Postgres Nexus**: Image `postgres:15-alpine`.
- **Sequential Schema Protocol**: Postgres drivers often fail on multi-statement strings. Always `.split(';')` and execute sequentially during `initDb`.
- **Relational Integrity**: Use `ON UPDATE CASCADE` for all identity references to allow seamless migration of technician IDs without violating foreign keys.
- **Node Environment**: Use `node:20-bullseye-slim` for mission-critical stability and glibc compatibility.

---

## 🛡️ 2. Security: Identity Governance & Access Resilience

Stateless security optimized for multi-node deployments where shared memory is unavailable.

### The "Nuclear Governance" Override
Always implement a hard-coded memory override for the project's **Industrial Master** email. This ensures that even if database seeding fails or a technician record is stuck in a legacy "Hold" state, the master can still log in to fix the system.

```typescript
// Pattern in login route
if (email.toLowerCase() === 'master@domain.com') {
    user.status = 'active'; // In-memory override
    user.roles = JSON.stringify(['Admin']); 
}
```

### Identity Sync Best Practices
- **Conflict Strategy**: Always synchronize personnel records based on **Email** (`ON CONFLICT(email)`), as `user_id` can drift between manual signups and automated seeds.
- **Priority Seeding**: Always seed the `Users` table (Identity Nexus) BEFORE any dependent tables (Logs, Enrollments) to prevent relational link failures.
- **Input Normalization**: Always `.trim()` and `LOWER()` email addresses during both Signup and Login to ensure identity audits are resilient to typo-driven lockouts.

---

## 🛠️ 5. Docker Desktop: Advanced Build & Maintenance (Compiled)

This skill optimizes Docker for development environments and eliminates common binary architectural failures.

### The "Zero-Crash" Build Protocol:
1. **Model Portability**: Always replace native `bcrypt` with `bcryptjs`. Native binaries compiled on Windows hosts will crash with `Exec format error` when mounted into Linux containers.
2. **Anonymous Volume Shadowing**: In your `docker-compose.yml`, mount your project root but **shadow** the node_modules folder:
   ```yaml
   volumes:
     - .:/app
     - /app/node_modules # Forces usage of container-built modules
   ```
3. **Bootstrapping Entrypoints**: Use a `docker-entrypoint.sh` to handle automated seeding (`npm run seed`) and environment synchronization on every boot.

---

## 🤖 3. AI: Resilient Multi-Model Orchestration

A critical layer for automating complex logic while maintaining enterprise-level uptime.

### The "Industrial Retry" Algorithm
Implement a global wrapper for AI SDKs (Google Generative AI, OpenAI, etc.).
- **Retries**: 5-7 attempts with exponential backoff.
- **Models**: High-performance reasoning via `gemini-3-flash-preview` and visual synthesis via `gemini-3-pro-image-preview`.

---

## 🛠️ Re-Implementation Workflow
1. **Bootstrap**: Initialize `package.json` with `express`, `pg`, `better-sqlite3`, `jsonwebtoken`, `bcryptjs`.
2. **Persistence**: Build `db.ts` with sequential schema execution and CASCADE support.
3. **Identity**: Create authentication routes with Governance Overrides and Email-First sync logic.
4. **Orchestration**: Define the `docker-compose.yml` (without version tag) using `bullseye-slim`.
5. **Entrypoint**: Create and `chmod +x` a `docker-entrypoint.sh` for runtime bootstrapping.

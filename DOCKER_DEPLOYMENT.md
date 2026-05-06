# Tallman LMS - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Docker Desktop Installation](#docker-desktop-installation)
4. [Docker Swarm Installation](#docker-swarm-installation)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Tallman LMS uses the unified Tallman image for both local Docker Desktop and production Swarm deployments.

### Deployment Options

| Environment | Compose File | Use Case | Access URL |
|-------------|--------------|----------|------------|
| **Docker Desktop** | `docker-compose.yml` | Local development and validation | http://localhost:3120 |
| **Docker Swarm** | `docker-compose.swarm.yml` | Production cluster | https://lms.tallmanequipment.com |

### Master Registry

**Docker Hub**: `tallmanit/tallmanswarm:LMSApp2.2`

**GitHub**: https://github.com/Robertstar2000/Tallman-LMS

---

## Quick Start

### Docker Desktop

```powershell
docker compose up -d --build --force-recreate
start http://localhost:3120
```

### Docker Swarm

```bash
ssh 10.10.20.36
cd /var/data/config
docker stack deploy -c docker-compose-tallman.yaml tallman
```

---

## Docker Desktop Installation

### Prerequisites

- **Docker Desktop** installed and running
- At least **4GB RAM** allocated to Docker
- A local `.env` file with:
  - `JWT_SECRET`
  - `GEMINI_API_KEY`

### Method 1: Using Docker Compose

1. **Navigate to the project directory:**

   ```powershell
   cd C:\Users\rober\Desktop\tallman-lms (1)
   ```

2. **Start Tallman LMS:**

   ```powershell
   docker compose up -d --build --force-recreate
   ```

3. **Verify it's running:**

   ```powershell
   docker compose ps
   ```

4. **Access the Web UI:**

   Open http://localhost:3120 in your browser.

5. **View logs:**

   ```powershell
   docker logs -f tallman-app
   ```

### Method 2: Using Docker Run

```powershell
docker pull tallmanit/tallmanswarm:LMSApp2.2

docker run -d `
  --name tallman-app `
  -p 3120:3120 `
  -v tallman-lms-data:/data `
  -v tallman-lms-uploads:/app/uploads `
  -e NODE_ENV=production `
  -e PORT=3120 `
  -e DB_PATH=/data/tallman.db `
  -e SEED_MODE=blank `
  -e AI_PROVIDER=gemini `
  -e JWT_SECRET=replace_with_your_secret `
  -e GEMINI_API_KEY=replace_with_your_google_ai_key `
  --restart unless-stopped `
  tallmanit/tallmanswarm:LMSApp2.2
```

### Stopping and Removing

```powershell
docker compose down
docker compose down -v
```

### Updating to Latest Version

```powershell
docker pull tallmanit/tallmanswarm:LMSApp2.2
docker compose up -d --force-recreate
```

---

## Docker Swarm Installation

### Prerequisites

- Access to the Tallman Docker Swarm cluster
- SSH access to a manager node
- DNS configured for the application domain
- `JWT_SECRET` available in the deployment shell
- Shared storage mounted at `/var/data`

### Cluster Infrastructure

| Component | Address |
|-----------|---------|
| Manager Node 1 | 10.10.20.36 |
| Manager Node 2 | 10.10.20.61 |
| Manager Node 3 | 10.10.20.63 |
| Storage Server (NFS) | 10.10.20.64 |
| Virtual IP (Keepalived) | 10.10.20.65 |

### Deployment Steps

1. **SSH to a manager node:**

   ```bash
   ssh 10.10.20.36
   ```

2. **Create the data directories:**

   ```bash
   sudo mkdir -p /var/data/tallman-lms/data
   sudo mkdir -p /var/data/tallman-lms/uploads
   sudo chmod 755 /var/data/tallman-lms
   ```

3. **Copy the Swarm compose file:**

   ```bash
   scp docker-compose.swarm.yml 10.10.20.36:/var/data/config/docker-compose-tallman.yaml
   ```

4. **Configure DNS:**

   Point `lms.tallmanequipment.com` to `10.10.20.65`.

5. **Set the JWT secret:**

   ```bash
   export JWT_SECRET='replace_with_your_long_random_secret'
   ```

6. **Deploy the stack:**

   ```bash
   cd /var/data/config
   docker stack deploy -c docker-compose-tallman.yaml tallman
   ```

7. **Verify deployment:**

   ```bash
   docker stack services tallman
   docker service logs tallman_tallman-app
   ```

8. **Access the application:**

   Open https://lms.tallmanequipment.com

### Stack Management Commands

| Command | Description |
|---------|-------------|
| `docker stack deploy -c docker-compose-tallman.yaml tallman` | Deploy or update the stack |
| `docker service update --force tallman_tallman-app` | Force redeploy with the same image tag |
| `docker stack rm tallman` | Remove the stack |
| `docker stack services tallman` | View service status |
| `docker service logs tallman_tallman-app` | View logs |

### Updating the Application

```bash
docker pull tallmanit/tallmanswarm:LMSApp2.2
docker service update --image tallmanit/tallmanswarm:LMSApp2.2 tallman_tallman-app
```

---

## Configuration

### Environment Variables

| Variable | Description | Docker Desktop | Docker Swarm |
|----------|-------------|----------------|--------------|
| `JWT_SECRET` | Signs auth tokens | Required | Required |
| `GEMINI_API_KEY` | Local/test AI generation key | Required | Not used |
| `AI_PROVIDER` | AI backend selector | `gemini` | `ollama` |
| `OLLAMA_ENDPOINT` | Production Ollama endpoint | Not used | `http://10.10.20.60:11434/api/chat` |
| `OLLAMA_MODEL` | Production model | Not used | `gemma4:26b` |

### Data Persistence

| Environment | Volume/Mount | Purpose |
|-------------|--------------|---------|
| Docker Desktop | `db-data:/data` | SQLite database |
| Docker Desktop | `uploads-data:/app/uploads` | Unit attachments |
| Docker Swarm | `/var/data/tallman-lms/data:/data` | Shared persistent database |
| Docker Swarm | `/var/data/tallman-lms/uploads:/app/uploads` | Shared persistent attachments |

### Bootstrap Admin

The bootstrap admin is recreated automatically on startup and during blank seeding.

| Field | Value |
|-------|-------|
| Email | `robertstar@aol.com` |
| Password | `Rm2214ri#` |
| Role | `Teacher` |

### Backup

**Docker Desktop:**
```powershell
docker run --rm -v db-data:/data -v ${PWD}:/backup alpine tar cvf /backup/tallman-lms-backup.tar /data
```

**Docker Swarm:**
```bash
tar -czvf /var/data/backups/tallman-lms-$(date +%Y%m%d).tar.gz /var/data/tallman-lms/
```

---

## Troubleshooting

### Docker Desktop Issues

**Container won't start:**
```powershell
docker compose ps
docker logs tallman-app
docker compose down
docker compose up -d --build --force-recreate
```

**Port 3120 already in use:**
```powershell
netstat -ano | findstr :3120
```

**Image pull fails:**
```powershell
docker login
docker pull tallmanit/tallmanswarm:LMSApp2.2
```

### Docker Swarm Issues

**Service won't start:**
```bash
docker service ps tallman_tallman-app --no-trunc
docker service logs tallman_tallman-app
```

**Can't access via domain:**

1. Verify DNS: `nslookup lms.tallmanequipment.com`
2. Check Traefik: `docker service logs infra_traefik`
3. Verify network: `docker network ls | grep tallman`

**Storage issues:**
```bash
df -h | grep /var/data
sudo mount -a
```

### Common Fixes

| Issue | Solution |
|-------|----------|
| `JWT_SECRET` warning during deploy | Export `JWT_SECRET` before `docker stack deploy` |
| App starts but AI generation fails locally | Set `GEMINI_API_KEY` in `.env` and rebuild |
| App starts but production AI fails | Verify `10.10.20.60:11434` reachability from Swarm node |
| Users logged out after restart | Keep the same `JWT_SECRET` |
| SQLite write conflicts | Keep Swarm replicas at `1` |

---

## Network Access Points

### Docker Desktop

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3120 |

### Docker Swarm

| Service | URL |
|---------|-----|
| Tallman LMS | https://lms.tallmanequipment.com |
| Traefik Dashboard | https://traefik.swarm.tallmanequipment.com |
| Portainer | https://portainer.swarm.tallmanequipment.com |

---

## Related Documentation

- [Swarm Platform Guide](./swarm.md)
- [Docker Compose Swarm Stack](./docker-compose.swarm.yml)
- [Local Docker Compose](./docker-compose.yml)
- [Main Project README](./README.md)

---

*Last Updated: May 2026*

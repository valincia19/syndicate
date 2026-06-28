---
id: scripts
type: feature
status: stable
tags: [scripts, crud, distribution]
---

# Scripts Module

> **Module path:** `backend/src/modules/scripts/`
> **Files:** `scripts.routes.js`, `scripts.controller.js`, `scripts.service.js`, `scripts.model.js`

---

## Overview

Manages script lifecycle: creation, editing, versioning, and distribution to users. Authors can upload scripts via Studio dashboard; users retrieve them through the portal.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/scripts` | User | List available scripts |
| `GET` | `/v1/scripts/:id` | User | Get script details + download |
| `POST` | `/v1/scripts` | Developer | Create new script |
| `PUT` | `/v1/scripts/:id` | Developer | Update script metadata |
| `DELETE` | `/v1/scripts/:id` | Admin | Remove script |

---

## Security Notes

- Script payloads must be validated before storage to prevent injection
- Only verified developers should publish scripts
- Script version integrity should be checked via SHA-256 hash

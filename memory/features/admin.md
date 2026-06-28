---
id: admin
type: feature
status: stable
tags: [rbac, admin-panel, moderation]
---

# Admin Module

> **Module path:** `backend/src/modules/admin/`
> **Files:** `admin.routes.js`, `admin.controller.js`, `admin.service.js`

---

## Overview

Administration dashboard & API for user management, license oversight, and system moderation. Accessible via the **Studio** frontend route group.

---

## Roles

| Role | Permissions |
|------|------------|
| `user` | Basic portal access, own license mgmt |
| `developer` | Script upload + release mgmt |
| `staff` | Ticket moderation, user lookup |
| `admin` | Full access: users, licenses, system config |
| `owner` | Financial data, global settings |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/admin/users` | List all users (paginated) |
| `GET` | `/v1/admin/users/:id` | Get user details |
| `PUT` | `/v1/admin/users/:id` | Update user (role, status) |
| `DELETE` | `/v1/admin/users/:id` | Ban/delete user |
| `GET` | `/v1/admin/stats` | Dashboard statistics |

---

## Security Notes

- **RBAC enforcement** is critical — verify role middleware blocks unauthorized access
- All admin actions **must be audit-logged** (who, what, when)
- Admin endpoints should have stricter rate limits and IP whitelisting

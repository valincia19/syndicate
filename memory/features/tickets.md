---
id: tickets
type: feature
status: stable
tags: [support, tickets, crm]
---

# Tickets Module

> **Module path:** `backend/src/modules/tickets/`
> **Files:** `tickets.routes.js`, `tickets.controller.js`, `tickets.service.js`, `tickets.model.js`

---

## Overview

Support ticket system bridging users and staff. Users submit issues, staff respond, and tickets progress through status stages.

---

## Status Lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
  └──→ CLOSED (by user / auto-expire)
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/tickets` | User | List user's tickets |
| `POST` | `/v1/tickets` | User | Create ticket |
| `GET` | `/v1/tickets/:id` | User/Staff | Get ticket + messages |
| `PUT` | `/v1/tickets/:id` | Staff | Update status / assign |
| `POST` | `/v1/tickets/:id/reply` | User/Staff | Add reply |

---

## Security Notes

- Users can only view their own tickets (unless staff)
- Prevent ticket spam via rate limiting per user
- Sanitize message content to prevent XSS in admin panel

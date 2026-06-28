---
id: releases
type: feature
status: stable
tags: [releases, versioning, distribution]
---

# Releases Module — Version Distribution

> **Module path:** `backend/src/modules/releases/`
> **Files:** `releases.routes.js`, `releases.controller.js`, `releases.service.js`, `releases.model.js`

---

## Overview

Manages versioned script/executor releases. Powers the update system where users download the latest signed executor builds and script packages.

---

## Release Lifecycle

```
DRAFT → PUBLISHED → DEPRECATED → ARCHIVED
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/releases` | None | List public releases |
| `GET` | `/v1/releases/latest` | None | Get latest version |
| `POST` | `/v1/releases` | Developer | Create new release |
| `PUT` | `/v1/releases/:id` | Developer | Update release metadata |
| `DELETE` | `/v1/releases/:id` | Admin | Remove release |

---

## Security Notes

- Releases should be **digitally signed** to prevent tampering during download
- Version strings must be validated (semver)
- Integrity checks via SHA-256 hash per release artifact
- Deprecated releases should still be downloadable for backward compatibility

# 🐳 Docker Setup — PostgreSQL Only

Setup Docker Compose untuk PostgreSQL development database. Backend dan Frontend jalan manual di lokal.

---

## 🚀 Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Cek Status

```bash
docker-compose ps
```

Output:
```
NAME                STATUS              PORTS
valinc-postgres     Up (healthy)        0.0.0.0:5432->5432/tcp
```

### 3. Setup Backend .env

Buat file `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# Database (connect ke Docker PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=valinc_syndicate
DB_USER=valinc_user
DB_PASSWORD=valinc_password_change_in_production
DB_SSL=false
DB_CONNECTION_LIMIT=20

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this
JWT_EXPIRES_IN=7d

# Redis (kosongkan untuk in-memory fallback)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Discord OAuth2 (opsional)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:5000/v1/auth/discord/callback
FRONTEND_URL=http://localhost:3000

# Cloudflare R2 (opsional)
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Setup Frontend .env.local

Buat file `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 5. Jalankan Backend & Frontend

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 6. Akses Aplikasi

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 📋 Command Cheatsheet

| Command | Deskripsi |
|---------|-----------|
| `docker-compose up -d` | Start PostgreSQL |
| `docker-compose down` | Stop PostgreSQL |
| `docker-compose down -v` | Stop + hapus data (RESET DATABASE!) |
| `docker-compose logs -f` | Lihat logs PostgreSQL |
| `docker-compose restart` | Restart PostgreSQL |
| `docker-compose ps` | Status container |
| `docker-compose exec postgres psql -U valinc_user -d valinc_syndicate` | Masuk PostgreSQL shell |

---

## 🗄️ Database Management

### Backup Database

```bash
docker-compose exec postgres pg_dump -U valinc_user valinc_syndicate > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U valinc_user valinc_syndicate
```

### Reset Database (HATI-HATI!)

```bash
docker-compose down -v
docker-compose up -d
```

### Akses PostgreSQL Shell

```bash
docker-compose exec postgres psql -U valinc_user -d valinc_syndicate
```

Dalam psql:

```sql
-- Lihat semua tabel
\dt valinc_syndicate.*

-- Query users
SELECT * FROM valinc_syndicate.users LIMIT 10;

-- Cek schema
\dn

-- Keluar
\q
```

---

## 🐛 Troubleshooting

### Port 5432 sudah dipakai

**Error**: `Bind for 0.0.0.0:5432 failed: port is already allocated`

**Solusi**:
1. Matikan PostgreSQL lokal:
   ```bash
   # Windows
   net stop postgresql-x64-16
   
   # Atau cek port
   netstat -ano | findstr :5432
   ```
2. Atau ganti port di `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Host:Container
   ```
   Lalu ubah `DB_PORT=5433` di `backend/.env`

### Backend tidak bisa connect

**Solusi**:
1. Pastikan PostgreSQL container running dan healthy:
   ```bash
   docker-compose ps
   ```
2. Pastikan `DB_HOST=localhost` di `backend/.env` (bukan `postgres`)
3. Cek logs:
   ```bash
   docker-compose logs
   ```

---

## 🔐 Production

Untuk production, ganti password PostgreSQL:

1. Edit `docker-compose.yml`:
   ```yaml
   POSTGRES_PASSWORD: <password-kuat>
   ```
2. Edit `backend/.env`:
   ```env
   DB_PASSWORD=<password-kuat>
   ```

---

## 📚 Next Steps

Kalau butuh Redis atau full Docker setup (Backend + Frontend dalam container), check `DOCKER.md` lengkap.

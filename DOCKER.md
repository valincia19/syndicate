# 🐳 Docker Setup — Full Integration

Ini adalah panduan untuk menjalankan seluruh ekosistem **VALINC SYNDICATE** (Database PostgreSQL, Cache Redis, Express Backend, dan Next.js Frontend) dalam satu perintah menggunakan Docker Compose.

---

## 🛠️ Prasyarat (Windows)

1. **Unduh & Instal Docker Desktop**:
   - Download dari: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Pastikan opsi **WSL 2 based engine** diaktifkan saat instalasi.
2. Pastikan Docker Desktop sedang berjalan (ada ikon paus kecil di system tray Windows).

---

## 🚀 Memulai Layanan (Quick Start)

### 1. Jalankan Seluruh Kontainer
Buka terminal (PowerShell, Command Prompt, atau Git Bash) di direktori utama proyek (`VALINC-SYNDICATE-1.0.1`), lalu jalankan:

```bash
docker compose up --build -d
```
*Catatan: Parameter `--build` akan membangun image backend & frontend secara lokal, dan `-d` menjalankannya di latar belakang.*

### 2. Cek Status Kontainer
Pastikan semua kontainer berjalan lancar dan berstatus `healthy`:

```bash
docker compose ps
```

Output yang diharapkan:
```
NAME               STATUS              PORTS
valinc-postgres    Up (healthy)        0.0.0.0:5432->5432/tcp
valinc-redis       Up (healthy)        0.0.0.0:6379->6379/tcp
valinc-backend     Up                  0.0.0.0:5000->5000/tcp
valinc-frontend    Up                  0.0.0.0:3000->3000/tcp
```

### 3. Akses Aplikasi
- **Frontend Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Health Check API**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 📋 Command Cheatsheet (Docker Compose)

| Perintah | Deskripsi |
|---------|-----------|
| `docker compose up -d` | Menjalankan seluruh kontainer |
| `docker compose up --build -d` | Menjalankan kontainer sambil membangun ulang image (jika ada perubahan kode) |
| `docker compose down` | Menghentikan seluruh kontainer (data DB aman) |
| `docker compose down -v` | Menghentikan kontainer dan **menghapus semua data (Reset Database & Cache)** |
| `docker compose logs -f` | Menampilkan logs seluruh layanan secara real-time |
| `docker compose logs -f backend` | Hanya menampilkan logs backend |
| `docker compose logs -f frontend` | Hanya menampilkan logs frontend |
| `docker compose restart <nama-service>` | Memulai ulang kontainer tertentu (misal: `docker compose restart backend`) |

---

## 🗄️ Database Management (di dalam Docker)

### Backup Database ke file lokal `.sql`
```bash
docker compose exec postgres pg_dump -U valinc_user valinc_syndicate > backup.sql
```

### Restore Database dari file `.sql`
```bash
cat backup.sql | docker compose exec -T postgres psql -U valinc_user valinc_syndicate
```

### Reset Database & Volume Data
Jika Anda ingin memulai dari database yang bersih:
```bash
docker compose down -v
docker compose up -d
```

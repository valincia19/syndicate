# 🤖 VALINC SYNDICATE Discord Bot

![discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=flat-square&logo=discord)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0-green?style=flat-square&logo=node.js)
![Architecture](https://img.shields.io/badge/Architecture-Modular-success?style=flat-square)

Layanan Discord Bot modular untuk ekosistem **VALINC SYNDICATE** yang mempermudah interaksi pengguna langsung dari guild Discord (seperti pengecekan lisensi premium, tombol salin key, greeting, setup panel, dll).

---

## 🏗️ Arsitektur Modular

Bot ini dirancang sepenuhnya modular agar mempermudah penambahan fitur dan komponen interaksi baru tanpa menumpuk logika di file utama:

1. **Commands (`src/commands/`)**:
   - Berisi file command slash terpisah (misalnya `/ping`, `/setup`).
   - Pendaftaran dilakukan otomatis melalui `src/handlers/commandHandler.js`.
2. **Events (`src/events/`)**:
   - Event handler individual (seperti `ready`, `guildMemberAdd`, `interactionCreate`).
   - Dipickup otomatis oleh `src/handlers/eventHandler.js`.
3. **Interactions (`src/interactions/`)**:
   - Komponen UI Discord modular seperti:
     - **Buttons (`src/interactions/buttons/`)** (misalnya tombol `panel_my_keys`, `panel_copy_keys`).
     - **Select Menus (`src/interactions/selectMenus/`)** *(mendukung ekspansi mendatang)*.
     - **Modals (`src/interactions/modals/`)** *(mendukung ekspansi mendatang)*.
   - Semua interaksi dimuat dinamis oleh `src/handlers/interactionHandler.js` dan didistribusikan secara transparan di event `interactionCreate`.

---

## 🛠️ Konfigurasi Environment

Salin `.env.example` menjadi `.env` di folder `bot/` dan lengkapi variabel berikut:

```env
# Discord Client Credentials
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here

# Welcome Channel Configuration
DISCORD_WELCOME_CHANNEL_ID=your_welcome_channel_id_here

# Backend Connection
BACKEND_INTERNAL_URL=http://valinc-backend:5000
INTERNAL_API_SECRET=your_shared_internal_secret_here
```

---

## 🚀 Jalankan Secara Lokal

### 1. Install Dependensi
```bash
cd bot
npm install
```

### 2. Jalankan Mode Development (Nodemon)
```bash
npm run dev
```

### 3. Jalankan Mode Produksi
```bash
npm start
```

---

## 🐳 Integrasi Docker

Bot ini dapat dijalankan bersama ekosistem VALINC SYNDICATE lainnya menggunakan Docker Compose:
```bash
docker compose up -d bot
```

---
**Built with ❤️ for VALINCIA SYNDICATE - Modular, Scalable, Extensible**

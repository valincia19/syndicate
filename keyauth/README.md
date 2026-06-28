# keyauth — VALINC SYNDICATE Free Key App

Standalone Next.js app for claiming free license keys via a 2-step checkpoint system (shortlink + captcha). Designed to be deployed on a separate subdomain (e.g. `keyauth.valinc.gg`).

## Tech Stack

- **Next.js 16** (App Router, `output: "standalone"`)
- **React 19** + **TypeScript**
- **Tailwind CSS v4** + `@tailwindcss/postcss`
- **shadcn/ui** components (Button, Card)
- **Cloudflare Turnstile** for captcha verification

## Folder Structure

```
keyauth/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (fonts, theme, i18n)
│   │   ├── page.tsx            # Get Key page with checkpoint system
│   │   └── globals.css         # Tailwind + theme tokens
│   ├── components/
│   │   ├── providers/
│   │   │   └── language-provider.tsx
│   │   ├── shared/
│   │   │   └── language-selector.tsx
│   │   └── ui/
│   │       ├── button.tsx      # shadcn Button
│   │       └── card.tsx        # shadcn Card
│   ├── config/
│   │   ├── i18n.ts
│   │   └── locales/
│   │       ├── en.json
│   │       ├── id.json
│   │       ├── fr.json
│   │       └── ja.json
│   ├── hooks/
│   │   └── use-theme.tsx
│   └── lib/
│       ├── api.ts              # Backend API client
│       └── utils.ts            # cn() helper
├── .env.local                  # Environment variables
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Quick Start

```bash
cd keyauth
npm install
```

### Configure Environment

Edit `.env.local`:

```env
# Backend API URL (cross-origin)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Configure Checkpoints

Edit `src/app/page.tsx` — find the config section at the top:

```ts
const SHORTLINK_URL = "https://example.com/your-shortlink"; // TODO: Replace
const TURNSTILE_SITE_KEY = "0x00000000000000000000AA"; // TODO: Replace
```

Replace with your actual:
- **Shortlink URL**: Your adwall/shortlink provider URL (ouo.io, adalinks, linkvertise, looter, etc.)
- **Turnstile Site Key**: Get from [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)

### Run Dev

```bash
npm run dev
# → http://localhost:3001
```

### Build for Production

```bash
npm run build
# Output: .next/standalone/ (ready for Node.js deployment)
```

---

## Deploy to Hostinger Cloud Hosting

### Prerequisites
- Hostinger Cloud Hosting plan (VPS with Node.js support)
- PM2 installed globally (`npm install -g pm2`)
- Backend API running and accessible

### Steps

1. **Build the app locally:**
   ```bash
   cd keyauth
   npm run build
   ```

2. **Upload to server:**
   Upload the `keyauth/` folder to your Hostinger server (e.g. `/home/user/keyauth/`).

3. **Install dependencies on server:**
   ```bash
   cd /home/user/keyauth
   npm install --production
   ```

4. **Configure environment:**
   ```bash
   nano .env.local
   # Set NEXT_PUBLIC_API_URL to your production backend URL
   ```

5. **Start with PM2:**
   ```bash
   pm2 start npm --name "keyauth" -- start
   pm2 save
   pm2 startup
   ```

### Subdomain Setup (Nginx Reverse Proxy)

Create an Nginx config for your subdomain:

```nginx
server {
    listen 80;
    server_name keyauth.valinc.gg;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable SSL with Certbot:
```bash
sudo certbot --nginx -d keyauth.valinc.gg
```

---

## Backend CORS Configuration

The keyauth app makes **cross-origin** requests to the backend. You **must** add the keyauth subdomain to the backend's `ALLOWED_ORIGINS` environment variable:

```env
# In backend/.env
ALLOWED_ORIGINS=https://valincsyndicate.com,https://keyauth.valinc.gg
```

## Rate Limiting

The backend enforces **3 free key claims per IP per hour** on `POST /v1/licenses/free`. This is configured in `backend/src/index.js`:

```js
createRateLimiter({ name: 'free_key', windowMs: 60 * 60 * 1000, max: 3 })
```

Adjust `max` and `windowMs` as needed.

## License

Part of VALINC SYNDICATE monorepo.

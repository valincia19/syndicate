# 🚀 VALINC SYNDICATE User Portal & Landing Page

![Next.js](https://img.shields.io/badge/Next.js-16.x-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.x-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwind-css)
![Optimization](https://img.shields.io/badge/Optimization-Pruned-success?style=flat-square)

Frontend web application untuk platform **VALINC SYNDICATE** yang berisi landing page premium dan user portal / dashboard untuk manajemen lisensi, keys, dan script.

---

## ⚡ Optimasi & Performa (Production-Ready)

Sebagai bagian dari standarisasi perilisan ke production, proyek ini telah melalui audit performa dan pruning kode secara menyeluruh:

* **Dependency Pruning (via Knip)**:
  * Menggunakan `knip` untuk mendeteksi dependency mati.
  * Menghapus **9 unused dependencies** yang tidak diimpor untuk meminimalkan size `node_modules` dan bundle JavaScript.
* **Dead Code & Unused Files Cleanup**:
  * Menghapus **12 file sampah/mati** (termasuk mockup lama, file asset duplikat, unused layout files, dan utility code lawas).
  * Menghasilkan ukuran build Next.js yang **jauh lebih ringan, cepat**, serta meminimalkan error runtime.

---

## 🛠️ Tech Stack & Konvensi

- **Framework**: Next.js 16 (App Router) dengan React 19.
- **Styling**: Tailwind CSS v4 dengan `@tailwindcss/postcss` untuk performa kompilasi CSS yang sangat cepat.
- **UI Components**: Shadcn UI (`base-nova` style) di `src/components/ui/`.
- **State Management**: Zustand untuk state UI dan interaksi complex.
- **Type Checking**: Strict TypeScript.

---

## 📁 Struktur Folder Utama

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router (Landing page, Portal dashboard)
│   ├── components/             # Reusable UI & Layout components
│   ├── config/                 # i18n & static dictionaries
│   ├── data/                   # Client-side data schemas
│   ├── hooks/                  # Custom React hooks (theme, language, dll)
│   ├── lib/                    # API client & utility functions
│   └── stores/                 # Zustand store definitions
├── public/                     # Static assets (images, icons, templates)
├── package.json
└── tsconfig.json
```

---

## 🚀 Pengerjaan Lokal

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Jalankan Dev Server
```bash
npm run dev
# Running on http://localhost:3000
```

### 3. Kompilasi & Build Produksi
```bash
npm run build
```

### 4. Linter & Static Analysis
```bash
npm run lint      # Jalankan ESLint (0 warnings/errors)
npx knip          # Analisis dead-code dan unused exports
```

---
**Built with ❤️ for VALINCIA SYNDICATE - High Performance, Sleek UI, Secure**

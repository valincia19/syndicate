"use client"

import React, { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { 
  Key, 
  Shield, 
  Terminal, 
  Code, 
  Check, 
  Copy, 
  BookOpen, 
  Info, 
  AlertTriangle 
} from "lucide-react"

// ── TYPES & INTERFACES ──────────────────────────────────────────────────────
interface DocumentSection {
  title: string
  slug: string
  icon: React.ComponentType<{ className?: string }>
  content: string
}

// ── MAIN DOC PAGE COMPONENT ─────────────────────────────────────────────────
export default function DeveloperDocPage() {
  const [activeSlug, setActiveSlug] = useState<string>("getting-started")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [apiUrl, setApiUrl] = useState<string>("http://localhost:5000")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname
      const protocol = window.location.protocol
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        setApiUrl(`${protocol}//localhost:5000`)
      } else {
        const parts = hostname.split(".")
        if (parts.length >= 2) {
          const apex = parts.slice(-2).join(".")
          setApiUrl(`${protocol}//api.${apex}`)
        } else {
          setApiUrl(`${protocol}//${hostname}:5000`)
        }
      }
    }
  }, [])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── DATA: STATIC DOCUMENTATION ────────────────────────────────────────────
  const documents: DocumentSection[] = [
    {
      title: "Getting Started & Loader",
      slug: "getting-started",
      icon: Key,
      content: `# 🔑 Getting Started & Two-Stage Loading

Selamat datang di dokumentasi pengembang **VALINC SYNDICATE**. Platform kami dirancang dengan fokus utama pada perlindungan kekayaan intelektual (IP Protection) script Luau Roblox Anda dari eksploitasi pihak ketiga.

---

### 🛡️ Mengapa Two-Stage Loading?
Metode otentikasi standar yang hanya mengandalkan satu loadstring sangat rentan terhadap pencurian source code melalui teknik sniffing (seperti Fiddler, Charles, atau custom proxy) atau decompilation memori. 

VALINC menerapkan arsitektur otentikasi dua tahap (**Two-Stage Loading**):

1. **Stage 1 (Gatekeeper)**: Merupakan script pembuka minimalis yang dipublikasikan secara umum. Script ini sama sekali tidak berisi kode logika game Anda. Tugasnya hanya memvalidasi identitas lingkungan eksekusi dan memanggil Stage 2.
2. **Stage 2 (Secure Delivery)**: Server memproses request dari Stage 1, memvalidasi integritas hardware (HWID) dan lisensi di database, kemudian mengirimkan kode utama secara dinamis yang langsung dieksekusi di memori Roblox tanpa menyisakan file mentah di disk.

---

### 🔑 Keamanan Dinamis: One-Time Token (Enforcement)
Script Utama VALINC dilengkapi dengan Token Dinamis Sekali Pakai (*One-Time Token*) berumur 30 detik yang disimpan di Redis Cache. Jika script utama dieksekusi secara standalone/lokal tanpa melalui jembatan loader resmi, script secara otomatis mendeteksi token tidak valid dan melakukan *self-destruct* (membatalkan eksekusi).
`
    },
    {
      title: "Script Loader Siap Pakai",
      slug: "loader-code",
      icon: Code,
      content: `# 🚀 Script Loader Siap Pakai (Stage 1 & 2)

Di bawah ini adalah implementasi lengkap kode loader yang siap Anda gunakan untuk mendistribusikan script Anda dengan aman.

---

### 📦 Stage 1: Loader Script (Dibagikan ke Pengguna)
Bagikan script pembuka ini ke pengguna Anda. Pengguna wajib mendefinisikan key lisensi mereka ke dalam variabel global \`_G.Key\` sebelum memanggil script loader:

\`\`\`lua
_G.Key = "KEY_LISENSI_ANDA_DISINI"
loadstring(game:HttpGet("http://localhost:5000/v1/releases/8a724b5166fc46ac12c6fee6eb2049f3"))()
\`\`\`

---

### 🛡️ Stage 2: Gatekeeper Script (Bootstrap Perantara)
Ketika rute Stage 1 diakses oleh Roblox executor, backend secara otomatis merender kode bootstrap perantara ini ke client. Kode ini berjalan di background untuk mengamankan komunikasi data:

\`\`\`lua
-- VALINC SYNDICATE :: Secure Gatekeeper Script
-- Stage 1 Bootstrap — This file contains no proprietary logic.
-- All real payload is fetched and executed in-memory at runtime.

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local LocalPlayer = Players.LocalPlayer

-- Collect Device Identity
local key = _G.Key or ""
local hwid = (type(gethwid) == "function" and gethwid()) or game:GetService("RbxAnalyticsService"):GetClientId()
local robloxId = tostring(LocalPlayer.UserId)
local robloxName = tostring(LocalPlayer.Name)
local executor = (type(identifyexecutor) == "function" and identifyexecutor()) or "Unknown"
local avatarUrl = ""

-- Attempt to fetch avatar URL (non-fatal)
pcall(function()
  local thumb = game:GetService("Players"):GetUserThumbnailAsync(LocalPlayer.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size100x100)
  avatarUrl = thumb
end)

-- Build Secure Request to Stage 2
local url = "http://localhost:5000/v1/releases/secure-load/8a724b5166fc46ac12c6fee6eb2049f3"
  .. "?key=" .. HttpService:UrlEncode(key)
  .. "&hwid=" .. HttpService:UrlEncode(hwid)
  .. "&roblox_id=" .. HttpService:UrlEncode(robloxId)
  .. "&roblox_username=" .. HttpService:UrlEncode(robloxName)
  .. "&roblox_avatar=" .. HttpService:UrlEncode(avatarUrl)
  .. "&executor=" .. HttpService:UrlEncode(executor)

local ok, response = pcall(function()
  return HttpService:RequestAsync({
    Url = url,
    Method = "GET",
    Headers = {
      ["User-Agent"] = "RobloxApp",
      ["X-Valinc-Handshake"] = "TRUE",
    }
  })
end)

-- Handle Response
if not ok then
  warn("[VALINC] Connection error. Please retry.")
  return
end

if not response or not response.Success then
  local errMsg = "[VALINC] Script delivery failed. (HTTP " .. tostring(response and response.StatusCode or "?") .. ")"
  pcall(function()
    local parsed = HttpService:JSONDecode(response.Body)
    if parsed and parsed.message then
      errMsg = "[VALINC] " .. tostring(parsed.message)
    end
  end)
  warn(errMsg)
  return
end

-- Parse JSON error response if Content-Type indicates JSON
local contentType = (response.Headers and (response.Headers["content-type"] or response.Headers["Content-Type"])) or ""
if contentType:find("application/json") then
  local errMsg = "[VALINC] Access denied."
  pcall(function()
    local parsed = HttpService:JSONDecode(response.Body)
    if parsed and parsed.message then
      errMsg = "[VALINC] " .. tostring(parsed.message)
    end
  end)
  warn(errMsg)
  return
end

-- Execute Real Script In-Memory via loadstring()
local scriptBody = response.Body
if not scriptBody or #scriptBody == 0 then
  warn("[VALINC] Empty payload received.")
  return
end

local mainFn, compileErr = loadstring(scriptBody)
if not mainFn then
  warn("[VALINC] Script compile error: " .. tostring(compileErr))
  return
end

local runOk, runErr = pcall(mainFn)
if not runOk then
  warn("[VALINC] Runtime error: " .. tostring(runErr))
end
\`\`\`
`
    },
    {
      title: "HWID & Switch Account Rules",
      slug: "hwid-rules",
      icon: Shield,
      content: `# ⚙️ Aturan Batasan Perangkat (HWID) & Multi-Device

Untuk menjaga nilai produk Anda dan mencegah penyebaran lisensi secara ilegal (key sharing), sistem kami mengontrol relasi unik antara lisensi, perangkat keras (HWID), dan akun Roblox.

---

### 🛡️ Kuota Maksimal Perangkat (HWID Limit)
Setiap license key memiliki batasan jumlah perangkat unik aktif yang diizinkan untuk melakukan eksekusi script secara bersamaan berdasarkan tingkat tier lisensi:

| Tier Lisensi | Batas Maksimal Perangkat (HWID) |
| :--- | :--- |
| **Free Key** | 1 Perangkat Aktif |
| **Premium Key** | 5 Perangkat Aktif |
| **Pro Key** | 12 Perangkat Aktif |

*Jika pengguna mencoba mengaktifkan kunci pada perangkat baru melampaui limit di atas, API otomatis mengembalikan error status \`403 Forbidden\`.*

---

### 🔄 Kebijakan Pergantian Akun (Switch Account Policy)
Sistem VALINC dirancang dengan fleksibilitas tinggi tanpa mengorbankan keamanan:
* **Switch Account Terbuka**: Pengguna diperbolehkan berganti-ganti akun Roblox (\`UserId\` berbeda) sesuka hati selama mereka bermain pada perangkat komputer yang sama (**HWID terdaftar cocok**). 
* **Audit Trail Otomatis**: Setiap kali ada perubahan username atau UserID Roblox di HWID yang sama, backend otomatis mencatat dan memperbarui metadata detail perangkat di database untuk log pengawasan.
* **Multi-Device Sync**: Satu akun Roblox yang sama dapat digunakan di komputer rumah dan laptop secara bergantian, selama total perangkat fisik yang terdaftar pada key tersebut tidak melampaui batas maksimal kuota slot HWID lisensi.
`
    },
    {
      title: "API Reference & Responses",
      slug: "api-reference",
      icon: Terminal,
      content: `# 🔍 API Reference & Status Responses

Dokumentasi endpoint autentikasi pengembang beserta struktur respon error dan sukses.

---

### 📂 Kode Status HTTP & Deskripsi Error

| Status Code | Message / Error | Deskripsi Masalah |
| :--- | :--- | :--- |
| **200 OK** | Success | Verifikasi berhasil, key aktif dan HWID cocok. |
| **400 Bad Request** | License key is not activated. Please activate it first. | Kunci belum diaktivasi pertama kali. Panggil endpoint activation. |
| **400 Bad Request** | License key expired | Kunci lisensi sudah melewati batas waktu kedaluwarsa. |
| **403 Forbidden** | HWID mismatch. Device is not registered for this key. | HWID perangkat saat ini tidak terdaftar pada lisensi ini. |
| **403 Forbidden** | License key has been revoked | Lisensi diblokir oleh admin/developer secara manual. |
| **403 Forbidden** | License already activated on another device | Jumlah kuota perangkat (HWID Limit) lisensi telah habis. |
| **404 Not Found** | License key not found | Kunci lisensi tidak terdaftar di sistem. |

---

### 📤 Contoh Struktur Respon Sukses (200 OK)
Berikut adalah output JSON yang dikembalikan oleh API ketika validasi kunci lisensi berhasil:

\`\`\`json
{
  "status": "success",
  "statusCode": 200,
  "message": "License verified successfully",
  "data": {
    "valid": true,
    "expires_at": "2026-07-30T23:33:17.952Z",
    "tier": "premium",
    "hwid_limit": 5
  }
}
\`\`\`

---

### 🔑 Keamanan Dinamis: One-Time Token (Enforcement)
Script Utama VALINC dilengkapi dengan Token Dinamis Sekali Pakai (One-Time Token) berumur 30 detik yang disimpan di Redis Cache. Jika script utama dieksekusi secara standalone/lokal tanpa melalui jembatan loader resmi, script secara otomatis mendeteksi token tidak valid dan melakukan self-destruct (membatalkan eksekusi).

---

### 📂 Endpoint Validasi Token Intern (Dipanggil oleh Script Utama)
Endpoint ini digunakan secara otomatis di background oleh Script Utama untuk memvalidasi token sekali pakai sebelum kode logika game berjalan.

* **URL:** \`GET /v1/releases/verify-token\`
* **Query Parameters:**
  * \`token\` (string, required): Token unik 16-byte hex acak dari backend.
  * \`roblox_id\` (string, required): ID pemain Roblox yang mengeksekusi.

#### Referensi Kode Status Respon Teks (Plain Text):
| HTTP Status | Response Body | Deskripsi Masalah / Status |
| :--- | :--- | :--- |
| **200 OK** | \`AUTHORIZED\` | Token valid, status diizinkan, dan token langsung dihapus saat itu juga dari Redis (Single-Use). |
| **200 OK** | \`UNAUTHORIZED\` | Token salah, sudah kedaluwarsa (> 30 detik), atau dicoba dijalankan kembali untuk kedua kalinya. |

---

### 🛡️ Contoh Logika Penjaga (Token Guard) di Baris Atas Script Utama
Di bawah ini adalah contoh potongan kode Luau yang otomatis disuntikkan oleh backend Express.js di baris paling atas Script Utama Anda sebelum diserahkan ke Roblox Executor:

\`\`\`lua
local HttpService = game:GetService("HttpService")
local token = "GENERATED_HEX_TOKEN_32_CHARS"
local rbxId = "12345678"

-- Mengecek keaslian token eksekusi ke backend
local checkUrl = "http://localhost:5000/v1/releases/verify-token?token=" .. token .. "&roblox_id=" .. rbxId
local success, res = pcall(function() 
    return game:HttpGetAsync(checkUrl, {["User-Agent"] = "RobloxApp"}) 
end)

if not success or res ~= "AUTHORIZED" then
    print("==================================================")
    warn(" [VALINC] SECURITY VIOLATION: Bypassed Loader Detected!")
    print(" Script ini tidak dijalankan melalui loader resmi.")
    print("==================================================")
    return -- Membatalkan seluruh eksekusi logika script asli
end
\`\`\`
`
    }
  ]

  const activeDoc = documents.find(d => d.slug === activeSlug) || documents[0]
  const resolvedContent = activeDoc.content.replace(/http:\/\/localhost:5000/g, apiUrl)

  return (
    <div className="space-y-6">
      {/* Interactive Title Banner */}
      <div className="flex flex-col gap-1 border-b border-border/80 pb-4">
        <h1 className="text-xl font-black tracking-tight text-foreground uppercase flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Developer Portal & SDK
        </h1>
        <p className="text-xs text-muted-foreground">
          Panduan integrasi script Roblox, kebijakan HWID, dan referensi REST API VALINC SYNDICATE.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left Side: Navigation Sidebar */}
        <div className="lg:col-span-1 rounded-lg border border-border bg-card/60 backdrop-blur-md p-3 shadow-md space-y-4">
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 pb-2.5 border-b border-border/50 mb-3 flex items-center gap-1.5">
              <Code className="h-3 w-3 text-indigo-500" />
              Navigasi Dokumen
            </h3>
            <div className="space-y-1.5">
              {documents.map((doc, idx) => {
                const Icon = doc.icon
                const isActive = activeSlug === doc.slug

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSlug(doc.slug)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all text-left ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                        : "text-foreground hover:bg-muted/80 border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Main Content Reader */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-border bg-card/30 backdrop-blur-md p-8 shadow-lg relative min-h-[500px]">
            
            {/* Header Tip Banner */}
            <div className="mb-6 rounded-md border border-indigo-500/10 bg-indigo-500/5 p-4 flex gap-3 text-indigo-300">
              <Info className="h-5 w-5 shrink-0 text-indigo-400" />
              <div className="space-y-1">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Informasi Integrasi</h4>
                <p className="text-[10px] leading-relaxed opacity-90 text-muted-foreground">
                  Semua dokumentasi ini bersifat statis di sisi client untuk performa pemuatan instan. Gunakan tombol **Copy** di pojok kanan atas setiap code block untuk menyalin kode langsung ke clipboard.
                </p>
              </div>
            </div>

            {/* Document Content Parser */}
            <article className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-black text-foreground mb-4 border-b border-border/50 pb-3.5 uppercase tracking-wide flex items-center gap-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-sm font-bold text-foreground mt-8 mb-4 border-l-2 border-indigo-500 pl-2.5 uppercase tracking-wider" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xs font-bold text-foreground mt-6 mb-3" {...props} />,
                  p: ({node, ...props}) => <p className="text-xs text-muted-foreground leading-relaxed mb-4" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside text-xs text-muted-foreground mb-4 space-y-1.5" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside text-xs text-muted-foreground mb-4 space-y-1.5" {...props} />,
                  li: ({node, ...props}) => <li className="ml-2 pl-1 leading-relaxed" {...props} />,
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-6 rounded-lg border border-border">
                      <table className="w-full text-left border-collapse text-xs" {...props} />
                    </div>
                  ),
                  thead: ({node, ...props}) => <thead className="bg-muted/80 text-[10px] font-bold uppercase tracking-wider border-b border-border/50" {...props} />,
                  tbody: ({node, ...props}) => <tbody className="divide-y divide-border/40" {...props} />,
                  tr: ({node, ...props}) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
                  th: ({node, ...props}) => <th className="p-3 font-semibold" {...props} />,
                  td: ({node, ...props}) => <td className="p-3 text-muted-foreground" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                  a: ({node, ...props}) => <a className="text-indigo-400 hover:underline font-semibold" {...props} />,
                  code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || "")
                    const codeString = String(children).replace(/\n$/, "")
                    const uniqueId = activeSlug + "-" + (match ? match[1] : "inline")

                    if (!inline && match) {
                      return (
                        <div className="relative group my-4 rounded-lg border border-border bg-[#0B0B0C] overflow-hidden">
                          {/* Code Header Bar with Copy Button */}
                          <div className="flex justify-between items-center px-4 py-2 border-b border-border/30 bg-muted/30 text-[10px] font-mono text-muted-foreground">
                            <span>{match[1].toUpperCase()}</span>
                            <button
                              onClick={() => handleCopy(codeString, uniqueId)}
                              className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                            >
                              {copiedId === uniqueId ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          {/* Code Content Pre */}
                          <pre className="p-4 font-mono text-xs overflow-x-auto text-emerald-400/90 leading-relaxed">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      )
                    }

                    return (
                      <code className="bg-muted/85 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-400 border border-border/60" {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {resolvedContent}
              </ReactMarkdown>
            </article>

          </div>
        </div>
      </div>
    </div>
  )
}

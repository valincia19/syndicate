# 🛡️ VALINC SYNDICATE - Security & Leak Simulation Report

Laporan ini mensimulasikan upaya serangan (*leak attempt*) oleh cracker/oknum yang mencoba mencuri, membagikan, atau mem-bypass sistem loader script VALINC Anda.

---

## 📂 Skenario 1: Percobaan Download Langsung (Direct Browser/Curl)
Cracker mencoba membuka tautan Loader Stage 1 langsung di browser atau menembaknya menggunakan tool seperti `curl` atau `wget`.

* **Tautan Target:** `https://api.vinzhub.com/v1/release/2c7c4dfdd843fd2d134590d977249acb.lua`
* **Request Header:** User-Agent standar browser (`Mozilla/5.0 ...`) atau tools CLI (`curl/7.81.0`).

### 🔴 HTTP Response (403 Forbidden):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Access Denied (403)</title>
  ...
</head>
<body>
  <h1>Forbidden (403)</h1>
  <p>Direct query of script file asset is restricted. Please run within active RobloxApp executor client only.</p>
</body>
</html>
```
* **Hasil:** **TERBLOKIR (Aman).** Cracker tidak bisa melihat isi kode bootstrap loader sama sekali.

---

## 📂 Skenario 2: Percobaan Menembak Endpoint Stage 2 (Secure Load)
Cracker berhasil mengendus lalu lintas data (*packet sniffing*) dan menemukan URL Stage 2 (secure-load), lalu mencoba menembaknya secara langsung untuk mengunduh kode asli.

* **Tautan Target:** `https://api.vinzhub.com/v1/releases/secure-load/2c7c4dfdd843fd2d134590d977249acb`

### 🔴 Percobaan A: Tanpa Parameter / Lisensi Kosong
* **Request:** `GET https://api.vinzhub.com/v1/releases/secure-load/2c7c4dfdd843fd2d134590d977249acb`
* **HTTP Response (400 Bad Request):**
  ```json
  {
    "status": "error",
    "statusCode": 400,
    "message": "License key is required"
  }
  ```

### 🔴 Percobaan B: Menggunakan Kunci Lisensi Palsu/Salah
* **Request:** `GET .../secure-load/...?key=FAKE_KEY_123&hwid=my_hwid`
* **HTTP Response (404 Not Found):**
  ```json
  {
    "status": "error",
    "statusCode": 404,
    "message": "License key not found"
  }
  ```

### 🔴 Percobaan C: Menggunakan Lisensi Valid tapi di Perangkat Lain (HWID Mismatch)
Cracker menyalin kunci lisensi milik pembeli sah, lalu mencoba menembak API dari PC-nya sendiri.
* **Request:** `GET .../secure-load/...?key=SYNDICATE_1V259LGI41907TNCB8W3&hwid=hwid_milik_cracker`
* **HTTP Response (403 Forbidden):**
  ```json
  {
    "status": "error",
    "statusCode": 403,
    "message": "HWID mismatch. Device is not registered for this key."
  }
  ```
* **Hasil:** **TERBLOKIR (Aman).** Kode asli tidak akan pernah dikirimkan oleh backend kecuali lisensi dan HWID terverifikasi dengan benar.

---

## 📂 Skenario 3: Intersepsi Memori & Penyebaran Script (Leak Utama)
Pembeli sah yang memiliki Lisensi & HWID valid menggunakan debugger eksternal untuk merekam kode yang dikembalikan di memori executor saat eksekusi pertama.

Kode hasil intersepsi di memori yang berhasil disalin cracker:
```lua
-- _G.Key = "SYNDICATE_1V259LGI41907TNCB8W3"
-- VALINC SYNDICATE :: One-Time Execution Guard
local authStatus = game:HttpGet("https://api.vinzhub.com/v1/releases/verify-token?token=c17d398af22b63deb17f1e64906f35a0&roblox_id=123456")
if authStatus ~= "AUTHORIZED" then
    warn("[VALINC] Standalone execution detected. Execution halted.")
    return
end

print("Hello World!")
```

Cracker kemudian mencoba memanfaatkan kode hasil salinan ini melalui dua cara:

### 🔴 Kasus A: Script Disebarkan ke Teman (Roblox ID Berbeda)
Teman cracker mencoba menjalankan script curian tersebut. Akun Roblox temannya memiliki ID `999999`.
1. Script curian memanggil:
   `GET https://api.vinzhub.com/v1/releases/verify-token?token=c17d398af22b63deb17f1e64906f35a0&roblox_id=999999`
2. Backend mendeteksi bahwa token tersebut terdaftar untuk Roblox ID pembeli sah (`123456`), bukan `999999`.
3. **HTTP Response (200 OK):**
   `UNAUTHORIZED`
4. **Hasil:** **TERBLOKIR.** Script langsung berhenti (`return`) dan mencetak warning ke konsol Roblox teman cracker.

### 🔴 Kasus B: Script Dijalankan Ulang (Re-execution oleh Pembeli Sah)
Pembeli sah mencoba menjalankan script hasil intersepsi tersebut untuk kedua kalinya tanpa melalui loader resmi (karena ingin bypass lisensi check).
1. Script curian memanggil:
   `GET https://api.vinzhub.com/v1/releases/verify-token?token=c17d398af22b63deb17f1e64906f35a0&roblox_id=123456`
2. Backend memeriksa token di Redis Cache. Namun, **token tersebut sudah terhapus permanen dari Redis (Single-Use Check)** sejak verifikasi pertama yang dilakukan loader resmi beberapa detik lalu.
3. **HTTP Response (200 OK):**
   `UNAUTHORIZED`
4. **Hasil:** **TERBLOKIR.** Script tidak akan bisa berjalan kembali secara standalone karena tokennya sudah hangus.

---

## 🏆 Kesimpulan Tingkat Keamanan
Sistem VALINC Syndicate Anda menerapkan sistem keamanan **Double-Gate Gatekeeper**:
1. **Stage 1 & 2** memproteksi agar kode asli Anda tidak pernah bisa diunduh secara langsung tanpa lisensi aktif dan perangkat terdaftar.
2. **One-Time Token (Redis)** memastikan kode yang di-intersepsi di memori tidak berguna bagi orang lain, serta tidak dapat dijalankan secara mandiri tanpa memicu rantai validasi loader baru.

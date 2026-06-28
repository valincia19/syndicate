# Full Database Audit & Updated Migration Plan

## Source Database: 34 Tables Found

Below is the complete analysis of every table, categorized by migration priority.

---

## ✅ MUST MIGRATE (Core User Data)

| Table | Records | Migrate To | Reason |
|-------|---------|------------|--------|
| `users` | 20,039 | `users` (PG) | Core user accounts |
| `keys` | 10,595 | `licenses` (PG) | License keys → new license system |
| `key_accounts` | 73,666 | `hwid_devices` (PG) | HWID/device registrations |

---

## 🟡 OPTIONAL MIGRATE (Potentially Valuable Data)

| Table | Records | Migrate To | Reason |
|-------|---------|------------|--------|
| `vouchers` | 9 | `vouchers` (PG) | Voucher/promo codes - small data, easy to migrate |
| `transactions` | 8,533 | `payment_transactions` (PG) | Payment history - good for customer records |
| `scripts` | 9 | Manual check | Game script metadata - check if already re-created |
| `login_logs` | 39,601 | ❌ Skip | Historical only - not critical, new system has its own logging |
| `page_views` | 56,466 | ❌ Skip | Analytics data - old site, not relevant to new platform |
| `admin_activity_logs` | 562 | ❌ Skip | Historical admin logs - low value for new system |
| `notifications` | 1 | ❌ Skip | Only 1 record, can recreate |
| `creator_payouts` | 1 | ❌ Skip | Only 1 record |

---

## ⏭️ SKIP (Not Needed)

| Table | Records | Reason |
|-------|---------|--------|
| `api_keys` | 1 | Old API key, not applicable |
| `auth_tokens` | 0 | Empty, old session tokens |
| `cache` / `cache_locks` | 0 | Empty cache tables |
| `daily_uptime` | 55 | Old uptime data, not relevant |
| `executor_versions` / `executors` | 6 each | Old executor configs, can recreate |
| `failed_jobs` / `job_batches` / `jobs` | 0 | Empty Laravel queue tables |
| `free_loaders` / `premium_loaders` | 0/1 | Old script loader configs |
| `key_account_delete_logs` | 7,633 | Historical deletion logs |
| `migrations` | 2 | Laravel migration tracking |
| `obfuscation_logs` | 1 | Old feature, not in new system |
| `payment_gateway_flows` | 44 | Old payment gateway records |
| `rate_limit` | 1 | Old rate limit data |
| `reseller_generation_logs` | 95 | Old reseller logs |
| `script_slugs` | 6 | Old script slug mappings |
| `security_events` | 0 | Empty |
| `status_incidents` / `system_status` | 3/6 | Old status page data |
| `voucher_usage` | 0 | Empty |

---

## 📋 Recommendation

### Must Do (3 tables):
1. **`users`** (20,039) → `users`
2. **`keys`** (10,595) → `licenses` (premium tier, 2 bulan expiry)
3. **`key_accounts`** (73,666) → `hwid_devices`

### Worth Considering (2 tables):
4. **`vouchers`** (9) → `vouchers` - Kecil, mudah dimigrasi. Voucher code lama bisa tetap aktif.
5. **`transactions`** (8,533) → `payment_transactions` - Riwayat pembayaran user. Berguna kalau mau kasih history transaksi ke user di portal.

> [!IMPORTANT]
> **Perlu keputusan kamu:**
> - Mau migrasi `vouchers` (9 record) juga?
> - Mau migrasi `transactions` (8,533 record) sebagai riwayat pembayaran?
> - Atau fokus 3 tabel inti saja (users + keys + key_accounts)?

---

## Updated Migration Scope

The core plan remains the same as the previous implementation plan:

1. **Users**: 20,039 records → Generate UUID, copy username/email/discord_id/avatar, random password hash
2. **Keys → Licenses**: 10,595 records → Premium tier, 2-month expiry, preserve license_key  
3. **Key Accounts → HWID Devices**: 73,666 records → Map to new license IDs, copy HWID/roblox data

### Safety: DRY RUN first, then execute with transaction rollback on any error.

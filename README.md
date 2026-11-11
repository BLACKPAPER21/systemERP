# SystemERP — Fondasi Proyek + Modul M1 (Master Data & Pengguna)

Sistem ERP terintegrasi untuk UMKM retail/distribusi — 6 modul, satu basis data.
Berkas ini menuntaskan **Tahap 0** (kerangka bersama) dan **Tahap 1** (modul M1)
sehingga lima modul lain tidak lagi terblokir. Sumber kebenaran: `docs/PRD.md`.

## Tumpukan teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Kerangka | Next.js 16 (App Router), React 19 |
| Bahasa | TypeScript (strict) |
| Antarmuka | Tailwind CSS 4 + shadcn/ui (komponen di `src/components/ui/`) |
| Data | Drizzle ORM + drizzle-kit, driver `pg` (Pool — mendukung `db.transaction()`, syarat AB-12) |
| Basis data | PostgreSQL di Neon |
| Validasi | Zod (sisi server — NF-4) |
| Autentikasi | Auth.js credentials — `next-auth@5.0.0-beta.32` (kombinasi stabil yang didukung Next 16; versi pra-v5 tidak mendukung Next 16) |
| Lain-lain | bcryptjs (hash sandi — NF-1), recharts (siap pakai untuk M6/M5), lucide-react + clsx/tailwind-merge/cva (dependensi standar shadcn/ui), tw-animate-css (animasi Tailwind 4), tsx + dotenv (menjalankan seed/migrasi) |

> **Catatan dependensi** — daftar `package.json` sudah final di tahap ini supaya
> kelima kelompok lain tidak perlu menyentuh `package.json`.

## Setup lokal

```sh
npm i            # pasang dependensi
npm run db:push  # terapkan skema ke Neon (DATABASE_URL sudah di .env.local)
npm run db:seed  # isi 8 akun + 4 pengguna demo + data master + jurnal J0
npm run dev      # buka http://localhost:3000
```

Skrip tersedia: `dev`, `build`, `start`, `db:generate`, `db:push`, `db:seed`.

> `DATABASE_URL` dibaca dari `.env.local` — berkas ini **tidak pernah di-commit**
> (`.gitignore` memblokir `.env*`, NF-6).

## Kredensial demo (dibuat oleh seed)

| Peran | Email | Kata sandi |
|-------|-------|-----------|
| Owner | `owner@demo.id` | `demo123` |
| Staf Gudang | `gudang@demo.id` | `demo123` |
| Kasir / Sales | `sales@demo.id` | `demo123` |
| Staf Keuangan | `keuangan@demo.id` | `demo123` |

Matriks hak akses per halaman mengikuti PRD §4.2; pemeriksaan dilakukan
server-side pada setiap Server Action (NF-3) — menyembunyikan tombol saja
tidak cukup.

## Layanan bersama yang sudah tersedia (milik M1)

| Berkas | Isi | Dipakai |
|--------|-----|---------|
| `src/lib/auth-guard.ts` | `requireRole(roles)` — melempar galat bila sesi/peran tidak sah; `pageAccess(roles)` untuk halaman | Semua modul — panggil di baris pertama setiap Server Action (NF-3) |
| `src/services/numbering.ts` | `generateDocNumber(tx, prefix)` — format `PREFIKS/TAHUN/BULAN/0001`, reset per bulan, kunci baris `FOR UPDATE` | PO/GRN (M2), SO/INV (M4), JV/PAY (M5), OPN (M3) |
| `src/services/audit.ts` | `logAudit(tx, input)` — aksi create/update/post/cancel (NF-10) | Semua modul |
| `src/lib/format.ts` | `formatRupiah`, `formatTanggal` (DD/MM/YYYY), `formatAngka`, peta warna status NF-21 | Semua modul — jangan menulis format sendiri |
| `src/components/ui/status-badge.tsx` | Lencana status seragam | Semua modul |
| `src/components/shared/*` | `PageHeader`, `Pagination`, `FormDialog`, `MitraFormDialog`, `AksesDitolak` | Tata letak daftar seragam (NF-19) |

## Kontrak antarmodul

- **§7.2 — `src/services/stock.ts`** (milik M3): `recordStockIn`, `recordStockOut`,
  `getAvailableStock`. Saat ini **stub** (prinsip stub-first §12.2) — M3 tahap 2
  mengganti isi, tanda tangan tidak boleh diubah sepihak.
- **§7.3 — `src/services/journal.ts`** (milik M5): `createJournalEntry` sudah
  **implementasi penuh** (validasi keseimbangan, translate kode akun, nomor `JV`,
  tulis `journal_entries` + `journal_lines`). M5 memverifikasi/mengeraskan
  implementasi ini pada tahap 2. **Satu-satunya jalur tulis jurnal** — seed J0
  pun melalui fungsi ini (aturan K-2).
- **§7.5** — penandaan pelunasan: `markGoodsReceiptPaid` (M2) dan
  `markInvoicePaid` (M4) dipanggil M5; M5 dilarang menulis tabel M2/M4 langsung.

### Aturan K-2 (dipertajam)

Segala penulisan (`insert`/`update`/`delete`/`truncate`/SQL kasar) ke **tabel
milik modul lain** atau **kolom milik modul lain** dilarang:

- `products.stok_saat_ini` & `products.harga_pokok_rata_rata` kelola M3 —
  semua tulis lewat `recordStockIn/Out`. Form master produk M1 tidak memiliki
  input untuk keduanya (§8.2) dan modul lain juga tidak boleh menyentuhnya
  secara langsung.
- `goods_receipts.status_bayar` hanya diubah lewat `markGoodsReceiptPaid()`;
  `invoices.status_bayar` hanya lewat `markInvoicePaid()` (§7.5).
- `stock_movements` dan `journal_lines` hanya lewat fungsi layanan pemiliknya
  (§7.2/§7.3) — termasuk di dalam seed.
- Baca (`SELECT`) ke tabel mana pun bebas (K-1), melalui query berparameter
  Drizzle (NF-5).

### Wilayah berkas per modul (PRD §11.3)

Setiap kelompok hanya menyunting berkas di wilayahnya sendiri: skema milik
`src/db/schema/<modul>.ts`, halaman di `src/app/(dashboard)/<modul>/`, komponen
di `src/components/<modul>/`, validasi Zod di `src/lib/validations/<modul>.ts`.
Layout `(dashboard)/layout.tsx` memuat menu sebagai **satu baris per modul** —
sunting baris milik kelompok Anda saja.

### Migrasi

`drizzle-kit generate`/`push` dijalankan **hanya oleh M1** pada titik
sinkronisasi (§12.3) — berkas migrasi ada di `drizzle/`. Modul lain cukup
menjalankan `npm run db:push` ketika migrasi baru diumumkan.

## Struktur direktori

Lihat `docs/PRD.md` §11.3 — diikuti persis, di antaranya:
`src/app/(auth)/login`, `src/app/(dashboard)/**`, `src/components/ui` (shadcn,
milik M1), `src/db/schema/{master,purchasing,inventory,sales,finance}.ts`,
`src/services/{numbering,audit,stock,journal}.ts`, `src/lib/auth-guard.ts`,
`src/lib/format.ts`, dan folder migrasi `drizzle/`.

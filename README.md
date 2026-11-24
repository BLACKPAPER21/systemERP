# SystemERP — Sistem ERP Terintegrasi untuk UMKM Retail/Distribusi

Enam modul, satu basis data, dikerjakan enam kelompok secara paralel.
Sumber kebenaran: `docs/PRD.md`.

## Status modul

| Modul | Lingkup | Kelompok | Status |
|:-----:|---------|----------|--------|
| **M1** | Master data, RBAC, log audit, layanan bersama | BLACKPAPER21 | **Di `main`** |
| **M2** | Pembelian — PO, penerimaan barang (GRN), dan hutang | [musaytir](https://github.com/musaytir) | **Tersedia pada versi ini** — lihat [panduan M2](docs/M2-PEMBELIAN.md) |
| **M3** | Persediaan — kartu stok, opname, HPP rata-rata | — | Belum lengkap; `recordStockIn` sudah tersedia untuk M2, layanan lainnya masih stub |
| **M4** | Penjualan — SO & invoicing | ianfjrianto | **Di `main`** — lihat [catatan integrasi](#catatan-integrasi-yang-masih-terbuka) |
| **M5** | Keuangan — jurnal, buku besar, beban, laporan, pembayaran | ur-ran | **Di `main`** (`docs/M5-KEUANGAN.md`) |
| **M6** | Dashboard manajerial & penelusuran jurnal | NejadProgram | **Di `main`** |

Menu **Pesanan Pembelian**, **Penerimaan Barang**, dan **Hutang Supplier** sudah tersedia. Halaman **Kartu Stok** M3 belum tersedia.

## Modul M2 — Pembelian

Modul M2 mendukung proses pembelian dari pembuatan pesanan kepada supplier
hingga pencatatan penerimaan barang dan pemantauan hutang. Modul ini memakai
basis data dan layanan bersama SystemERP.

- **Pesanan pembelian (PO):** membuat dan mengubah draft, melihat detail,
  memfilter daftar berdasarkan supplier atau status, menyetujui, dan membatalkan
  PO yang belum memiliki penerimaan.
- **Penerimaan barang (GRN):** mencatat penerimaan sebagian atau seluruhnya
  berdasarkan PO yang disetujui. Draft dapat diubah atau dihapus sebelum
  diposting; jumlah pada draft mencadangkan sisa kuantitas PO.
- **Stok dan jurnal:** saat GRN diposting, sistem mencatat stok masuk,
  memperbarui harga pokok rata-rata, dan membuat jurnal persediaan serta hutang
  dalam satu transaksi.
- **Hutang supplier:** menampilkan penerimaan yang sudah diposting dan belum
  lunas. Pelunasan penuh dilakukan melalui modul Keuangan (M5).

Panduan alur penggunaan, hak akses, konfigurasi, dan pengujian tersedia di
[Panduan M2 — Pembelian](docs/M2-PEMBELIAN.md).

## Kontribusi

| Kontributor | Modul |
|-------------|-------|
| [BLACKPAPER21](https://github.com/BLACKPAPER21) | M1 — Master data dan layanan bersama |
| [musaytir](https://github.com/musaytir) | M2 — Pembelian dan integrasi PO, GRN, stok, jurnal, serta hutang |
| [ianfjrianto](https://github.com/ianfjrianto) | M4 — Penjualan |
| [ur-ran](https://github.com/ur-ran) | M5 — Keuangan |
| [NejadProgram](https://github.com/NejadProgram) | M6 — Dashboard dan penelusuran jurnal |

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

Salin `.env.example` menjadi `.env.local`, lalu isi:

```ini
DATABASE_URL=postgresql://...        # Neon, atau PostgreSQL lokal
AUTH_SECRET=...                      # contoh: openssl rand -base64 32
```

```sh
npm i            # pasang dependensi
npm run db:push  # terapkan skema ke basis data
npm run db:seed  # KHUSUS database demo BARU: hapus semua data dan isi data contoh + jurnal J0
npm run dev      # buka http://localhost:3000
```

> **Peringatan:** `db:seed` menjalankan `TRUNCATE ... CASCADE` dan menghapus data seluruh modul. Jangan jalankan pada database yang berisi data penting. Cadangkan database sebelum perubahan skema.

Skrip tersedia: `dev`, `db:local`, `build`, `start`, `db:generate`, `db:push`,
`db:seed`.

### Tanpa Neon — PostgreSQL lokal di dalam proses

`npm run db:local` menjalankan PGlite sebagai server protokol-wire PostgreSQL di
`127.0.0.1:5432` (data tersimpan di `.pgdata/`, sudah di-gitignore). Berguna
untuk mengembangkan tanpa koneksi internet. Jalankan di terminal terpisah, lalu
arahkan `DATABASE_URL` ke sana:

```ini
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
```

Setelah itu `npm run db:push`; jalankan `npm run db:seed` hanya pada database demo baru. PGlite hanya mendukung satu koneksi: pool aplikasi pada localhost dibatasi satu koneksi. Jangan menjalankan perintah database lain bersamaan dengan aplikasi; untuk penggunaan multi-pengguna gunakan PostgreSQL/Neon. Pada PostgreSQL lokal sungguhan, `DB_POOL_MAX` dapat diatur jika diperlukan.

> `.env.local` **tidak pernah di-commit** — `.gitignore` memblokir `.env*` (NF-6).

### Menjalankan build produksi secara lokal

`next start` berjalan dalam mode produksi, dan Auth.js menolak host yang tidak
dipercaya (`UntrustedHost`) sehingga semua rute `/api/auth/*` membalas 500.
Tambahkan alamat yang dipakai ke `.env.local`:

```ini
AUTH_URL=http://127.0.0.1:3000
```

Di `next dev` hal ini tidak diperlukan. Saat dideploy, setel `AUTH_URL` ke
domain sebenarnya.

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

## Halaman yang sudah berjalan

| Rute | Modul | Peran yang diizinkan |
|------|:-----:|----------------------|
| `/` — Dashboard manajerial | M6 | owner, keuangan |
| `/jurnal/[id]` — penelusuran jurnal ke dokumen sumber | M6 | owner, keuangan |
| `/master/produk`, `/supplier`, `/pelanggan`, `/akun` | M1 | sesuai PRD §4.2 |
| `/master/pengguna` | M1 | owner |
| `/audit` — log audit | M1 | owner |
| `/pembelian/po` — PO, detail, buat/ubah | M2 | owner (buat/ubah/setujui/batal); gudang dan keuangan (lihat) |
| `/pembelian/grn` — GRN, detail, buat/ubah/posting | M2 | gudang (buat/ubah/posting); owner dan keuangan (lihat) |
| `/pembelian/hutang` — daftar hutang supplier | M2 | owner, keuangan |
| `/penjualan/so` — daftar SO | M4 | keempat peran (lihat) |
| `/penjualan/so/buat` | M4 | owner, sales |
| `/penjualan/so/[id]` — detail & konfirmasi SO | M4 | keempat peran (lihat) |
| `/penjualan/so/invoice` — faktur penjualan | M4 | owner, sales, keuangan |
| `/keuangan/jurnal`, `/buku-besar`, `/beban`, `/laporan`, `/pembayaran` | M5 | owner, keuangan |
| `/login` | M1 | publik |

Tanpa sesi, `/` membalas 307 ke `/login` — penjagaan ada di
`(dashboard)/layout.tsx` (NF-2), bukan di halaman root.

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
  `getAvailableStock`. `recordStockIn` telah dilengkapi untuk transaksi GRN M2; `recordStockOut` dan `getAvailableStock` masih **stub** dan menunggu M3. Tanda tangan tidak boleh diubah sepihak.
- **§7.3 — `src/services/journal.ts`** (milik M5): `createJournalEntry`
  **implementasi penuh** (validasi keseimbangan, translate kode akun, nomor `JV`,
  tulis `journal_entries` + `journal_lines`). **Satu-satunya jalur tulis jurnal** —
  seed J0 pun melalui fungsi ini (aturan K-2). M5 juga menambahkan
  `src/services/payment.ts` untuk pembayaran masuk/keluar dan beban.
- **§7.5** — penandaan pelunasan: `markGoodsReceiptPaid` (M2) dan
  `markInvoicePaid` (M4) dipanggil M5; untuk GRN, M5 kini menggunakan fungsi M2. Penandaan invoice masih menjadi pekerjaan integrasi M4/M5.

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

## Catatan integrasi yang masih terbuka

M4 sudah berada di `main` agar kelompok lain tidak terblokir, tetapi belum
memakai kontrak antarmodul. Semuanya lolos `build` dan `tsc`, jadi tidak
tertangkap pemeriksaan otomatis — perbaikan menjadi tugas kelompok M4:

| # | Masalah | Akibat | Perbaikan |
|:-:|---------|--------|-----------|
| 1 | `generateInvoiceAndCutStock` tidak memanggil `createJournalEntry`; `invoices.journal_entry_id` dan `journal_entry_hpp_id` dibiarkan `NULL` | Invoice berstatus `posted` tanpa J3 (piutang) dan J4 (HPP) — buku besar serta laporan M5 tidak melihat penjualan, padahal dashboard M6 sudah menampilkan piutangnya | Terbitkan jurnal lewat `createJournalEntry` di dalam transaksi yang sama (§7.3) |
| 2 | Stok dipotong dengan `UPDATE products.stok_saat_ini` langsung | Melanggar aturan K-2; tidak ada baris `stock_movements`, sehingga Kartu Stok M3 tidak mencatat penjualan | Panggil `recordStockOut` (§7.2) — menunggu M3 mengganti stub |
| 3 | Nomor SO/invoice dibuat dengan `Math.random()` 4 digit | Kolom `nomor` **unique**; tabrakan membuat pembuatan SO gagal | Pakai `generateDocNumber(tx, prefix)` milik M1 |
| 4 | `createSO` belum memakai validasi Zod, dan HPP masih memakai perkiraan "70% harga jual" | Masukan tak tervalidasi di batas kepercayaan (melanggar NF-4); nilai HPP tidak dapat dipertanggungjawabkan | Buat `src/lib/validations/penjualan.ts` dan ambil HPP dari `harga_pokok_rata_rata` milik M3 |

Penjaga peran NF-3 untuk M4 **sudah dipasang** saat penggabungan (halaman buat
SO dan halaman invoice, serta `createSO`, `confirmSO`,
`generateInvoiceAndCutStock`) mengikuti matriks akses PRD §4.2.

## Struktur direktori

Lihat `docs/PRD.md` §11.3 — diikuti persis, di antaranya:
`src/app/(auth)/login`, `src/app/(dashboard)/**`, `src/components/ui` (shadcn,
milik M1), `src/db/schema/{master,purchasing,inventory,sales,finance}.ts`,
`src/services/{numbering,audit,stock,journal}.ts`, `src/lib/auth-guard.ts`,
`src/lib/format.ts`, dan folder migrasi `drizzle/`.

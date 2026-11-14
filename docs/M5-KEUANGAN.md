# Modul Keuangan (M5 — Finance) - SystemERP

Dokumentasi lengkap implementasi modul **M5 — Keuangan (Finance)** sesuai dengan PRD SystemERP.

---

## 1. Struktur File Modul M5

Semua file modul M5 ditempatkan rapi di folder khusus tanpa mengganggu modul lain (sesuai aturan pembagian wilayah file PRD §11.3):

```text
src/
├── app/(dashboard)/keuangan/
│   ├── actions.ts              # Server Actions (bayar hutang, terima piutang, catat beban)
│   ├── jurnal/page.tsx         # Halaman Jurnal Umum (Daftar semua jurnal transaksi)
│   ├── pembayaran/page.tsx     # Halaman Pelunasan Hutang (GRN) & Piutang (Invoice)
│   ├── beban/page.tsx          # Halaman Catat Beban Operasional
│   ├── buku-besar/page.tsx     # Halaman Buku Besar (8 Akun COA & Mutasi)
│   └── laporan/page.tsx        # Halaman Laporan Laba Rugi & Neraca
├── components/keuangan/
│   ├── pembayaran-keluar-dialog.tsx  # Dialog Pelunasan Hutang Supplier (J2)
│   ├── pembayaran-masuk-dialog.tsx   # Dialog Pelunasan Piutang Pelanggan (J5)
│   └── beban-dialog.tsx              # Dialog Catat Beban Operasional (J6)
├── lib/validations/
│   └── keuangan.ts             # Skema validasi server-side Zod (NF-4)
└── services/
    └── payment.ts              # Service akuntansi: pelunasan & pencatatan jurnal
```

---

## 2. Cakupan Fitur Sesuai PRD §5.5

### 💰 A. Jurnal Umum & Buku Besar Otomatis
- **Jurnal Umum (`/keuangan/jurnal`)**:
  - Menampilkan seluruh jurnal transaksi akuntansi dengan nomor format `JV/YYYY/MM/XXXX`.
  - Filter pencarian nomor jurnal & keterangan, serta rentang tanggal.
  - Tabel rincian baris debit/kredit per entri (menampilkan kode akun, nama akun, debit, kredit).
- **Buku Besar (`/keuangan/buku-besar`)**:
  - 8 Akun standar COA (`1-100` s.d `5-200`).
  - Perhitungan saldo debit, kredit, dan saldo akhir berdasarkan saldo normal akun (debit/kredit).
  - Tampilan detail transaksi mutasi saat akun diklik (`?akun=1-100`).

### 💳 B. Pembayaran & Pelunasan Hutang - Piutang (`/keuangan/pembayaran`)
- **Pelunasan Hutang Supplier (J2)**:
  - Otomatis membaca Penerimaan Barang (GRN) berstatus `posted` yang belum dilunasi.
  - Dialog pelunasan penuh: mencatat pembayaran keluar dan membentuk jurnal:
    - **Debit**: `2-100` Hutang Usaha
    - **Kredit**: `1-100` Kas & Bank
  - Menandai GRN sebagai lunas (`markGoodsReceiptPaid`).
- **Pelunasan Piutang Pelanggan (J5)**:
  - Otomatis membaca Faktur Penjualan (Invoice) berstatus `posted` yang belum dilunasi.
  - Dialog pelunasan penuh: mencatat pembayaran masuk dan membentuk jurnal:
    - **Debit**: `1-100` Kas & Bank
    - **Kredit**: `1-200` Piutang Usaha
  - Menandai Invoice sebagai lunas (`markInvoicePaid`).
- **Riwayat Pembayaran**:
  - Menampilkan riwayat transaksi pembayaran lengkap dengan badge tipe, metode, tanggal, dan format Rupiah.

### 📉 C. Beban Operasional (`/keuangan/beban`)
- Mencatat pengeluaran operasional (seperti listrik, air, internet, ATK).
- Otomatis membentuk jurnal **J6**:
  - **Debit**: `5-200` Beban Operasional
  - **Kredit**: `1-100` Kas & Bank
- Menampilkan total beban akumulasi dan tabel riwayat pengeluaran.

### 📊 D. Laporan Laba Rugi & Neraca (`/keuangan/laporan`)
- **Laporan Laba Rugi**:
  - Pendapatan Penjualan (`4-100`)
  - Harga Pokok Penjualan (`5-100`)
  - **Laba Kotor** = Pendapatan − HPP
  - Beban Operasional (`5-200`)
  - **Laba Bersih** = Laba Kotor − Beban Operasional
- **Neraca (Balance Sheet)**:
  - **Aset**: Kas & Bank (`1-100`) + Piutang Usaha (`1-200`) + Persediaan Barang (`1-300`)
  - **Liabilitas**: Hutang Usaha (`2-100`)
  - **Ekuitas**: Modal Pemilik (`3-100`) + Laba Bersih Tahun Berjalan
  - **Validasi Mutlak**: Total Aset = Total Liabilitas + Ekuitas
  - Banner visual status keseimbangan: **HIJAU (Seimbang)** jika $\text{Aset} = \text{Liabilitas} + \text{Ekuitas}$, atau **MERAH** jika terjadi selisih.
  - Tabel panduan angka referensi PRD §13.1 untuk validasi lab/dosen.

---

## 3. Akun Pengguna Demo (Kata Sandi: `demo123`)

| Peran | Email | Hak Akses Modul Keuangan |
|---|---|---|
| **Owner** | `owner@demo.id` | Akses penuh seluruh modul & persetujuan |
| **Staf Keuangan** | `keuangan@demo.id` | Akses penuh modul Keuangan (`/keuangan/*`) |
| **Staf Gudang** | `gudang@demo.id` | Khusus gudang (tidak dapat mengakses keuangan) |
| **Sales** | `sales@demo.id` | Khusus penjualan (tidak dapat mengakses keuangan) |

---

## 4. Cara Menjalankan Secara Lokal

1. **Jalankan Database Lokal (PGlite)**:
   ```powershell
   node src/db/local-pg.cjs
   ```
2. **Jalankan Aplikasi Next.js**:
   ```powershell
   npm run dev
   ```
3. Buka browser di [http://localhost:3000](http://localhost:3000) dan masuk dengan akun `keuangan@demo.id` atau `owner@demo.id`.


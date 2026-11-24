# Panduan M2 — Pembelian (PO & Penerimaan Barang)

## Yang tersedia

M2 menggunakan database dan skema yang sama dengan modul lain: `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `products`, `suppliers`, `stock_movements`, `journal_entries`, dan tabel terkait. Tabel M2 sudah ada pada skema bawaan proyek; tidak dibuat database kedua dan tidak diperlukan migrasi baru khusus M2. File ZIP proyek berisi skema/kode, bukan salinan database pengguna yang sudah terisi.

- **PO:** membuat dan mengubah draft, melihat daftar dan detail, filter supplier/status, menyetujui, membatalkan PO tanpa GRN.
- **GRN:** membuat dan mengubah draft berdasarkan PO yang disetujui, penerimaan sebagian, menghapus draft, posting, daftar dan detail.
- **Hutang:** daftar GRN yang diposting dan belum lunas. Pembayaran penuh dilakukan di menu Keuangan → Pembayaran.
- Seluruh nominal dan kuantitas dibatasi dua desimal. Harga barang pada GRN mengikuti harga PO. Draft GRN mencadangkan kuantitas sehingga total draft dan yang sudah diposting tidak melebihi PO; menghapus draft melepaskan cadangan.
- Posting GRN mencatat pergerakan stok masuk, menghitung rata-rata harga pokok, dan membentuk jurnal J1 **Debit 1-300 Persediaan / Kredit 2-100 Hutang Usaha** dalam satu transaksi. Bila salah satu gagal, semua dibatalkan.
- PO otomatis berstatus `received` setelah semua barang diposting. GRN yang telah diposting tidak bisa diubah atau dihapus. Semua aksi dicatat di log audit.

## Hak akses

| Peran | PO | GRN | Hutang |
|---|---|---|---|
| Owner | Lihat, buat/ubah draft, setujui, batal | Lihat | Lihat |
| Gudang | Lihat | Lihat, buat/ubah/hapus draft, posting | Tidak ada akses |
| Keuangan | Lihat | Lihat | Lihat dan membayar lewat menu Keuangan |
| Sales | Tidak ada akses | Tidak ada akses | Tidak ada akses |

## Menjalankan proyek di Windows

Buka terminal pada folder proyek, lalu:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Buka `.env.local` dan isi `DATABASE_URL` dengan PostgreSQL/Neon yang digunakan semua modul. Isi juga `AUTH_SECRET` dengan nilai acak yang aman. Jika menjalankan mode produksi lokal, tambahkan `AUTH_URL=http://127.0.0.1:3000`.

Bila memakai database PostgreSQL lokal bawaan proyek (PGlite), jalankan di terminal pertama:

```powershell
npm run db:local
```

Isi `.env.local` dengan `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres`. Biarkan terminal database tetap berjalan. Di terminal lain jalankan:

```powershell
npm run db:push
```

Perintah `db:push` menerapkan skema yang sama untuk seluruh modul; periksa perubahan yang ditampilkan dan cadangkan database yang sudah berisi data terlebih dahulu.

**Data contoh hanya untuk database baru/kosong:** sebelum menjalankan aplikasi, `npm run db:seed` dapat dipakai untuk membuat akun dan data demo. Perintah ini menghapus seluruh data di database melalui `TRUNCATE ... CASCADE`. Jangan jalankan pada database yang ingin dipertahankan. Bila database sudah memiliki data master, pengguna, dan bagan akun, gunakan data yang ada tanpa seed.

```powershell
npm run dev
```

Buka `http://localhost:3000`.

PGlite bersifat satu koneksi. Pool aplikasi pada `localhost` otomatis dibatasi satu koneksi. Jangan menjalankan `db:push`, `db:seed`, aplikasi kedua, atau klien database lain bersamaan dengan aplikasi yang sedang aktif. Untuk penggunaan bersama atau pengujian transaksi pada beberapa proses, gunakan PostgreSQL/Neon yang sesungguhnya. `DB_POOL_MAX` dapat disetel pada PostgreSQL biasa; jangan menaikkannya saat memakai PGlite.

## Contoh alur demo

Jika memakai data seed, semua kata sandi akun demo adalah `demo123`.

1. Masuk sebagai `owner@demo.id`. Buka **Pesanan Pembelian → Buat PO**, pilih supplier, isi produk, jumlah dan harga, lalu simpan dan **Setujui PO**. Stok belum berubah.
2. Keluar dan masuk sebagai `gudang@demo.id`. Buka **Penerimaan Barang → Buat penerimaan** dan pilih PO. Isi jumlah yang datang, simpan draft, periksa, lalu **Posting GRN**. Penerimaan dapat dicatat beberapa kali sampai jumlah PO terpenuhi.
3. Masuk sebagai `keuangan@demo.id`. Buka **Hutang Supplier** untuk melihat GRN yang belum lunas atau **Pembayaran** untuk melunasinya. Pembayaran bawaan M5 hanya mendukung pelunasan penuh per GRN.
4. Buka detail GRN untuk melihat status dan tautan ke jurnal penerimaan (owner/keuangan).

## Batas integrasi dengan modul lain

- Fungsi `recordStockIn` pada `src/services/stock.ts` dilengkapi agar posting M2 benar-benar mencatat stok, sesuai kontrak M3. Fungsi keluar dan pemeriksaan stok lainnya masih stub, dan halaman Kartu Stok/stock opname M3 belum tersedia. Saat M3 selesai, kelompok M3 perlu menggabungkan implementasi dengan kontrak yang sama dan menguji ulang M2.
- M4 pada proyek asal masih memiliki masalah integrasi yang dijelaskan di README. Pengurangan stok dan jurnal penjualan belum mengikuti kontrak lengkap; jangan menyimpulkan alur penjualan sudah terintegrasi penuh.
- Pada M5, pembayaran GRN memanggil `markGoodsReceiptPaid` milik M2. Pembayaran dilakukan penuh per GRN.
- Skema di dalam ZIP bukan data dari server Neon/database lain. Jika ada database lain yang ingin digabung, ekspor datanya perlu disediakan dan dicocokkan terlebih dahulu.

## Uji integrasi pengembang

`tests/m2-integration.ts` menguji PO, penerimaan bertahap, validasi, edit draft, stok, HPP, jurnal, pembayaran, rollback, pembulatan, dan permintaan bersamaan pada database uji. **Gunakan database uji yang terpisah dan baru di-seed** karena pengujian menambah data dan sempat mengubah kode salah satu akun uji. Jangan arahkan ke database penting.

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
$env:M2_TEST_DATABASE_RESET_OK="yes"
node --import tsx tests/m2-integration.ts
```

Pengujian lokal di PGlite dilakukan melalui satu pool aplikasi. Pengujian multi-proses pada PostgreSQL/Neon masih perlu dilakukan di lingkungan target.

## Peringatan versi framework

Proyek asal memakai Next.js 16.4.4. Versi tersebut tercantum dalam sejumlah advisori keamanan Next.js; misalnya [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) yang diperbaiki pada 16.4.5. Dampak spesifik bergantung pada fitur dan konfigurasi deployment. Sebelum dipakai secara publik, perbarui dan uji versi Next.js yang telah diperbaiki bersama tim proyek.

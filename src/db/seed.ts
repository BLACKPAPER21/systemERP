/* MILIK M1 — Seed data awal (PRD §9.5–9.6, §13 scenário demo; ceklis B.2).
 *
 * IDEMPOTENT: reset seluruh data mulainya (TRUNCATE CASCADE), lalu isi ulang.
 * Isi:
 *  - 8 akun bagan akun terkunci (§9.5)
 *  - 4 pengguna demo peran owner/gudang/sales/keuangan (kata sandi: demo123)
 *  - Produk contoh termasuk BRG-001 (stok 0, harga jual Rp 80.000, stok minimum 5)
 *  - Supplier "Toko Sumber Jaya", pelanggan "Warung Bu Siti" (data demo §13)
 *  - Jurnal J0 setoran modal Rp 1.000.000 dibuat MELALUI createJournalEntry()
 *    milik M5 — BUKAN insert journal_lines langsung (aturan K-2 tetap berlaku
 *    pada seed! §9.6).
 *
 * Jalankan: npm run db:seed
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

import * as schema from "./schema";
import { createJournalEntry } from "../services/journal";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tidak ditemukan — isi .env.local terlebih dahulu.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log("== SystemERP seed: mulai ==");

  await db.transaction(async (tx) => {
    // ==== 0) RESET — idempotent (PRD: "reset data dulu") ====
    await tx.execute(sql`
      TRUNCATE TABLE
        users, products, suppliers, customers, accounts, audit_logs,
        docnumber_counters,
        purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items,
        stock_movements, stock_opnames, stock_opname_items,
        sales_orders, sales_order_items, invoices,
        journal_entries, journal_lines, payments
      RESTART IDENTITY CASCADE
    `);
    console.log("Reset data awal: selesai");

    // ==== 1) Bagan akun terkunci — 8 akun (§9.5) ====
    await tx.insert(schema.accounts).values([
      { kode: "1-100", nama: "Kas & Bank", tipe: "aset", saldoNormal: "debit" },
      { kode: "1-200", nama: "Piutang Usaha", tipe: "aset", saldoNormal: "debit" },
      { kode: "1-300", nama: "Persediaan Barang", tipe: "aset", saldoNormal: "debit" },
      { kode: "2-100", nama: "Hutang Usaha", tipe: "liabilitas", saldoNormal: "kredit" },
      { kode: "3-100", nama: "Modal Pemilik", tipe: "ekuitas", saldoNormal: "kredit" },
      { kode: "4-100", nama: "Pendapatan Penjualan", tipe: "pendapatan", saldoNormal: "kredit" },
      { kode: "5-100", nama: "Harga Pokok Penjualan", tipe: "beban", saldoNormal: "debit" },
      { kode: "5-200", nama: "Beban Operasional", tipe: "beban", saldoNormal: "debit" },
    ]);
    console.log("8 akun bagan akun terisi");

    // ==== 2) Empat pengguna demo — empat peran (kata sandi: demo123) ====
    const passwordHash = await bcrypt.hash("demo123", 10);
    const usersSeed = await tx
      .insert(schema.users)
      .values([
        { nama: "Bu Fitri (Owner)", email: "owner@demo.id", passwordHash, peran: "owner", aktif: true },
        { nama: "Pak Budi (Gudang)", email: "gudang@demo.id", passwordHash, peran: "gudang", aktif: true },
        { nama: "Dina (Sales)", email: "sales@demo.id", passwordHash, peran: "sales", aktif: true },
        { nama: "Rina (Keuangan)", email: "keuangan@demo.id", passwordHash, peran: "keuangan", aktif: true },
      ])
      .returning({ id: schema.users.id, peran: schema.users.peran });

    const ownerId = usersSeed.find((u) => u.peran === "owner")!.id;
    console.log("4 pengguna demo terisi (owner/gudang/sales/keuangan)");

    // ==== 3) Supplier & pelanggan demo (§13) ====
    await tx.insert(schema.suppliers).values([
      {
        kode: "SUP-001",
        nama: "Toko Sumber Jaya",
        telepon: "0812345670",
        alamat: "Jl. Pasar Baru 12",
        aktif: true,
      },
    ]);

    await tx.insert(schema.customers).values([
      {
        kode: "CUS-001",
        nama: "Warung Bu Siti",
        telepon: "0812345671",
        alamat: "Jl. Merdeka 8",
        aktif: true,
      },
    ]);
    console.log("Supplier & pelanggan demo terisi");

    // ==== 4) Produk contoh — BRG-001 sesuai §13; stok & HPP milik M3 (tetap 0) ====
    await tx.insert(schema.products).values([
      {
        sku: "BRG-001",
        nama: "Beras Premium 5kg",
        satuan: "pcs",
        hargaJual: "80000.00",
        stokMinimum: "5.00",
        aktif: true,
        // stok_saat_ini & harga_pokok_rata_rata memang 0 — diisi oleh M3
      },
      {
        sku: "BRG-002",
        nama: "Gula Pasir 1kg",
        satuan: "pcs",
        hargaJual: "18000.00",
        stokMinimum: "10.00",
        aktif: true,
      },
      {
        sku: "BRG-003",
        nama: "Minyak Goreng 1L",
        satuan: "pcs",
        hargaJual: "20000.00",
        stokMinimum: "10.00",
        aktif: true,
      },
    ]);
    console.log("Produk contoh terisi (BRG-001 dst.)");

    // ==== 5) J0 — setoran modal awal Rp 1.000.000 (§9.6) ====
    // DIBUAT MELALUI createJournalEntry (M5), bukan insert journal_lines langsung.
    const j0 = await createJournalEntry(tx, {
      tanggal: new Date(),
      keterangan: "Setoran modal awal pemilik",
      refType: "opening_balance",
      refId: null,
      userId: ownerId,
      lines: [
        { accountCode: "1-100", debit: 1_000_000, kredit: 0 },
        { accountCode: "3-100", debit: 0, kredit: 1_000_000 },
      ],
    });
    console.log(
      `J0 setoran modal terbentuk via createJournalEntry: ${j0.nomor} (id=${j0.journalEntryId})`,
    );
  });

  console.log("== SystemERP seed: selesai ==");
  console.log("Akun demo — kata sandi semua: demo123");
  console.log("  owner@demo.id | gudang@demo.id | sales@demo.id | keuangan@demo.id");
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Seed gagal:", err instanceof Error ? err.message : err);
    try {
      await pool.end();
    } finally {
      process.exit(1);
    }
  });

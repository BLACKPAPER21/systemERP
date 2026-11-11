import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* =============== MILIK M1 — MASTER DATA ===============
 * Definisi kolom PERSIS PRD §8.4. Semua nilai uang/qty memakai
 * numeric(14,2), bukan float (§8.5).
 */

// ==== ENUMS (milik M1) ====

export const userPeranEnum = pgEnum("user_peran", [
  "owner",
  "gudang",
  "sales",
  "keuangan",
]);

export const auditAksiEnum = pgEnum("audit_aksi", [
  "create",
  "update",
  "post",
  "cancel",
]);

export const accountTipeEnum = pgEnum("account_tipe", [
  "aset",
  "liabilitas",
  "ekuitas",
  "pendapatan",
  "beban",
]);

export const saldoNormalEnum = pgEnum("saldo_normal", ["debit", "kredit"]);

// ==== TABLES (milik M1) ====

/** `users` — PRD §8.4 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // bcrypt — NF-1
  peran: userPeranEnum("peran").notNull(),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .defaultNow(),
});

/** `products` — PRD §8.4. Dua kolom dikecualikan (§8.2):
 * `stok_saat_ini` dan `harga_pokok_rata_rata` dimiliki dan dihitung M3;
 * M1 tidak boleh menjadikannya input di form master produk.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  nama: text("nama").notNull(),
  satuan: text("satuan").notNull(),
  hargaJual: numeric("harga_jual", { precision: 14, scale: 2 }).notNull(),
  // --- milik M3 (§8.2) — M1 hanya membaca ---
  hargaPokokRataRata: numeric("harga_pokok_rata_rata", {
    precision: 14,
    scale: 2,
  })
    .notNull()
    .default("0"),
  stokSaatIni: numeric("stok_saat_ini", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  // --- end milik M3 ---
  stokMinimum: numeric("stok_minimum", { precision: 14, scale: 2 }).notNull(),
  aktif: boolean("aktif").notNull().default(true),
});

/** `suppliers` — PRD §8.4 (struktur serupa dengan `customers`) */
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  kode: text("kode").notNull().unique(),
  nama: text("nama").notNull(),
  telepon: text("telepon"),
  alamat: text("alamat"),
  aktif: boolean("aktif").notNull().default(true),
});

/** `customers` — PRD §8.4 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  kode: text("kode").notNull().unique(),
  nama: text("nama").notNull(),
  telepon: text("telepon"),
  alamat: text("alamat"),
  aktif: boolean("aktif").notNull().default(true),
});

/** `accounts` — bagan akun terkunci 8 akun (§9.5); diisi melalui seed, bukan pengguna */
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  kode: text("kode").notNull().unique(),
  nama: text("nama").notNull(),
  tipe: accountTipeEnum("tipe").notNull(),
  saldoNormal: saldoNormalEnum("saldo_normal").notNull(),
});

/** `audit_logs` — ditulis SEMUA modul hanya melalui logAudit() milik M1 (NF-10) */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  aksi: auditAksiEnum("aksi").notNull(),
  entitas: text("entitas").notNull(), // nama tabel
  entitasId: integer("entitas_id").notNull(),
  waktu: timestamp("waktu", { mode: "date" }).notNull().defaultNow(),
  detail: jsonb("detail"),
});

/** `docnumber_counters` — infrastruktur penomoran dokumen milik M1 (§9.7).
 * Bukan bagian dari 15 tabel operasional §8.1; hanya dibaca/ditulis di dalam
 * generateDocNumber() milik M1. Baris penghitung dikunci FOR UPDATE agar
 * dua dokumen bersamaan tidak berbagi nomor yang sama.
 */
export const docnumberCounters = pgTable(
  "docnumber_counters",
  {
    id: serial("id").primaryKey(),
    prefix: text("prefix").notNull(),
    periode: text("periode").notNull(), // "YYYY-MM" — nomor urut reset per bulan
    urut: integer("urut").notNull().default(0),
  },
  (table) => [uniqueIndex("docnumber_counters_prefix_periode_uq").on(table.prefix, table.periode)],
);

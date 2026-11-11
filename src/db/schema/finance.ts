import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { accounts, users } from "./master";

/* =============== MILIK M5 — KEUANGAN ===============
 * Definisi kolom PERSIS PRD §8.4. numeric(14,2) untuk semua uang/qty (§8.5).
 * Tabel ini di-definisikan di Fase 0 oleh M1; logika tulisnya melalui
 * createJournalEntry() milik M5 (§7.3). Migrasi Dijalankan HANYA M1 (§12.3).
 */

export const journalRefTypeEnum = pgEnum("journal_ref_type", [
  "opening_balance",
  "goods_receipt",
  "invoice",
  "invoice_hpp",
  "payment",
  "expense",
  "stock_opname",
]);

export const paymentTipeEnum = pgEnum("payment_tipe", ["in", "out"]);

export const paymentRefTypeEnum = pgEnum("payment_ref_type", [
  "invoice",
  "goods_receipt",
]);

export const paymentMetodeEnum = pgEnum("payment_metode", ["kas", "transfer"]);

/** `journal_entries` — PRD §8.4 */
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // JV/2026/11/0001
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  keterangan: text("keterangan").notNull(),
  refType: journalRefTypeEnum("ref_type").notNull(),
  refId: integer("ref_id"), // penelusuran ke dokumen sumber (§8.4)
  totalDebit: numeric("total_debit", { precision: 14, scale: 2 }).notNull(),
  totalKredit: numeric("total_kredit", { precision: 14, scale: 2 }).notNull(), // wajib = totalDebit (AB-10)
  dibuatOleh: integer("dibuat_oleh")
    .notNull()
    .references(() => users.id),
});

/** `journal_lines` — PRD §8.4 */
export const journalLines = pgTable(
  "journal_lines",
  {
    id: serial("id").primaryKey(),
    journalEntryId: integer("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    debit: numeric("debit", { precision: 14, scale: 2 }).notNull(), // nol bila baris ini kredit
    kredit: numeric("kredit", { precision: 14, scale: 2 }).notNull(), // nol bila baris ini debit
    keterangan: text("keterangan"),
  },
  (table) => [index("journal_lines_journal_entry_id_idx").on(table.journalEntryId)], // NF-14
);

/** `payments` — PRD §8.4 */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // PAY/2026/11/0001
  tipe: paymentTipeEnum("tipe").notNull(), // in (dari pelanggan) | out (ke supplier)
  refType: paymentRefTypeEnum("ref_type").notNull(),
  refId: integer("ref_id").notNull(), // dokumen yang dilunasi
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  jumlah: numeric("jumlah", { precision: 14, scale: 2 }).notNull(),
  metode: paymentMetodeEnum("metode").notNull(),
  journalEntryId: integer("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id),
  dicatatOleh: integer("dicatat_oleh")
    .notNull()
    .references(() => users.id),
});

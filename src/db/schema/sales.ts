import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { customers, products, users } from "./master";
import { journalEntries } from "./finance";

/* =============== MILIK M4 — PENJUALAN ===============
 * Definisi kolom PERSIS PRD §8.4. numeric(14,2) untuk semua uang/qty (§8.5).
 */

export const salesOrderStatusEnum = pgEnum("sales_order_status", [
  "draft",
  "confirmed",
  "invoiced",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "posted",
  "cancelled",
]);

export const invoiceStatusBayarEnum = pgEnum("invoice_status_bayar", [
  "belum",
  "lunas",
]);

/** `sales_orders` — PRD §8.4 */
export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // SO/2026/11/0001
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  status: salesOrderStatusEnum("status").notNull().default("draft"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  dibuatOleh: integer("dibuat_oleh")
    .notNull()
    .references(() => users.id),
});

/** `sales_order_items` — PRD §8.4 */
export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  soId: integer("so_id")
    .notNull()
    .references(() => salesOrders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: numeric("qty", { precision: 14, scale: 2 }).notNull(),
  hargaSatuan: numeric("harga_satuan", { precision: 14, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

/** `invoices` — PRD §8.4. Dua kolom journal = jembatan ke M5 (§8.5). */
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // INV/2026/11/0001
  soId: integer("so_id")
    .notNull()
    .references(() => salesOrders.id),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  jatuhTempo: date("jatuh_tempo", { mode: "string" }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(), // nilai jual
  totalHpp: numeric("total_hpp", { precision: 14, scale: 2 }) // diisi saat posting dari recordStockOut
    .notNull()
    .default("0"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  // diubah M5 HANYA melalui markInvoicePaid() (§7.5)
  statusBayar: invoiceStatusBayarEnum("status_bayar").notNull().default("belum"),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id), // J3
  journalEntryHppId: integer("journal_entry_hpp_id").references(
    () => journalEntries.id,
  ), // J4
});

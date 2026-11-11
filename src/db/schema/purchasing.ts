import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { products, suppliers, users } from "./master";
import { journalEntries } from "./finance";

/* =============== MILIK M2 — PEMBELIAN ===============
 * Definisi kolom PERSIS PRD §8.4. numeric(14,2) untuk semua uang/qty (§8.5).
 */

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "approved",
  "received",
  "cancelled",
]);

export const goodsReceiptStatusEnum = pgEnum("goods_receipt_status", [
  "draft",
  "posted",
]);

export const statusBayarEnum = pgEnum("status_bayar", ["belum", "lunas"]);

/** `purchase_orders` — PRD §8.4 */
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // PO/2026/11/0001 (§9.7)
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  dibuatOleh: integer("dibuat_oleh")
    .notNull()
    .references(() => users.id),
  disetujuiOleh: integer("disetujui_oleh").references(() => users.id),
});

/** `purchase_order_items` — PRD §8.4 */
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: numeric("qty", { precision: 14, scale: 2 }).notNull(),
  hargaSatuan: numeric("harga_satuan", { precision: 14, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

/** `goods_receipts` — PRD §8.4. `journal_entry_id` = jembatan ke M5 (§8.5). */
export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // GRN/2026/11/0001
  poId: integer("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  status: goodsReceiptStatusEnum("status").notNull().default("draft"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  journalEntryId: integer("journal_entry_id").references(
    () => journalEntries.id,
  ),
  // diubah M5 HANYA melalui markGoodsReceiptPaid() (§7.5)
  statusBayar: statusBayarEnum("status_bayar").notNull().default("belum"),
  diterimaOleh: integer("diterima_oleh")
    .notNull()
    .references(() => users.id),
});

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id")
    .notNull()
    .references(() => goodsReceipts.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qtyDiterima: numeric("qty_diterima", { precision: 14, scale: 2 }).notNull(),
  hargaSatuan: numeric("harga_satuan", { precision: 14, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { products, users } from "./master";

/* =============== MILIK M3 — PERSEDIAAN ===============
 * Definisi kolom PERSIS PRD §8.4. numeric(14,2) untuk semua uang/qty (§8.5).
 */

export const stockMovementTipeEnum = pgEnum("stock_movement_tipe", [
  "in",
  "out",
  "adjustment",
]);

export const stockMovementRefTypeEnum = pgEnum("stock_movement_ref_type", [
  "goods_receipt",
  "invoice",
  "stock_opname",
]);

export const stockOpnameStatusEnum = pgEnum("stock_opname_status", [
  "draft",
  "posted",
]);

/** `stock_movements` — kartu stok, sumber kebenaran tunggal saldo stok (PRD §8.4). */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    tanggal: timestamp("tanggal", { mode: "date" }).notNull().defaultNow(),
    tipe: stockMovementTipeEnum("tipe").notNull(),
    qty: numeric("qty", { precision: 14, scale: 2 }).notNull(), // bertanda: positif masuk, negatif keluar
    hargaSatuan: numeric("harga_satuan", { precision: 14, scale: 2 }).notNull(),
    saldoSetelah: numeric("saldo_setelah", {
      precision: 14,
      scale: 2,
    }).notNull(),
    refType: stockMovementRefTypeEnum("ref_type").notNull(),
    refId: integer("ref_id").notNull(),
    keterangan: text("keterangan"),
  },
  (table) => [index("stock_movements_product_id_idx").on(table.productId)], // NF-14
);

/** `stock_opnames` — PRD §8.4 */
export const stockOpnames = pgTable("stock_opnames", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(), // OPN/2026/11/0001
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  status: stockOpnameStatusEnum("status").notNull().default("draft"),
  dicatatOleh: integer("dicatat_oleh")
    .notNull()
    .references(() => users.id),
});

/** `stock_opname_items` — PRD §8.4 */
export const stockOpnameItems = pgTable("stock_opname_items", {
  id: serial("id").primaryKey(),
  opnameId: integer("opname_id")
    .notNull()
    .references(() => stockOpnames.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qtySistem: numeric("qty_sistem", { precision: 14, scale: 2 }).notNull(),
  qtyFisik: numeric("qty_fisik", { precision: 14, scale: 2 }).notNull(),
  selisih: numeric("selisih", { precision: 14, scale: 2 }).notNull(),
});

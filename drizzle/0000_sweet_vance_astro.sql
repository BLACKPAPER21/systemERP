CREATE TYPE "public"."account_tipe" AS ENUM('aset', 'liabilitas', 'ekuitas', 'pendapatan', 'beban');--> statement-breakpoint
CREATE TYPE "public"."audit_aksi" AS ENUM('create', 'update', 'post', 'cancel');--> statement-breakpoint
CREATE TYPE "public"."saldo_normal" AS ENUM('debit', 'kredit');--> statement-breakpoint
CREATE TYPE "public"."user_peran" AS ENUM('owner', 'gudang', 'sales', 'keuangan');--> statement-breakpoint
CREATE TYPE "public"."goods_receipt_status" AS ENUM('draft', 'posted');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'approved', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status_bayar" AS ENUM('belum', 'lunas');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_ref_type" AS ENUM('goods_receipt', 'invoice', 'stock_opname');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_tipe" AS ENUM('in', 'out', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."stock_opname_status" AS ENUM('draft', 'posted');--> statement-breakpoint
CREATE TYPE "public"."invoice_status_bayar" AS ENUM('belum', 'lunas');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'posted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sales_order_status" AS ENUM('draft', 'confirmed', 'invoiced', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."journal_ref_type" AS ENUM('opening_balance', 'goods_receipt', 'invoice', 'invoice_hpp', 'payment', 'expense', 'stock_opname');--> statement-breakpoint
CREATE TYPE "public"."payment_metode" AS ENUM('kas', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_ref_type" AS ENUM('invoice', 'goods_receipt');--> statement-breakpoint
CREATE TYPE "public"."payment_tipe" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"tipe" "account_tipe" NOT NULL,
	"saldo_normal" "saldo_normal" NOT NULL,
	CONSTRAINT "accounts_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"aksi" "audit_aksi" NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" integer NOT NULL,
	"waktu" timestamp DEFAULT now() NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"telepon" text,
	"alamat" text,
	"aktif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "customers_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "docnumber_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" text NOT NULL,
	"periode" text NOT NULL,
	"urut" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"nama" text NOT NULL,
	"satuan" text NOT NULL,
	"harga_jual" numeric(14, 2) NOT NULL,
	"harga_pokok_rata_rata" numeric(14, 2) DEFAULT '0' NOT NULL,
	"stok_saat_ini" numeric(14, 2) DEFAULT '0' NOT NULL,
	"stok_minimum" numeric(14, 2) NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"telepon" text,
	"alamat" text,
	"aktif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "suppliers_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"peran" "user_peran" NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"grn_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty_diterima" numeric(14, 2) NOT NULL,
	"harga_satuan" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"po_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"status" "goods_receipt_status" DEFAULT 'draft' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"journal_entry_id" integer,
	"status_bayar" "status_bayar" DEFAULT 'belum' NOT NULL,
	"diterima_oleh" integer NOT NULL,
	CONSTRAINT "goods_receipts_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty" numeric(14, 2) NOT NULL,
	"harga_satuan" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"supplier_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"dibuat_oleh" integer NOT NULL,
	"disetujui_oleh" integer,
	CONSTRAINT "purchase_orders_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"tanggal" timestamp DEFAULT now() NOT NULL,
	"tipe" "stock_movement_tipe" NOT NULL,
	"qty" numeric(14, 2) NOT NULL,
	"harga_satuan" numeric(14, 2) NOT NULL,
	"saldo_setelah" numeric(14, 2) NOT NULL,
	"ref_type" "stock_movement_ref_type" NOT NULL,
	"ref_id" integer NOT NULL,
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "stock_opname_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"opname_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty_sistem" numeric(14, 2) NOT NULL,
	"qty_fisik" numeric(14, 2) NOT NULL,
	"selisih" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opnames" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"tanggal" date NOT NULL,
	"status" "stock_opname_status" DEFAULT 'draft' NOT NULL,
	"dicatat_oleh" integer NOT NULL,
	CONSTRAINT "stock_opnames_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"so_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"jatuh_tempo" date NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"total_hpp" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"status_bayar" "invoice_status_bayar" DEFAULT 'belum' NOT NULL,
	"journal_entry_id" integer,
	"journal_entry_hpp_id" integer,
	CONSTRAINT "invoices_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
CREATE TABLE "sales_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"so_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty" numeric(14, 2) NOT NULL,
	"harga_satuan" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"customer_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"status" "sales_order_status" DEFAULT 'draft' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"dibuat_oleh" integer NOT NULL,
	CONSTRAINT "sales_orders_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"tanggal" date NOT NULL,
	"keterangan" text NOT NULL,
	"ref_type" "journal_ref_type" NOT NULL,
	"ref_id" integer,
	"total_debit" numeric(14, 2) NOT NULL,
	"total_kredit" numeric(14, 2) NOT NULL,
	"dibuat_oleh" integer NOT NULL,
	CONSTRAINT "journal_entries_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" numeric(14, 2) NOT NULL,
	"kredit" numeric(14, 2) NOT NULL,
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text NOT NULL,
	"tipe" "payment_tipe" NOT NULL,
	"ref_type" "payment_ref_type" NOT NULL,
	"ref_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"jumlah" numeric(14, 2) NOT NULL,
	"metode" "payment_metode" NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"dicatat_oleh" integer NOT NULL,
	CONSTRAINT "payments_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_grn_id_goods_receipts_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_diterima_oleh_users_id_fk" FOREIGN KEY ("diterima_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_dibuat_oleh_users_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_disetujui_oleh_users_id_fk" FOREIGN KEY ("disetujui_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_opname_id_stock_opnames_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_dicatat_oleh_users_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_so_id_sales_orders_id_fk" FOREIGN KEY ("so_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_journal_entry_hpp_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_hpp_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_so_id_sales_orders_id_fk" FOREIGN KEY ("so_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_dibuat_oleh_users_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_dibuat_oleh_users_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_dicatat_oleh_users_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "docnumber_counters_prefix_periode_uq" ON "docnumber_counters" USING btree ("prefix","periode");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines" USING btree ("journal_entry_id");
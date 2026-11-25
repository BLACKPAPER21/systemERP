ALTER TABLE "sales_orders" ADD COLUMN "metode_pembayaran" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "jumlah_cicilan" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "tenggat" date;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "bayar_awal" numeric(14, 2) DEFAULT '0' NOT NULL;
/* MILIK M6 — Notifikasi stok kritis di header (pengganti kartu "Produk Stok
 * Kritis" di dashboard). Server component: mengambil data, lalu menyerahkan
 * tampilan ke NotifikasiStokPanel (client) untuk perilaku popover.
 */
import { and, asc, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

import { NotifikasiStokPanel } from "./notifikasi-stok-panel";

const BATAS_DAFTAR = 8;

export async function NotifikasiStok() {
  const kondisi = and(
    eq(products.aktif, true),
    sql`${products.stokSaatIni} <= ${products.stokMinimum}`,
  );

  const [daftar, ringkasan] = await Promise.all([
    db
      .select({
        sku: products.sku,
        nama: products.nama,
        satuan: products.satuan,
        stok: products.stokSaatIni,
        minimum: products.stokMinimum,
      })
      .from(products)
      .where(kondisi)
      .orderBy(asc(products.stokSaatIni))
      .limit(BATAS_DAFTAR),
    db.select({ jumlah: count() }).from(products).where(kondisi),
  ]);

  return (
    <NotifikasiStokPanel
      jumlah={ringkasan[0]?.jumlah ?? 0}
      daftar={daftar.map((p) => ({
        sku: p.sku,
        nama: p.nama,
        satuan: p.satuan,
        stok: Number(p.stok ?? 0),
        minimum: Number(p.minimum ?? 0),
      }))}
    />
  );
}

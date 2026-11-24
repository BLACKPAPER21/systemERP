/* ============================================================
 * FILE MILIK M3 — PERSEDIAAN
 * M3 (tahap 2) mengganti isi fungsinya, kontrak tanda tangan
 * dipatenkan PRD §7.2 — JANGAN MENGUBAH TANDA TANGAN SEPIHAK.
 * ============================================================
 *
 * Stub-first (PRD §12.2): berkas ini diserahkan sejak Fase 0 oleh M1 dengan
 * isi tiruan supaya M2 & M4 dapat menulis logika posting-nya sebelum M3 selesai.
 * recordStockIn telah dilengkapi untuk integrasi M2; fungsi keluar dan
 * pemeriksaan stok masih menunggu M3. Tanda tangan tetap sesuai PRD.
 *
 * Tanggung jawab M3 di dalam fungsi (PRD §7.2) — diisi M3 pada tahap 2:
 * - Menulis baris stock_movements beserta saldo_setelah (AB-8, AB-9)
 * - Memperbarui products.stok_saat_ini dan products.harga_pokok_rata_rata (§8.2)
 * - Mengunci baris produk FOR UPDATE sebelum mengubah saldo (NF-9)
 * - Melempar galat bila stok akan menjadi negatif (K-4, AB-7)
 * Yang bukan tanggung jawab M3: membentuk jurnal — pemanggil menjurnal (§6.2).
 */
import { eq, sql } from "drizzle-orm";
import type { Transaction } from "@/db";
import { products, stockMovements } from "@/db/schema";

/** Tipe refType pemanggil sesuai skema M3 (tabel stock_movements, §8.4). */
export type MovementRefType = "goods_receipt" | "invoice" | "stock_opname";

export interface RecordStockInInput {
  productId: number;
  qty: number; // selalu positif
  unitCost: number; // harga beli per satuan
  refType: MovementRefType;
  refId: number;
  keterangan?: string;
}

export interface RecordStockOutInput {
  productId: number;
  qty: number; // selalu positif
  refType: MovementRefType;
  refId: number;
  keterangan?: string;
}

/** Mencatat barang masuk + menghitung ulang harga pokok rata-rata.
 * Dipanggil oleh: M2 (posting GRN) */
export async function recordStockIn(
  tx: Transaction,
  input: RecordStockInInput,
): Promise<{ saldoSetelah: number; hargaPokokBaru: number }> {
  if (!Number.isInteger(input.productId) || input.productId <= 0 ||
      !Number.isFinite(input.qty) || input.qty <= 0 || !Number.isFinite(input.unitCost) || input.unitCost <= 0 ||
      Math.abs(input.qty * 100 - Math.round(input.qty * 100)) > 0.01 ||
      Math.abs(input.unitCost * 100 - Math.round(input.unitCost * 100)) > 0.01) {
    throw new Error("Data stok masuk tidak valid.");
  }
  const [product] = await tx.select({ id: products.id }).from(products)
    .where(eq(products.id, input.productId)).for("update");
  if (!product) throw new Error("Produk untuk stok masuk tidak ditemukan.");
  const qty = input.qty.toFixed(2);
  const cost = input.unitCost.toFixed(2);
  // Perhitungan dilakukan oleh PostgreSQL numeric, di bawah kunci baris produk.
  const [updated] = await tx.update(products).set({
    hargaPokokRataRata: sql`round(((${products.stokSaatIni} * ${products.hargaPokokRataRata}) + (${qty}::numeric * ${cost}::numeric)) / (${products.stokSaatIni} + ${qty}::numeric), 2)`,
    stokSaatIni: sql`${products.stokSaatIni} + ${qty}::numeric`,
  }).where(eq(products.id, input.productId))
    .returning({ stok: products.stokSaatIni, hargaPokok: products.hargaPokokRataRata });
  await tx.insert(stockMovements).values({
    productId: input.productId, tipe: "in", qty, hargaSatuan: cost,
    saldoSetelah: updated.stok, refType: input.refType, refId: input.refId,
    keterangan: input.keterangan ?? null,
  });
  return { saldoSetelah: Number(updated.stok), hargaPokokBaru: Number(updated.hargaPokok) };
}

/** Mencatat barang keluar + MENGEMBALIKAN nilai HPP untuk dijurnal.
 * Dipanggil oleh: M4 (posting invoice). Melempar galat bila stok tidak cukup. */
export async function recordStockOut(
  tx: Transaction,
  input: RecordStockOutInput,
): Promise<{ saldoSetelah: number; hppSatuan: number; hppTotal: number }> {
  void tx;
  void input;
  // TODO(M3): validasi stok (FOR UPDATE), tulis stock_movements, hitung HPP — PRD §9.4
  return { saldoSetelah: 0, hppSatuan: 0, hppTotal: 0 };
}

/** Pemeriksaan stok untuk umpan balik cepat di antarmuka.
 * Dipanggil oleh: M4 (validasi SO), M6 (dashboard).
 * CATATAN: ini BUKAN pengganti validasi di dalam recordStockOut (AB-7). */
export async function getAvailableStock(
  productId: number,
): Promise<number> {
  void productId;
  // TODO(M3): baca stok_saat_ini produk (cache stock_movements)
  return 0;
}


import { eq } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { products } from "@/db/schema/master";
import { stockMovements } from "@/db/schema/inventory";

export interface RecordStockInInput {
  productId: number;
  qty: number;
  unitCost: number;
  refType: "goods_receipt";
  refId: number;
  keterangan?: string;
}

export interface RecordStockOutInput {
  productId: number;
  qty: number;
  refType: "invoice";
  refId: number;
  keterangan?: string;
}

/**
 * Mengubah nilai menjadi satuan terkecil (dua angka desimal).
 * BigInt digunakan untuk menghindari kesalahan perhitungan uang.
 */
function toCents(value: number): bigint {
  if (!Number.isFinite(value)) {
    throw new Error("Nilai harus berupa angka yang valid.");
  }

  const cents = Math.round(value * 100);

  if (!Number.isSafeInteger(cents)) {
    throw new Error("Nilai berada di luar batas perhitungan.");
  }

  return BigInt(cents);
}

function formatCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;

  return `${sign}${absolute / 100n}.${(absolute % 100n)
    .toString()
    .padStart(2, "0")}`;
}

function divideRoundHalfUp(
  numerator: bigint,
  denominator: bigint,
): bigint {
  if (denominator <= 0n) {
    throw new Error("Pembagi harus lebih besar dari nol.");
  }

  return (numerator + denominator / 2n) / denominator;
}

/**
 * Mencatat barang masuk dan menghitung harga pokok rata-rata.
 * Dipanggil oleh M2 ketika GRN diposting.
 */
export async function recordStockIn(
  tx: Transaction,
  input: RecordStockInInput,
): Promise<{ saldoSetelah: number; hargaPokokBaru: number }> {
  if (input.qty <= 0) {
    throw new Error("Jumlah barang masuk harus lebih besar dari nol.");
  }

  if (input.unitCost < 0) {
    throw new Error("Harga beli tidak boleh negatif.");
  }

  // Kunci baris produk agar transaksi bersamaan tidak mengubah stok
  // berdasarkan saldo lama yang sama.
  const [product] = await tx
    .select({
      id: products.id,
      stokSaatIni: products.stokSaatIni,
      hargaPokokRataRata: products.hargaPokokRataRata,
    })
    .from(products)
    .where(eq(products.id, input.productId))
    .for("update");

  if (!product) {
    throw new Error(`Produk dengan ID ${input.productId} tidak ditemukan.`);
  }

  const stokLama = toCents(Number(product.stokSaatIni));
  const hargaLama = toCents(Number(product.hargaPokokRataRata));
  const qtyMasuk = toCents(input.qty);
  const hargaBeli = toCents(input.unitCost);

  if (qtyMasuk <= 0n) {
    throw new Error("Jumlah barang masuk harus lebih besar dari nol.");
  }

  const saldoBaru = stokLama + qtyMasuk;

  // Moving Weighted Average:
  // ((stok lama x harga lama) + (qty masuk x harga beli))
  // / (stok lama + qty masuk)
  const nilaiPersediaanLama = stokLama * hargaLama;
  const nilaiPembelianBaru = qtyMasuk * hargaBeli;

  const hargaPokokBaru = divideRoundHalfUp(
    nilaiPersediaanLama + nilaiPembelianBaru,
    saldoBaru,
  );

  await tx.insert(stockMovements).values({
    productId: input.productId,
    tipe: "in",
    qty: formatCents(qtyMasuk),
    hargaSatuan: formatCents(hargaBeli),
    saldoSetelah: formatCents(saldoBaru),
    refType: input.refType,
    refId: input.refId,
    keterangan: input.keterangan,
  });

  await tx
    .update(products)
    .set({
      stokSaatIni: formatCents(saldoBaru),
      hargaPokokRataRata: formatCents(hargaPokokBaru),
    })
    .where(eq(products.id, input.productId));

  return {
    saldoSetelah: Number(saldoBaru) / 100,
    hargaPokokBaru: Number(hargaPokokBaru) / 100,
  };
}

/**
 * Mencatat barang keluar dan mengembalikan HPP untuk M4.
 * Melempar error jika stok tidak mencukupi.
 */
export async function recordStockOut(
  tx: Transaction,
  input: RecordStockOutInput,
): Promise<{ saldoSetelah: number; hppSatuan: number; hppTotal: number }> {
  if (input.qty <= 0) {
    throw new Error("Jumlah barang keluar harus lebih besar dari nol.");
  }

  const [product] = await tx
    .select({
      id: products.id,
      stokSaatIni: products.stokSaatIni,
      hargaPokokRataRata: products.hargaPokokRataRata,
    })
    .from(products)
    .where(eq(products.id, input.productId))
    .for("update");

  if (!product) {
    throw new Error(`Produk dengan ID ${input.productId} tidak ditemukan.`);
  }

  const stokLama = toCents(Number(product.stokSaatIni));
  const hppSatuanCents = toCents(Number(product.hargaPokokRataRata));
  const qtyKeluar = toCents(input.qty);

  if (qtyKeluar <= 0n) {
    throw new Error("Jumlah barang keluar harus lebih besar dari nol.");
  }

  if (qtyKeluar > stokLama) {
    throw new Error(
      `Stok tidak mencukupi. Stok tersedia: ${Number(stokLama) / 100}.`,
    );
  }

  const saldoBaru = stokLama - qtyKeluar;

  // HPP total = jumlah barang keluar x harga pokok rata-rata.
const hppTotalCents = divideRoundHalfUp(
  qtyKeluar * hppSatuanCents,
  100n,
);

  await tx.insert(stockMovements).values({
    productId: input.productId,
    tipe: "out",
    qty: formatCents(-qtyKeluar),
    hargaSatuan: formatCents(hppSatuanCents),
    saldoSetelah: formatCents(saldoBaru),
    refType: input.refType,
    refId: input.refId,
    keterangan: input.keterangan,
  });

  await tx
    .update(products)
    .set({
      stokSaatIni: formatCents(saldoBaru),
      // Harga pokok rata-rata tidak berubah ketika barang keluar.
    })
    .where(eq(products.id, input.productId));

  return {
    saldoSetelah: Number(saldoBaru) / 100,
    hppSatuan: Number(hppSatuanCents) / 100,
    hppTotal: Number(hppTotalCents) / 100,
  };
}

/**
 * Membaca saldo stok dari cache products.
 * Bukan pengganti validasi stok di recordStockOut.
 */
export async function getAvailableStock(
  productId: number,
): Promise<number> {
  const [product] = await db
    .select({
      stokSaatIni: products.stokSaatIni,
    })
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    throw new Error(`Produk dengan ID ${productId} tidak ditemukan.`);
  }

  return Number(product.stokSaatIni);
}

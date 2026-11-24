import { z } from "zod";

const id = z.number().int().positive().max(2147483647);
const desimal = z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Gunakan angka positif dengan maksimal 2 angka desimal.")
  .refine((value) => Number(value) > 0, "Nilai harus lebih besar dari nol.");
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Tanggal tidak valid.");

export const skemaPO = z.object({
  supplierId: id,
  tanggal,
  items: z.array(z.object({ productId: id, qty: desimal, hargaSatuan: desimal })).min(1).max(100),
}).refine((data) => new Set(data.items.map((i) => i.productId)).size === data.items.length, {
  message: "Setiap produk hanya boleh muncul satu kali pada PO.",
});

export const skemaGRN = z.object({
  poId: id,
  tanggal,
  items: z.array(z.object({ productId: id, qtyDiterima: desimal })).min(1).max(100),
}).refine((data) => new Set(data.items.map((i) => i.productId)).size === data.items.length, {
  message: "Setiap produk hanya boleh muncul satu kali pada penerimaan.",
});

export type InputPO = z.input<typeof skemaPO>;
export type InputGRN = z.input<typeof skemaGRN>;
export const skemaId = id;

// Perhitungan rupiah dan kuantitas dalam satuan 0,01 agar pembulatan konsisten.
export function keSeratusan(value: string): bigint {
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, "0"));
}
export function formatDesimal(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}
const MAKS_NUMERIC = 99_999_999_999_999n; // numeric(14,2)
export function subtotalItem(qty: string, harga: string): bigint {
  const subtotal = (keSeratusan(qty) * keSeratusan(harga) + 50n) / 100n;
  if (subtotal <= 0n || subtotal > MAKS_NUMERIC) throw new Error("Subtotal produk harus antara Rp 0,01 dan Rp 999.999.999.999,99.");
  return subtotal;
}
export function totalItem(values: bigint[]): string {
  const total = values.reduce((a, b) => a + b, 0n);
  if (total <= 0n || total > MAKS_NUMERIC) throw new Error("Total dokumen melebihi batas database.");
  return formatDesimal(total);
}

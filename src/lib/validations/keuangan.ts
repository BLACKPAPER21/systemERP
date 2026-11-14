/* MILIK M5 — Skema Zod validasi sisi server (NF-4).
 * Seluruh Server Action M5 mem-parse input dengan skema ini SEBELUM menyentuh
 * database. Validasi klien hanya kenyamanan; ini pemagarnya.
 */
import { z } from "zod";

/* ==== Pembayaran ke Supplier (melunasi GRN) — J2 ==== */
export const skemaPembayaranKeluar = z.object({
  grnId: z.coerce.number().int().positive("ID GRN tidak valid"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  jumlah: z.coerce
    .number({ message: "Jumlah wajib angka" })
    .positive("Jumlah harus lebih dari 0")
    .max(999_999_999_999.99),
  metode: z.enum(["kas", "transfer"], { message: "Metode tidak valid" }),
});

export type SkemaPembayaranKeluarInput = z.infer<typeof skemaPembayaranKeluar>;

/* ==== Penerimaan dari Pelanggan (melunasi Invoice) — J5 ==== */
export const skemaPembayaranMasuk = z.object({
  invoiceId: z.coerce.number().int().positive("ID Invoice tidak valid"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  jumlah: z.coerce
    .number({ message: "Jumlah wajib angka" })
    .positive("Jumlah harus lebih dari 0")
    .max(999_999_999_999.99),
  metode: z.enum(["kas", "transfer"], { message: "Metode tidak valid" }),
});

export type SkemaPembayaranMasukInput = z.infer<typeof skemaPembayaranMasuk>;

/* ==== Beban Operasional (J6) ==== */
export const skemaBeban = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(200),
  jumlah: z.coerce
    .number({ message: "Jumlah wajib angka" })
    .positive("Jumlah harus lebih dari 0")
    .max(999_999_999_999.99),
  metode: z.enum(["kas", "transfer"], { message: "Metode tidak valid" }),
});

export type SkemaBebanInput = z.infer<typeof skemaBeban>;


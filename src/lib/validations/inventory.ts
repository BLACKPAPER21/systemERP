
/* Wilayah M3 — skema Zod untuk validasi Stock Opname. */

import { z } from "zod";

/* ==== ID dokumen Stock Opname ==== */

export const skemaIdOpname = z.object({
  id: z.coerce
    .number({ message: "ID Stock Opname tidak valid" })
    .int("ID harus berupa bilangan bulat")
    .positive("ID harus lebih besar dari nol"),
});

/* ==== Pencatatan stok fisik ==== */

export const skemaCatatStokFisik = z.object({
  opnameId: z.coerce
    .number({ message: "ID Stock Opname tidak valid" })
    .int()
    .positive(),

  productId: z.coerce
    .number({ message: "Produk wajib dipilih" })
    .int("ID produk tidak valid")
    .positive("Produk wajib dipilih"),

  qtyFisik: z.coerce
    .number({ message: "Jumlah stok fisik wajib berupa angka" })
    .finite("Jumlah stok fisik tidak valid")
    .min(0, "Stok fisik tidak boleh negatif")
    .max(
      999_999_999_999.99,
      "Jumlah stok fisik terlalu besar",
    )
    .refine(
      (value) =>
        Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      "Jumlah stok maksimal dua angka desimal",
    ),

  keterangan: z
    .string()
    .trim()
    .max(200, "Keterangan maksimal 200 karakter")
    .optional()
    .or(z.literal("")),
});

export type SkemaIdOpnameInput = z.infer<typeof skemaIdOpname>;

export type SkemaCatatStokFisikInput = z.infer<
  typeof skemaCatatStokFisik
>;

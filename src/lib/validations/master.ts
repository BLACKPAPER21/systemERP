/* Wilayah M1 — skema Zod untuk validasi sisi server (NF-4).
 * Seluruh Server Action M1 mem-parse input dengan skema di berkas ini
 * SEBELUM menyentuh database. Validasi klien hanya kenyamanan; ini pemagarnya.
 */
import { z } from "zod";

/* ==== Produk — form TIDAK memuat stok_saat_ini & harga_pokok_rata_rata (§8.2) ==== */
export const skemaProduk = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU wajib diisi")
    .max(30, "SKU maksimal 30 karakter")
    .toUpperCase(),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(120),
  satuan: z.string().trim().min(1, "Satuan wajib diisi").max(20),
  hargaJual: z.coerce
    .number({ message: "Harga jual wajib angka" })
    .min(0, "Harga jual tidak boleh negatif")
    .max(999_999_999_999.99, "Harga terlalu besar"),
  stokMinimum: z.coerce
    .number({ message: "Stok minimum wajib angka" })
    .min(0, "Stok minimum tidak boleh negatif")
    .max(999_999_999_999.99),
  aktif: z.boolean(),
});

export type SkemaProdukInput = z.infer<typeof skemaProduk>;

/* ==== Supplier ==== */
export const skemaSupplier = z.object({
  kode: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(30, "Kode maksimal 30 karakter")
    .toUpperCase(),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(120),
  telepon: z.string().trim().max(30).optional().or(z.literal("")),
  alamat: z.string().trim().max(200).optional().or(z.literal("")),
  aktif: z.boolean(),
});

export type SkemaSupplierInput = z.infer<typeof skemaSupplier>;

/* ==== Pelanggan ==== */
export const skemaPelanggan = z.object({
  kode: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(30, "Kode maksimal 30 karakter")
    .toUpperCase(),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(120),
  telepon: z.string().trim().max(30).optional().or(z.literal("")),
  alamat: z.string().trim().max(200).optional().or(z.literal("")),
  aktif: z.boolean(),
});

export type SkemaPelangganInput = z.infer<typeof skemaPelanggan>;

/* ==== Pengguna ==== */
export const skemaPenggunaBaru = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email tidak valid")
    .max(120),
  password: z.string().min(6, "Kata sandi minimal 6 karakter").max(72),
  peran: z.enum(["owner", "gudang", "sales", "keuangan"], {
    message: "Peran tidak valid",
  }),
  aktif: z.boolean(),
});

export const skemaPenggunaUbah = z.object({
  id: z.coerce.number().int().positive(),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email tidak valid")
    .max(120),
  password: z
    .string()
    .max(72)
    .refine(
      (p) => p === "" || p.length >= 6,
      "Kata sandi minimal 6 karakter bila diisi",
    ),
  peran: z.enum(["owner", "gudang", "sales", "keuangan"], {
    message: "Peran tidak valid",
  }),
  aktif: z.boolean(),
});

export type SkemaPenggunaBaruInput = z.infer<typeof skemaPenggunaBaru>;
export type SkemaPenggunaUbahInput = z.infer<typeof skemaPenggunaUbah>;

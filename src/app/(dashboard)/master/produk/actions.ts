"use server";

/* Server actions CRUD Produk — wilayah M1.
 * NF-3: requireRole() dipanggil di baris pertama setiap aksi.
 * NF-4: validasi Zod di sisi server.
 * NF-10: setiap create/update tercatat logAudit().
 */
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import { skemaProduk } from "@/lib/validations/master";
import type { AksiHasil } from "@/lib/aksi";

export async function simpanProduk(
  id: number | null,
  raw: {
    sku: string;
    nama: string;
    satuan: string;
    hargaJual: string;
    stokMinimum: string;
    aktif: boolean;
    tambahStok?: string;
  },
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner"]);

  const parsed = skemaProduk.safeParse({
    ...raw,
    hargaJual: raw.hargaJual === "" ? undefined : raw.hargaJual,
    stokMinimum: raw.stokMinimum === "" ? undefined : raw.stokMinimum,
  });
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const v = parsed.data;

  const rawTambahStok = raw.tambahStok?.trim() ?? "";
  let tambahStokAngka = 0;
  if (rawTambahStok !== "") {
    tambahStokAngka = Number(rawTambahStok.replace(",", "."));
    if (Number.isNaN(tambahStokAngka) || !Number.isFinite(tambahStokAngka)) {
      return { ok: false, pesan: "Jumlah tambah stok tidak valid." };
    }
    if (tambahStokAngka < 0) {
      return { ok: false, pesan: "Jumlah tambah stok tidak boleh negatif." };
    }
  }

  if (id === null) {
    const bentrok = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, v.sku))
      .limit(1);
    if (bentrok.length > 0) {
      return { ok: false, pesan: `SKU '${v.sku}' sudah dipakai produk lain.` };
    }
    const [baris] = await db
      .insert(products)
      .values({
        sku: v.sku,
        nama: v.nama,
        satuan: v.satuan,
        hargaJual: v.hargaJual.toFixed(2),
        stokMinimum: v.stokMinimum.toFixed(2),
        aktif: v.aktif,
      })
      .returning({ id: products.id });

    await logAudit(db, {
      userId: sesi.userId,
      aksi: "create",
      entitas: "products",
      entitasId: baris!.id,
      detail: { sku: v.sku, nama: v.nama },
    });
  } else {
    const nilaiTambah = tambahStokAngka.toFixed(2);
    await db
      .update(products)
      .set({
        nama: v.nama,
        satuan: v.satuan,
        hargaJual: v.hargaJual.toFixed(2),
        stokMinimum: v.stokMinimum.toFixed(2),
        aktif: v.aktif,
        ...(tambahStokAngka > 0
          ? { stokSaatIni: sql`COALESCE(${products.stokSaatIni}, 0) + ${nilaiTambah}` }
          : {}),
      })
      .where(eq(products.id, id));

    await logAudit(db, {
      userId: sesi.userId,
      aksi: "update",
      entitas: "products",
      entitasId: id,
      detail: {
        sku: v.sku,
        nama: v.nama,
        aktif: v.aktif,
        ...(tambahStokAngka > 0 ? { tambahStok: nilaiTambah } : {}),
      },
    });
  }

  revalidatePath("/master/produk");
  return { ok: true, pesan: "Produk tersimpan." };
}
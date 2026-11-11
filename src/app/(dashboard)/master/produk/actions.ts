"use server";

/* Server actions CRUD Produk — wilayah M1.
 * NF-3: requireRole() dipanggil di baris pertama setiap aksi.
 * NF-4: validasi Zod di sisi server.
 * NF-10: setiap create/update tercatat logAudit().
 * §8.2: aksi TIDAK PERNAH menulis stok_saat_ini / harga_pokok_rata_rata.
 */
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import { skemaProduk } from "@/lib/validations/master";
import type { AksiHasil } from "@/lib/aksi";

export async function simpanProduk(
  id: number | null,
  raw: { sku: string; nama: string; satuan: string; hargaJual: string; stokMinimum: string; aktif: boolean },
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
    const sesi = await requireRole(["owner"]);
    await db
      .update(products)
      .set({
        nama: v.nama,
        satuan: v.satuan,
        hargaJual: v.hargaJual.toFixed(2),
        stokMinimum: v.stokMinimum.toFixed(2),
        aktif: v.aktif,
      })
      .where(eq(products.id, id));
    await logAudit(db, {
      userId: sesi.userId,
      aksi: "update",
      entitas: "products",
      entitasId: id,
      detail: { sku: v.sku, nama: v.nama, aktif: v.aktif },
    });
  }

  revalidatePath("/master/produk");
  return { ok: true, pesan: "Produk tersimpan." };
}

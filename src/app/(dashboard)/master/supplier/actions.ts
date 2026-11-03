"use server";

/* Server actions CRUD Supplier — wilayah M1 (NF-3, NF-4, NF-10). */
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import { skemaSupplier } from "@/lib/validations/master";
import type { AksiHasil } from "@/lib/aksi";

export async function simpanSupplier(
  id: number | null,
  raw: { kode: string; nama: string; telepon: string; alamat: string; aktif: boolean },
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner"]);

  const parsed = skemaSupplier.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const v = parsed.data;

  if (id === null) {
    const bentrok = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.kode, v.kode))
      .limit(1);
    if (bentrok.length > 0) {
      return { ok: false, pesan: `Kode '${v.kode}' sudah dipakai supplier lain.` };
    }
    const [baris] = await db
      .insert(suppliers)
      .values({
        kode: v.kode,
        nama: v.nama,
        telepon: v.telepon || null,
        alamat: v.alamat || null,
        aktif: v.aktif,
      })
      .returning({ id: suppliers.id });

    await logAudit(db, {
      userId: sesi.userId,
      aksi: "create",
      entitas: "suppliers",
      entitasId: baris!.id,
      detail: { kode: v.kode, nama: v.nama },
    });
  } else {
    await db
      .update(suppliers)
      .set({
        nama: v.nama,
        telepon: v.telepon || null,
        alamat: v.alamat || null,
        aktif: v.aktif,
      })
      .where(eq(suppliers.id, id));

    await logAudit(db, {
      userId: sesi.userId,
      aksi: "update",
      entitas: "suppliers",
      entitasId: id,
      detail: { kode: v.kode, nama: v.nama, aktif: v.aktif },
    });
  }

  revalidatePath("/master/supplier");
  return { ok: true, pesan: "Supplier tersimpan." };
}

"use server";

/* Server actions CRUD Pelanggan — wilayah M1 (NF-3, NF-4, NF-10). */
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import { skemaPelanggan } from "@/lib/validations/master";
import type { AksiHasil } from "@/lib/aksi";

export async function simpanPelanggan(
  id: number | null,
  raw: { kode: string; nama: string; telepon: string; alamat: string; aktif: boolean },
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner", "sales"]);

  const parsed = skemaPelanggan.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const v = parsed.data;

  if (id === null) {
    const bentrok = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.kode, v.kode))
      .limit(1);
    if (bentrok.length > 0) {
      return { ok: false, pesan: `Kode '${v.kode}' sudah dipakai pelanggan lain.` };
    }
    const [baris] = await db
      .insert(customers)
      .values({
        kode: v.kode,
        nama: v.nama,
        telepon: v.telepon || null,
        alamat: v.alamat || null,
        aktif: v.aktif,
      })
      .returning({ id: customers.id });

    await logAudit(db, {
      userId: sesi.userId,
      aksi: "create",
      entitas: "customers",
      entitasId: baris!.id,
      detail: { kode: v.kode, nama: v.nama },
    });
  } else {
    await db
      .update(customers)
      .set({
        nama: v.nama,
        telepon: v.telepon || null,
        alamat: v.alamat || null,
        aktif: v.aktif,
      })
      .where(eq(customers.id, id));

    await logAudit(db, {
      userId: sesi.userId,
      aksi: "update",
      entitas: "customers",
      entitasId: id,
      detail: { kode: v.kode, nama: v.nama, aktif: v.aktif },
    });
  }

  revalidatePath("/master/pelanggan");
  return { ok: true, pesan: "Pelanggan tersimpan." };
}

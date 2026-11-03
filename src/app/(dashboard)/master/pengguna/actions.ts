"use server";

/* Server actions CRUD Pengguna — wilayah M1, hanya Owner (matriks §4.2).
 * NF-1: kata sandi disimpan sebagai hash bcrypt, tidak pernah teks biasa.
 */
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import { skemaPenggunaBaru, skemaPenggunaUbah } from "@/lib/validations/master";
import type { AksiHasil } from "@/lib/aksi";

export async function simpanPengguna(
  raw: { nama: string; email: string; password: string; peran: string; aktif: boolean },
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner"]);

  const parsed = skemaPenggunaBaru.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const v = parsed.data;

  const bentrok = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, v.email))
    .limit(1);
  if (bentrok.length > 0) {
    return { ok: false, pesan: `Email '${v.email}' sudah terdaftar.` };
  }

  const passwordHash = await bcrypt.hash(v.password, 10);

  const [baris] = await db
    .insert(users)
    .values({
      nama: v.nama,
      email: v.email,
      passwordHash,
      peran: v.peran,
      aktif: v.aktif,
    })
    .returning({ id: users.id });

  await logAudit(db, {
    userId: sesi.userId,
    aksi: "create",
    entitas: "users",
    entitasId: baris!.id,
    detail: { email: v.email, peran: v.peran },
  });

  revalidatePath("/master/pengguna");
  return { ok: true, pesan: "Pengguna tersimpan." };
}

export async function ubahPengguna(
  raw: { id: number; nama: string; email: string; password: string; peran: string; aktif: boolean },
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner"]);

  const parsed = skemaPenggunaUbah.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const v = parsed.data;

  const bentrok = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, v.email))
    .limit(1);
  if (bentrok[0] && bentrok[0].id !== v.id) {
    return { ok: false, pesan: `Email '${v.email}' sudah dipakai pengguna lain.` };
  }

  const passwordHash =
    v.password === "" ? undefined : await bcrypt.hash(v.password, 10);

  await db
    .update(users)
    .set({
      nama: v.nama,
      email: v.email,
      ...(passwordHash ? { passwordHash } : {}),
      peran: v.peran,
      aktif: v.aktif,
    })
    .where(eq(users.id, v.id));

  await logAudit(db, {
    userId: sesi.userId,
    aksi: "update",
    entitas: "users",
    entitasId: v.id,
    detail: { email: v.email, peran: v.peran, aktif: v.aktif },
  });

  revalidatePath("/master/pengguna");
  return { ok: true, pesan: "Pengguna tersimpan." };
}

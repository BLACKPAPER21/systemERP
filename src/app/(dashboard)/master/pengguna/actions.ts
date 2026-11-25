"use server";

/* Server actions CRUD Pengguna — wilayah M1, hanya Owner (matriks §4.2).
 * NF-1: kata sandi disimpan sebagai hash bcrypt, tidak pernah teks biasa.
 */
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, count, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import {
  skemaPenggunaBaru,
  skemaPenggunaHapus,
  skemaPenggunaUbah,
} from "@/lib/validations/master";
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

/* =====================================================================
 * hapusPengguna — menghapus akun pengguna (matriks §4.2: hanya Owner).
 *
 * Penghapusan hanya diizinkan untuk akun yang BELUM meninggalkan jejak
 * apa pun. Begitu sebuah akun pernah membuat dokumen, mencatat jurnal,
 * atau sekadar muncul di log audit, akunnya tidak lagi boleh dihapus:
 * riwayat harus tetap utuh agar dapat diaudit (§8.5 no. 4, NF-10).
 * Untuk akun semacam itu jalurnya adalah menonaktifkan (aktif = false),
 * yang menutup aksesnya tanpa memutus rujukan dokumen lamanya.
 * ===================================================================== */
export async function hapusPengguna(id: number): Promise<AksiHasil> {
  const sesi = await requireRole(["owner"]);

  const parsed = skemaPenggunaHapus.safeParse({ id });
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const idPengguna = parsed.data.id;

  if (idPengguna === sesi.userId) {
    return { ok: false, pesan: "Anda tidak dapat menghapus akun Anda sendiri." };
  }

  const [target] = await db
    .select({ id: users.id, nama: users.nama, email: users.email, peran: users.peran })
    .from(users)
    .where(eq(users.id, idPengguna))
    .limit(1);

  if (!target) {
    return { ok: false, pesan: "Pengguna tidak ditemukan." };
  }

  // Jangan sampai sistem kehilangan owner aktif terakhirnya.
  if (target.peran === "owner") {
    const [sisa] = await db
      .select({ jumlah: count() })
      .from(users)
      .where(and(eq(users.peran, "owner"), eq(users.aktif, true), ne(users.id, idPengguna)));
    if (Number(sisa?.jumlah ?? 0) === 0) {
      return {
        ok: false,
        pesan: "Owner aktif terakhir tidak dapat dihapus — sistem akan kehilangan pengelolanya.",
      };
    }
  }

  // Jejak di seluruh modul. Satu query agar tidak bolak-balik ke basis data.
  const jejak = await db.execute<{
    audit: number; po: number; grn: number; opname: number;
    so: number; jurnal: number; bayar: number;
  }>(sql`
    SELECT
      (SELECT count(*) FROM audit_logs      WHERE user_id = ${idPengguna})                                   AS audit,
      (SELECT count(*) FROM purchase_orders WHERE dibuat_oleh = ${idPengguna} OR disetujui_oleh = ${idPengguna}) AS po,
      (SELECT count(*) FROM goods_receipts  WHERE diterima_oleh = ${idPengguna})                             AS grn,
      (SELECT count(*) FROM stock_opnames   WHERE dicatat_oleh = ${idPengguna})                              AS opname,
      (SELECT count(*) FROM sales_orders    WHERE dibuat_oleh = ${idPengguna})                               AS so,
      (SELECT count(*) FROM journal_entries WHERE dibuat_oleh = ${idPengguna})                               AS jurnal,
      (SELECT count(*) FROM payments        WHERE dicatat_oleh = ${idPengguna})                              AS bayar
  `);

  const j = jejak.rows[0];
  const rincian: string[] = [];
  if (Number(j?.po ?? 0) > 0) rincian.push(`${j.po} pesanan pembelian`);
  if (Number(j?.grn ?? 0) > 0) rincian.push(`${j.grn} penerimaan barang`);
  if (Number(j?.opname ?? 0) > 0) rincian.push(`${j.opname} stock opname`);
  if (Number(j?.so ?? 0) > 0) rincian.push(`${j.so} pesanan penjualan`);
  if (Number(j?.jurnal ?? 0) > 0) rincian.push(`${j.jurnal} jurnal`);
  if (Number(j?.bayar ?? 0) > 0) rincian.push(`${j.bayar} pembayaran`);
  const adaLogAudit = Number(j?.audit ?? 0) > 0;

  if (rincian.length > 0 || adaLogAudit) {
    const sebab =
      rincian.length > 0
        ? `masih terhubung ke ${rincian.join(", ")}`
        : "sudah memiliki catatan pada log audit";
    return {
      ok: false,
      pesan: `Pengguna "${target.nama}" tidak dapat dihapus karena ${sebab}. Nonaktifkan saja lewat tombol Ubah — aksesnya tertutup tanpa memutus riwayat dokumennya.`,
    };
  }

  await db.delete(users).where(eq(users.id, idPengguna));

  await logAudit(db, {
    userId: sesi.userId,
    aksi: "cancel",
    entitas: "users",
    entitasId: idPengguna,
    detail: { dihapus: true, email: target.email, peran: target.peran },
  });

  revalidatePath("/master/pengguna");
  return { ok: true, pesan: `Pengguna "${target.nama}" dihapus.` };
}

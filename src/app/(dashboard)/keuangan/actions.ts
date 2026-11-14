"use server";
/* MILIK M5 — Server Actions untuk modul Keuangan (PRD §5.5)
 * Seluruh aksi diproteksi requireRole, divalidasi Zod, dan berjalan dalam transaksi. */

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { requireRole } from "@/lib/auth-guard";
import {
  skemaPembayaranKeluar,
  skemaPembayaranMasuk,
  skemaBeban,
} from "@/lib/validations/keuangan";
import {
  bayarKeSuplier,
  terimaFromPelanggan,
  catatBeban,
} from "@/services/payment";

/* =========================================================
 * actionBayarKeSuplier — melunasi hutang ke supplier (J2)
 * Peran: owner | keuangan (PRD §4.2)
 * ========================================================= */
export async function actionBayarKeSuplier(
  _prevState: { ok: boolean; pesan: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; pesan: string }> {
  try {
    const sesi = await requireRole(["owner", "keuangan"]);

    const raw = {
      grnId: formData.get("grnId"),
      tanggal: formData.get("tanggal"),
      jumlah: formData.get("jumlah"),
      metode: formData.get("metode"),
    };

    const parsed = skemaPembayaranKeluar.safeParse(raw);
    if (!parsed.success) {
      const pesan = parsed.error.issues.map((i) => i.message).join("; ");
      return { ok: false, pesan };
    }

    const { grnId, tanggal, jumlah, metode } = parsed.data;

    await db.transaction(async (tx) => {
      await bayarKeSuplier(tx, {
        grnId,
        tanggal: new Date(tanggal),
        jumlah,
        metode,
        userId: sesi.userId,
      });
    });

    revalidatePath("/keuangan/pembayaran");
    revalidatePath("/keuangan/jurnal");
    return { ok: true, pesan: "Pembayaran ke supplier berhasil dicatat." };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return { ok: false, pesan };
  }
}

/* =========================================================
 * actionTerimaFromPelanggan — melunasi piutang (J5)
 * Peran: owner | keuangan
 * ========================================================= */
export async function actionTerimaFromPelanggan(
  _prevState: { ok: boolean; pesan: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; pesan: string }> {
  try {
    const sesi = await requireRole(["owner", "keuangan"]);

    const raw = {
      invoiceId: formData.get("invoiceId"),
      tanggal: formData.get("tanggal"),
      jumlah: formData.get("jumlah"),
      metode: formData.get("metode"),
    };

    const parsed = skemaPembayaranMasuk.safeParse(raw);
    if (!parsed.success) {
      const pesan = parsed.error.issues.map((i) => i.message).join("; ");
      return { ok: false, pesan };
    }

    const { invoiceId, tanggal, jumlah, metode } = parsed.data;

    await db.transaction(async (tx) => {
      await terimaFromPelanggan(tx, {
        invoiceId,
        tanggal: new Date(tanggal),
        jumlah,
        metode,
        userId: sesi.userId,
      });
    });

    revalidatePath("/keuangan/pembayaran");
    revalidatePath("/keuangan/jurnal");
    return { ok: true, pesan: "Penerimaan dari pelanggan berhasil dicatat." };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return { ok: false, pesan };
  }
}

/* =========================================================
 * actionCatatBeban — mencatat beban operasional (J6)
 * Peran: owner | keuangan
 * ========================================================= */
export async function actionCatatBeban(
  _prevState: { ok: boolean; pesan: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; pesan: string }> {
  try {
    const sesi = await requireRole(["owner", "keuangan"]);

    const raw = {
      tanggal: formData.get("tanggal"),
      keterangan: formData.get("keterangan"),
      jumlah: formData.get("jumlah"),
      metode: formData.get("metode"),
    };

    const parsed = skemaBeban.safeParse(raw);
    if (!parsed.success) {
      const pesan = parsed.error.issues.map((i) => i.message).join("; ");
      return { ok: false, pesan };
    }

    const { tanggal, keterangan, jumlah, metode } = parsed.data;

    await db.transaction(async (tx) => {
      await catatBeban(tx, {
        tanggal: new Date(tanggal),
        keterangan,
        jumlah,
        metode,
        userId: sesi.userId,
      });
    });

    revalidatePath("/keuangan/beban");
    revalidatePath("/keuangan/jurnal");
    return { ok: true, pesan: "Beban operasional berhasil dicatat." };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return { ok: false, pesan };
  }
}


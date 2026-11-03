/* MILIK M1 — Penomoran dokumen (PRD §9.7, kontrak fungsi §7.4)
 *
 * Format: PREFIKS/TAHUN/BULAN/0001 — contoh GRN/2026/11/0007.
 * Nomor urut reset setiap bulan.
 * WAJIB dipanggil DI DALAM transaksi pemanggil: fungsi ini menerima `tx`
 * sebagai parameter pertama dan TIDAK membuka transaksi sendiri (K-3).
 * Baris penghitung dikunci FOR UPDATE agar aman terhadap konkurensi.
 * Melempar galat saat gagal, tidak pernah mengembalikan null (K-4).
 */
import { sql } from "drizzle-orm";
import type { Transaction } from "../db";

export const DOC_PREFIXES = [
  "PO",
  "GRN",
  "SO",
  "INV",
  "PAY",
  "JV",
  "OPN",
] as const;

export type DocPrefix = (typeof DOC_PREFIXES)[number];

export interface DocNumberResult {
  nomor: string;
}

/**
 * Menghasilkan nomor dokumen berurut untuk periode (bulan) berjalan.
 * Jika argumen `opname` disediakan, gunakan tanggal tersebut sebagai acuan
 * periode — berguna untuk pengujian; default pakai tanggal UTC saat ini.
 */
export async function generateDocNumber(
  tx: Transaction,
  prefix: DocPrefix,
): Promise<string> {
  const d = new Date();
  const tahun = d.getUTCFullYear();
  const periode = `${tahun}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  // 1) Pastikan baris penghitung periode ini ada (idempotent saat konkurensi).
  await tx.execute(sql`
    INSERT INTO docnumber_counters (prefix, periode, urut)
    VALUES (${prefix}, ${periode}, 0)
    ON CONFLICT (prefix, periode) DO NOTHING
  `);

  // 2) Kunci baris penghitung FOR UPDATE (NF-9 gaya penguncian baris)
  //    agar dua transaksi bersamaan tidak memperoleh nomor sama.
  const locked = await tx.execute<{ urut: number }>(sql`
    SELECT urut FROM docnumber_counters
    WHERE prefix = ${prefix} AND periode = ${periode}
    FOR UPDATE
  `);
  if (locked.rows.length !== 1) {
    throw new Error("Penghitung nomor dokumen tidak tersedia.");
  }

  // 3) Naikkan urut dalam transaksi yang sama.
  const updated = await tx.execute<{ urut: number }>(sql`
    UPDATE docnumber_counters
    SET urut = urut + 1
    WHERE prefix = ${prefix} AND periode = ${periode}
    RETURNING urut
  `);
  if (updated.rows.length !== 1) {
    throw new Error("Gagal menaikkan nomor urut dokumen.");
  }

  const urut = Number(updated.rows[0].urut);
  const nomor = `${prefix}/${tahun}/${periode.slice(5, 7)}/${String(urut).padStart(4, "0")}`;

  return nomor;
}

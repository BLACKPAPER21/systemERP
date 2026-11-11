/* MILIK M1 — Jejak audit (PRD §7.4, NF-10)
 *
 * Dipanggil setiap aksi create/update/post/cancel oleh SEMUA modul.
 * Menerima `tx` (dalam transaksi pemanggil, K-3); tidak membuka transaksi
 * sendiri dan tidak melempar galat kecuali database-nya sendiri gagal.
 */
import { db } from "../db";
import type { Transaction } from "../db";
import { auditLogs } from "../db/schema";

export type AuditAksi = "create" | "update" | "post" | "cancel";

export interface AuditInput {
  userId: number;
  aksi: AuditAksi;
  entitas: string; // nama tabel
  entitasId: number;
  detail?: Record<string, unknown>;
}

/** Mencatat baris `audit_logs`. Pemanggil menentukan digulung bila gagal (K-3). */
export async function logAudit(
  tx: Transaction | typeof db,
  input: AuditInput,
): Promise<void> {
  await tx
    .insert(auditLogs)
    .values({
      userId: input.userId,
      aksi: input.aksi,
      entitas: input.entitas,
      entitasId: input.entitasId,
      waktu: new Date(),
      detail: input.detail ?? null,
    });
}

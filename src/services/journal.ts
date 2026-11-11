/* ============================================================
 * MILIK M5 — KEUANGAN
 * M5 nanti memverifikasi/mengeraskan implementasi ini (tahap 2).
 * Kontrak tanda tangan PERSIS §7.4/§7.3 — tidak boleh diubah sepihak.
 * ============================================================
 *
 * createJournalEntry — kontrak PRD §7.3:
 * - Melempar galat bila Σdebit ≠ Σkredit (AB-10, K-4)
 * - Menolak baris yang mengisi debit DAN kredit sekaligus (AB-10)
 * - Menerjemahkan `accountCode` → `account_id`
 * - Nomor jurnal melalui generateDocNumber('JV') milik M1 (§9.7)
 * - Menulis `journal_entries` + `journal_lines` (K-2 — satu-satunya jalur tulis)
 * - Menerima `tx` parameter pertama; TIDAK membuka transaksi sendiri (K-3)
 */
import { inArray } from "drizzle-orm";

import type { Transaction } from "../db";
import { accounts, journalEntries, journalLines } from "../db/schema";
import { generateDocNumber } from "./numbering";

export type JournalRefType =
  | "opening_balance"
  | "goods_receipt"
  | "invoice"
  | "invoice_hpp"
  | "payment"
  | "expense"
  | "stock_opname";

export interface JournalLineInput {
  accountCode: string; // contoh: '1-300' — kode, bukan id (§7.3)
  debit: number; // nol bila baris ini kredit
  kredit: number; // nol bila baris ini debit
  keterangan?: string;
}

export interface CreateJournalEntryInput {
  tanggal: Date;
  keterangan: string;
  refType: JournalRefType;
  refId: number | null;
  userId: number;
  lines: JournalLineInput[];
}

export interface CreateJournalEntryResult {
  journalEntryId: number;
  nomor: string;
}

/** Nominal dibulatkan ke sen sebelum diperbandingkan (menghindari galat float). */
const sen = (nilai: number): number =>
  Math.round((Number.isFinite(nilai) ? nilai : 0) * 100);

export async function createJournalEntry(
  tx: Transaction,
  input: CreateJournalEntryInput,
): Promise<CreateJournalEntryResult> {
  if (input.lines.length === 0) {
    throw new Error("Jurnal butuh minimal satu baris debit/kredit.");
  }

  // ==== Pemeriksaan keseimbangan (varang AB-10) — dilakukan SEBELUM menulis ====
  let totalDebit = 0;
  let totalKredit = 0;
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    if (!Number.isFinite(line.debit) || !Number.isFinite(line.kredit)) {
      throw new Error(`Baris jurnal ke-${i + 1} berisi nilai tidak valid.`);
    }
    if (line.debit > 0 && line.kredit > 0) {
      throw new Error(
        `Baris jurnal ke-${i + 1} mengisi debit dan kredit sekaligus — satu baris hanya boleh salah satu.`,
      );
    }
    if (line.debit === 0 && line.kredit === 0) {
      throw new Error(
        `Baris jurnal ke-${i + 1} bernilai nol — isi debit atau kredit di salah satunya.`,
      );
    }
    totalDebit += sen(line.debit) / 100;
    totalKredit += sen(line.kredit) / 100;
  }

  if (sen(totalDebit) !== sen(totalKredit)) {
    throw new Error(
      `Jurnal tidak seimbang: total debit Rp ${totalDebit.toLocaleString("id-ID")} ≠ total kredit Rp ${totalKredit.toLocaleString("id-ID")}.`,
    );
  }

  // ==== accountCode → account_id (§7.3) ====
  const kodeList = [...new Set(input.lines.map((l) => l.accountCode))];
  const barisAkun = await tx
    .select({ id: accounts.id, kode: accounts.kode })
    .from(accounts)
    .where(inArray(accounts.kode, kodeList));

  const accountMap = new Map(
    barisAkun.map((a) => [a.kode, a.id as number]),
  );
  for (const kode of kodeList) {
    if (!accountMap.has(kode)) {
      throw new Error(
        `Kode akun '${kode}' tidak dikenal dalam bagan akun — cek kode akun di templat jurnal.`,
      );
    }
  }

  // ==== Nomor jurnal via M1 (dalam transaksi yang sama, K-3) ====
  const nomor = await generateDocNumber(tx, "JV");

  const tanggalIso = input.tanggal.toISOString().slice(0, 10);

  // ==== Tulis journal_entries + journal_lines (satu-satunya jalur tulis, §7.3) ====
  const [entry] = await tx
    .insert(journalEntries)
    .values({
      nomor,
      tanggal: tanggalIso,
      keterangan: input.keterangan,
      refType: input.refType,
      refId: input.refId,
      totalDebit: totalDebit.toFixed(2),
      totalKredit: totalKredit.toFixed(2),
      dibuatOleh: input.userId,
    })
    .returning({ id: journalEntries.id });

  if (!entry) {
    throw new Error("Gagal menyimpan jurnal — coba lagi.");
  }

  await tx.insert(journalLines).values(
    input.lines.map((l) => ({
      journalEntryId: entry.id,
      accountId: accountMap.get(l.accountCode)!,
      debit: (sen(l.debit) / 100).toFixed(2),
      kredit: (sen(l.kredit) / 100).toFixed(2),
      keterangan: l.keterangan ?? null,
    })),
  );

  return { journalEntryId: entry.id, nomor };
}

/* ============================================================
 * MILIK M5 — KEUANGAN
 * src/services/payment.ts
 *
 * Layanan pembayaran: melunasi hutang ke supplier (J2) dan
 * piutang dari pelanggan (J5), serta mencatat beban operasional (J6).
 *
 * Kontrak tanda tangan sesuai PRD §7.5, §9.6.
 * Semua fungsi menerima `tx` sebagai parameter pertama (K-3).
 * Melempar galat — tidak mengembalikan null — bila aturan bisnis dilanggar (K-4).
 * ============================================================ */
import { eq } from "drizzle-orm";

import type { Transaction } from "@/db";
import {
  goodsReceipts,
  invoices,
  payments,
  purchaseOrders,
  salesOrders,
  suppliers,
  customers,
} from "@/db/schema";
import { createJournalEntry } from "./journal";
import { generateDocNumber } from "./numbering";
import { logAudit } from "./audit";

/* =====================================================================
 * markGoodsReceiptPaid — kontrak §7.5 (disediakan M5, dipanggil M5)
 * Hanya mengubah status_bayar GRN menjadi 'lunas'.
 * M5 memanggil ini SETELAH membentuk jurnal J2 (§7.5).
 * ===================================================================== */
export async function markGoodsReceiptPaid(
  tx: Transaction,
  grnId: number,
): Promise<void> {
  await tx
    .update(goodsReceipts)
    .set({ statusBayar: "lunas" })
    .where(eq(goodsReceipts.id, grnId));
}

/* =====================================================================
 * markInvoicePaid — kontrak §7.5 (disediakan M5, dipanggil M5)
 * Hanya mengubah status_bayar Invoice menjadi 'lunas'.
 * M5 memanggil ini SETELAH membentuk jurnal J5.
 * ===================================================================== */
export async function markInvoicePaid(
  tx: Transaction,
  invoiceId: number,
): Promise<void> {
  await tx
    .update(invoices)
    .set({ statusBayar: "lunas" })
    .where(eq(invoices.id, invoiceId));
}

/* =====================================================================
 * bayarKeSuplier — Pembayaran ke supplier, melunasi GRN (J2)
 * PRD §9.6 J2: D 2-100 Hutang Usaha / K 1-100 Kas & Bank
 * ===================================================================== */
export interface BayarKeSupplierInput {
  grnId: number;
  tanggal: Date;
  jumlah: number;
  metode: "kas" | "transfer";
  userId: number;
}

export async function bayarKeSuplier(
  tx: Transaction,
  input: BayarKeSupplierInput,
): Promise<{ paymentId: number; nomor: string }> {
  // 1. Ambil data GRN & validasi
  const rows = await tx
    .select({
      id: goodsReceipts.id,
      statusBayar: goodsReceipts.statusBayar,
      total: goodsReceipts.total,
      status: goodsReceipts.status,
      poId: goodsReceipts.poId,
      nomor: goodsReceipts.nomor,
    })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, input.grnId))
    .limit(1);

  const grn = rows[0];
  if (!grn) throw new Error("Penerimaan barang tidak ditemukan.");
  if (grn.status !== "posted")
    throw new Error("GRN harus berstatus 'posted' sebelum dibayar.");
  if (grn.statusBayar === "lunas")
    throw new Error("GRN ini sudah dilunasi sebelumnya.");

  const totalGrn = Number(grn.total);
  if (input.jumlah !== totalGrn)
    throw new Error(
      `Jumlah pembayaran Rp ${input.jumlah.toLocaleString("id-ID")} tidak sama dengan total GRN Rp ${totalGrn.toLocaleString("id-ID")}. Sistem hanya mendukung pelunasan penuh.`,
    );

  // 2. Ambil nama supplier untuk keterangan
  const poRows = await tx
    .select({ supplierId: purchaseOrders.supplierId })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, grn.poId))
    .limit(1);
  const supplierId = poRows[0]?.supplierId;

  let namaSupplier = "Supplier";
  if (supplierId) {
    const supRows = await tx
      .select({ nama: suppliers.nama })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    namaSupplier = supRows[0]?.nama ?? "Supplier";
  }

  // 3. Jurnal J2 — D Hutang Usaha / K Kas & Bank (§9.6)
  const { journalEntryId, nomor: nomorJv } = await createJournalEntry(tx, {
    tanggal: input.tanggal,
    keterangan: `Pembayaran hutang ke ${namaSupplier} — ${grn.nomor}`,
    refType: "payment",
    refId: input.grnId,
    userId: input.userId,
    lines: [
      { accountCode: "2-100", debit: input.jumlah, kredit: 0, keterangan: "Hutang Usaha dilunasi" },
      { accountCode: "1-100", debit: 0, kredit: input.jumlah, keterangan: `${input.metode === "kas" ? "Kas" : "Transfer Bank"}` },
    ],
  });

  // 4. Simpan pembayaran
  const nomorPay = await generateDocNumber(tx, "PAY");
  const [pay] = await tx
    .insert(payments)
    .values({
      nomor: nomorPay,
      tipe: "out",
      refType: "goods_receipt",
      refId: input.grnId,
      tanggal: input.tanggal.toISOString().slice(0, 10),
      jumlah: input.jumlah.toFixed(2),
      metode: input.metode,
      journalEntryId,
      dicatatOleh: input.userId,
    })
    .returning({ id: payments.id });

  if (!pay) throw new Error("Gagal menyimpan pembayaran.");

  // 5. Tandai GRN lunas (§7.5)
  await markGoodsReceiptPaid(tx, input.grnId);

  // 6. Log audit
  await logAudit(tx, {
    userId: input.userId,
    aksi: "post",
    entitas: "payments",
    entitasId: pay.id,
    detail: { nomor: nomorPay, nomorJv, grnId: input.grnId, jumlah: input.jumlah },
  });

  return { paymentId: pay.id, nomor: nomorPay };
}

/* =====================================================================
 * terimaFromPelanggan — Penerimaan dari pelanggan, melunasi Invoice (J5)
 * PRD §9.6 J5: D 1-100 Kas & Bank / K 1-200 Piutang Usaha
 * ===================================================================== */
export interface TerimaFromPelangganInput {
  invoiceId: number;
  tanggal: Date;
  jumlah: number;
  metode: "kas" | "transfer";
  userId: number;
}

export async function terimaFromPelanggan(
  tx: Transaction,
  input: TerimaFromPelangganInput,
): Promise<{ paymentId: number; nomor: string }> {
  // 1. Ambil data invoice & validasi
  const rows = await tx
    .select({
      id: invoices.id,
      statusBayar: invoices.statusBayar,
      total: invoices.total,
      status: invoices.status,
      soId: invoices.soId,
      nomor: invoices.nomor,
    })
    .from(invoices)
    .where(eq(invoices.id, input.invoiceId))
    .limit(1);

  const inv = rows[0];
  if (!inv) throw new Error("Invoice tidak ditemukan.");
  if (inv.status !== "posted")
    throw new Error("Invoice harus berstatus 'posted' sebelum dilunasi.");
  if (inv.statusBayar === "lunas")
    throw new Error("Invoice ini sudah dilunasi sebelumnya.");

  const totalInv = Number(inv.total);
  if (input.jumlah !== totalInv)
    throw new Error(
      `Jumlah pembayaran Rp ${input.jumlah.toLocaleString("id-ID")} tidak sama dengan total invoice Rp ${totalInv.toLocaleString("id-ID")}. Sistem hanya mendukung pelunasan penuh.`,
    );

  // 2. Ambil nama pelanggan
  const soRows = await tx
    .select({ customerId: salesOrders.customerId })
    .from(salesOrders)
    .where(eq(salesOrders.id, inv.soId))
    .limit(1);
  const customerId = soRows[0]?.customerId;

  let namaPelanggan = "Pelanggan";
  if (customerId) {
    const custRows = await tx
      .select({ nama: customers.nama })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    namaPelanggan = custRows[0]?.nama ?? "Pelanggan";
  }

  // 3. Jurnal J5 — D Kas & Bank / K Piutang Usaha (§9.6)
  const { journalEntryId, nomor: nomorJv } = await createJournalEntry(tx, {
    tanggal: input.tanggal,
    keterangan: `Pelunasan piutang dari ${namaPelanggan} — ${inv.nomor}`,
    refType: "payment",
    refId: input.invoiceId,
    userId: input.userId,
    lines: [
      { accountCode: "1-100", debit: input.jumlah, kredit: 0, keterangan: `${input.metode === "kas" ? "Kas diterima" : "Transfer masuk"}` },
      { accountCode: "1-200", debit: 0, kredit: input.jumlah, keterangan: "Piutang dilunasi" },
    ],
  });

  // 4. Simpan pembayaran
  const nomorPay = await generateDocNumber(tx, "PAY");
  const [pay] = await tx
    .insert(payments)
    .values({
      nomor: nomorPay,
      tipe: "in",
      refType: "invoice",
      refId: input.invoiceId,
      tanggal: input.tanggal.toISOString().slice(0, 10),
      jumlah: input.jumlah.toFixed(2),
      metode: input.metode,
      journalEntryId,
      dicatatOleh: input.userId,
    })
    .returning({ id: payments.id });

  if (!pay) throw new Error("Gagal menyimpan pembayaran.");

  // 5. Tandai invoice lunas (§7.5)
  await markInvoicePaid(tx, input.invoiceId);

  // 6. Log audit
  await logAudit(tx, {
    userId: input.userId,
    aksi: "post",
    entitas: "payments",
    entitasId: pay.id,
    detail: { nomor: nomorPay, nomorJv, invoiceId: input.invoiceId, jumlah: input.jumlah },
  });

  return { paymentId: pay.id, nomor: nomorPay };
}

/* =====================================================================
 * catatBeban — Beban operasional (J6)
 * PRD §9.6 J6: D 5-200 Beban Operasional / K 1-100 Kas & Bank
 * ===================================================================== */
export interface CatatBebanInput {
  tanggal: Date;
  keterangan: string;
  jumlah: number;
  metode: "kas" | "transfer";
  userId: number;
}

export async function catatBeban(
  tx: Transaction,
  input: CatatBebanInput,
): Promise<{ journalEntryId: number; nomor: string }> {
  const { journalEntryId, nomor } = await createJournalEntry(tx, {
    tanggal: input.tanggal,
    keterangan: input.keterangan,
    refType: "expense",
    refId: null,
    userId: input.userId,
    lines: [
      { accountCode: "5-200", debit: input.jumlah, kredit: 0, keterangan: input.keterangan },
      { accountCode: "1-100", debit: 0, kredit: input.jumlah, keterangan: `${input.metode === "kas" ? "Kas" : "Transfer Bank"}` },
    ],
  });

  await logAudit(tx, {
    userId: input.userId,
    aksi: "create",
    entitas: "journal_entries",
    entitasId: journalEntryId,
    detail: { nomor, keterangan: input.keterangan, jumlah: input.jumlah },
  });

  return { journalEntryId, nomor };
}


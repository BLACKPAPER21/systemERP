"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { db } from "@/db";
import { AuthError, requireRole } from "@/lib/auth-guard";
import type { InputPO, InputGRN } from "@/lib/validations/pembelian";
import { approvePurchaseOrder, cancelPurchaseOrder, createGoodsReceipt, createPurchaseOrder, deleteDraftGoodsReceipt, postGoodsReceipt, updatePurchaseOrder, updateDraftGoodsReceipt } from "@/services/purchasing";

type Hasil = { ok: true; id?: number; pesan: string } | { ok: false; pesan: string };
function pesanError(error: unknown) {
  if (error instanceof ZodError) return error.issues.map((i) => i.message).join("; ");
  if (error instanceof AuthError) return error.message;
  if (error instanceof Error && !("cause" in error) && !("code" in error)) return error.message;
  return "Terjadi kesalahan saat menyimpan data. Silakan coba lagi.";
}
function segarkan() {
  for (const path of ["/pembelian/po", "/pembelian/grn", "/pembelian/hutang", "/keuangan/pembayaran", "/keuangan/jurnal", "/master/produk", "/"]) revalidatePath(path);
}

export async function buatPO(input: InputPO): Promise<Hasil> {
  try {
    const sesi = await requireRole(["owner"]);
    const result = await db.transaction((tx) => createPurchaseOrder(tx, input, sesi.userId));
    segarkan();
    return { ok: true, id: result.id, pesan: `PO ${result.nomor} berhasil dibuat.` };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}
export async function ubahPO(id: number, input: InputPO): Promise<Hasil> {
  try {
    const sesi = await requireRole(["owner"]);
    await db.transaction((tx) => updatePurchaseOrder(tx, id, input, sesi.userId));
    segarkan(); revalidatePath(`/pembelian/po/${id}`);
    return { ok: true, id, pesan: "PO berhasil diubah." };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}

export async function setujuiPO(id: number): Promise<Hasil> {
  try {
    const sesi = await requireRole(["owner"]);
    await db.transaction((tx) => approvePurchaseOrder(tx, id, sesi.userId));
    segarkan(); revalidatePath(`/pembelian/po/${id}`);
    return { ok: true, pesan: "PO berhasil disetujui." };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}
export async function batalPO(id: number): Promise<Hasil> {
  try {
    const sesi = await requireRole(["owner"]);
    await db.transaction((tx) => cancelPurchaseOrder(tx, id, sesi.userId));
    segarkan(); revalidatePath(`/pembelian/po/${id}`);
    return { ok: true, pesan: "PO berhasil dibatalkan." };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}
export async function buatGRN(input: InputGRN): Promise<Hasil> {
  try {
    const sesi = await requireRole(["gudang"]);
    const result = await db.transaction((tx) => createGoodsReceipt(tx, input, sesi.userId));
    segarkan(); revalidatePath(`/pembelian/po/${input.poId}`);
    return { ok: true, id: result.id, pesan: `Penerimaan ${result.nomor} berhasil dibuat.` };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}
export async function ubahGRN(id: number, input: InputGRN): Promise<Hasil> {
  try {
    const sesi = await requireRole(["gudang"]);
    await db.transaction((tx) => updateDraftGoodsReceipt(tx, id, input, sesi.userId));
    segarkan(); revalidatePath(`/pembelian/po/${input.poId}`); revalidatePath(`/pembelian/grn/${id}`);
    return { ok: true, id, pesan: "Draft penerimaan berhasil diubah." };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}

export async function postingGRN(id: number): Promise<Hasil> {
  try {
    const sesi = await requireRole(["gudang"]);
    await db.transaction((tx) => postGoodsReceipt(tx, id, sesi.userId));
    segarkan(); revalidatePath(`/pembelian/grn/${id}`);
    return { ok: true, pesan: "Penerimaan berhasil diposting. Stok dan jurnal telah diperbarui." };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}
export async function hapusDraftGRN(id: number): Promise<Hasil> {
  try {
    const sesi = await requireRole(["gudang"]);
    await db.transaction((tx) => deleteDraftGoodsReceipt(tx, id, sesi.userId));
    segarkan();
    return { ok: true, pesan: "Draft penerimaan dihapus." };
  } catch (error) { return { ok: false, pesan: pesanError(error) }; }
}

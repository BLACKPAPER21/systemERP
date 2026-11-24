/* M2 — operasi pembelian. Semua transaksi dibuka oleh pemanggil. */
import { and, eq, inArray } from "drizzle-orm";
import type { Transaction } from "@/db";
import { products, suppliers, purchaseOrders, purchaseOrderItems, goodsReceipts, goodsReceiptItems } from "@/db/schema";
import { skemaPO, skemaGRN, skemaId, keSeratusan, formatDesimal, subtotalItem, totalItem, type InputPO, type InputGRN } from "@/lib/validations/pembelian";
import { logAudit } from "./audit";
import { generateDocNumber } from "./numbering";
import { recordStockIn } from "./stock";
import { createJournalEntry } from "./journal";

async function kunciPO(tx: Transaction, id: number) {
  const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).for("update");
  if (!po) throw new Error("Pesanan pembelian tidak ditemukan.");
  return po;
}

export async function createPurchaseOrder(tx: Transaction, input: InputPO, userId: number) {
  const data = skemaPO.parse(input);
  const [supplier] = await tx.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, data.supplierId), eq(suppliers.aktif, true)));
  if (!supplier) throw new Error("Supplier tidak ditemukan atau sudah tidak aktif.");
  const activeProducts = await tx.select({ id: products.id }).from(products).where(and(inArray(products.id, data.items.map((i) => i.productId)), eq(products.aktif, true)));
  if (activeProducts.length !== data.items.length) throw new Error("Ada produk yang tidak ditemukan atau sudah tidak aktif.");
  const subtotals = data.items.map((item) => subtotalItem(item.qty, item.hargaSatuan));
  const total = totalItem(subtotals);
  const nomor = await generateDocNumber(tx, "PO");
  const [po] = await tx.insert(purchaseOrders).values({ nomor, supplierId: data.supplierId, tanggal: data.tanggal, total, dibuatOleh: userId }).returning({ id: purchaseOrders.id });
  await tx.insert(purchaseOrderItems).values(data.items.map((item, index) => ({ poId: po.id, productId: item.productId, qty: formatDesimal(keSeratusan(item.qty)), hargaSatuan: formatDesimal(keSeratusan(item.hargaSatuan)), subtotal: formatDesimal(subtotals[index]) })));
  await logAudit(tx, { userId, aksi: "create", entitas: "purchase_orders", entitasId: po.id, detail: { nomor, total } });
  return { id: po.id, nomor };
}

export async function updatePurchaseOrder(tx: Transaction, id: number, input: InputPO, userId: number) {
  skemaId.parse(id);
  const data = skemaPO.parse(input);
  const po = await kunciPO(tx, id);
  if (po.status !== "draft") throw new Error("Hanya PO draft yang dapat diubah.");
  const [existingReceipt] = await tx.select({ id: goodsReceipts.id }).from(goodsReceipts).where(eq(goodsReceipts.poId, id)).limit(1);
  if (existingReceipt) throw new Error("PO yang sudah memiliki penerimaan tidak dapat diubah.");
  const [supplier] = await tx.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, data.supplierId), eq(suppliers.aktif, true)));
  if (!supplier) throw new Error("Supplier tidak ditemukan atau sudah tidak aktif.");
  const active = await tx.select({ id: products.id }).from(products).where(and(inArray(products.id, data.items.map((i) => i.productId)), eq(products.aktif, true)));
  if (active.length !== data.items.length) throw new Error("Ada produk yang tidak ditemukan atau sudah tidak aktif.");
  const subtotals = data.items.map((item) => subtotalItem(item.qty, item.hargaSatuan));
  const total = totalItem(subtotals);
  await tx.update(purchaseOrders).set({ supplierId: data.supplierId, tanggal: data.tanggal, total }).where(eq(purchaseOrders.id, id));
  await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));
  await tx.insert(purchaseOrderItems).values(data.items.map((item, i) => ({ poId: id, productId: item.productId, qty: formatDesimal(keSeratusan(item.qty)), hargaSatuan: formatDesimal(keSeratusan(item.hargaSatuan)), subtotal: formatDesimal(subtotals[i]) })));
  await logAudit(tx, { userId, aksi: "update", entitas: "purchase_orders", entitasId: id, detail: { nomor: po.nomor, total } });
}

export async function approvePurchaseOrder(tx: Transaction, id: number, userId: number) {
  skemaId.parse(id);
  const po = await kunciPO(tx, id);
  if (po.status !== "draft") throw new Error("Hanya PO berstatus draft yang dapat disetujui.");
  await tx.update(purchaseOrders).set({ status: "approved", disetujuiOleh: userId }).where(eq(purchaseOrders.id, id));
  await logAudit(tx, { userId, aksi: "update", entitas: "purchase_orders", entitasId: id, detail: { nomor: po.nomor, status: "approved" } });
}

export async function cancelPurchaseOrder(tx: Transaction, id: number, userId: number) {
  skemaId.parse(id);
  const po = await kunciPO(tx, id);
  if (po.status !== "draft" && po.status !== "approved") throw new Error("PO ini tidak dapat dibatalkan.");
  const [receipt] = await tx.select({ id: goodsReceipts.id }).from(goodsReceipts).where(eq(goodsReceipts.poId, id)).limit(1);
  if (receipt) throw new Error("PO yang sudah memiliki penerimaan barang tidak dapat dibatalkan.");
  await tx.update(purchaseOrders).set({ status: "cancelled" }).where(eq(purchaseOrders.id, id));
  await logAudit(tx, { userId, aksi: "cancel", entitas: "purchase_orders", entitasId: id, detail: { nomor: po.nomor } });
}

// Saldo mencakup draft dan posted: draft mencadangkan kuantitas agar tidak terima ganda.
export async function getPurchaseBalance(tx: Transaction, poId: number) {
  const orderItems = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  const receiptItems = await tx.select({ productId: goodsReceiptItems.productId, qty: goodsReceiptItems.qtyDiterima, status: goodsReceipts.status })
    .from(goodsReceiptItems).innerJoin(goodsReceipts, eq(goodsReceiptItems.grnId, goodsReceipts.id)).where(eq(goodsReceipts.poId, poId));
  return orderItems.map((item) => {
    const related = receiptItems.filter((r) => r.productId === item.productId);
    const reserved = related.reduce((sum, r) => sum + keSeratusan(r.qty), 0n);
    const posted = related.filter((r) => r.status === "posted").reduce((sum, r) => sum + keSeratusan(r.qty), 0n);
    return { ...item, ordered: keSeratusan(item.qty), reserved, posted };
  });
}

export async function createGoodsReceipt(tx: Transaction, input: InputGRN, userId: number) {
  const data = skemaGRN.parse(input);
  const po = await kunciPO(tx, data.poId);
  if (po.status !== "approved") throw new Error("Penerimaan hanya dapat dibuat dari PO yang disetujui.");
  const balance = await getPurchaseBalance(tx, po.id);
  const mapped = data.items.map((item) => {
    const ordered = balance.find((b) => b.productId === item.productId);
    if (!ordered) throw new Error("Produk penerimaan tidak terdapat dalam PO.");
    if (keSeratusan(item.qtyDiterima) > ordered.ordered - ordered.reserved) throw new Error(`Jumlah produk ID ${item.productId} melebihi sisa PO yang belum diterima atau dicadangkan.`);
    return { ...item, hargaSatuan: ordered.hargaSatuan, subtotal: subtotalItem(item.qtyDiterima, ordered.hargaSatuan) };
  });
  const total = totalItem(mapped.map((item) => item.subtotal));
  const nomor = await generateDocNumber(tx, "GRN");
  const [receipt] = await tx.insert(goodsReceipts).values({ nomor, poId: po.id, tanggal: data.tanggal, total, diterimaOleh: userId }).returning({ id: goodsReceipts.id });
  await tx.insert(goodsReceiptItems).values(mapped.map((item) => ({ grnId: receipt.id, productId: item.productId, qtyDiterima: formatDesimal(keSeratusan(item.qtyDiterima)), hargaSatuan: item.hargaSatuan, subtotal: formatDesimal(item.subtotal) })));
  await logAudit(tx, { userId, aksi: "create", entitas: "goods_receipts", entitasId: receipt.id, detail: { nomor, po: po.nomor, total } });
  return { id: receipt.id, nomor };
}

// Urutan kunci konsisten untuk pembuatan/pembatalan PO dan posting GRN: PO, GRN, produk.
async function kunciGRNdanPO(tx: Transaction, id: number) {
  skemaId.parse(id);
  const [reference] = await tx.select({ poId: goodsReceipts.poId }).from(goodsReceipts).where(eq(goodsReceipts.id, id));
  if (!reference) throw new Error("Penerimaan barang tidak ditemukan.");
  const po = await kunciPO(tx, reference.poId);
  const [receipt] = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.id, id)).for("update");
  if (!receipt) throw new Error("Penerimaan barang tidak ditemukan.");
  return { po, receipt };
}

export async function updateDraftGoodsReceipt(tx: Transaction, id: number, input: InputGRN, userId: number) {
  const data = skemaGRN.parse(input);
  const { po, receipt } = await kunciGRNdanPO(tx, id);
  if (receipt.status !== "draft") throw new Error("Hanya penerimaan draft yang dapat diubah.");
  if (po.status !== "approved" || data.poId !== po.id) throw new Error("PO penerimaan tidak sesuai atau tidak lagi disetujui.");
  const [balance, existing] = await Promise.all([
    getPurchaseBalance(tx, po.id),
    tx.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.grnId, id)),
  ]);
  const mapped = data.items.map((item) => {
    const ordered = balance.find((b) => b.productId === item.productId);
    if (!ordered) throw new Error("Produk penerimaan tidak terdapat dalam PO.");
    const oldQty = existing.filter((e) => e.productId === item.productId).reduce((sum, e) => sum + keSeratusan(e.qtyDiterima), 0n);
    if (keSeratusan(item.qtyDiterima) > ordered.ordered - ordered.reserved + oldQty) throw new Error(`Jumlah produk ID ${item.productId} melebihi sisa PO yang tersedia.`);
    return { ...item, hargaSatuan: ordered.hargaSatuan, subtotal: subtotalItem(item.qtyDiterima, ordered.hargaSatuan) };
  });
  const total = totalItem(mapped.map((item) => item.subtotal));
  await tx.update(goodsReceipts).set({ tanggal: data.tanggal, total }).where(eq(goodsReceipts.id, id));
  await tx.delete(goodsReceiptItems).where(eq(goodsReceiptItems.grnId, id));
  await tx.insert(goodsReceiptItems).values(mapped.map((item) => ({ grnId: id, productId: item.productId, qtyDiterima: formatDesimal(keSeratusan(item.qtyDiterima)), hargaSatuan: item.hargaSatuan, subtotal: formatDesimal(item.subtotal) })));
  await logAudit(tx, { userId, aksi: "update", entitas: "goods_receipts", entitasId: id, detail: { nomor: receipt.nomor, total } });
}

export async function postGoodsReceipt(tx: Transaction, id: number, userId: number) {
  const { po, receipt } = await kunciGRNdanPO(tx, id);
  if (receipt.status !== "draft") throw new Error("Hanya penerimaan draft yang dapat diposting.");
  if (po.status !== "approved") throw new Error("PO harus berstatus disetujui.");
  const items = await tx.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.grnId, id)).orderBy(goodsReceiptItems.productId);
  if (!items.length) throw new Error("Penerimaan tidak memiliki produk.");
  const balance = await getPurchaseBalance(tx, po.id);
  if (balance.some((b) => b.reserved > b.ordered) || items.some((i) => !balance.some((b) => b.productId === i.productId))) throw new Error("Jumlah penerimaan melebihi atau tidak sesuai PO.");
  const subtotals = items.map((item) => subtotalItem(item.qtyDiterima, item.hargaSatuan));
  const total = totalItem(subtotals);
  if (total !== receipt.total || items.some((item, index) => formatDesimal(subtotals[index]) !== item.subtotal)) throw new Error("Nilai penerimaan tidak konsisten. Periksa data sebelum posting.");
  for (const item of items) {
    await recordStockIn(tx, { productId: item.productId, qty: Number(item.qtyDiterima), unitCost: Number(item.hargaSatuan), refType: "goods_receipt", refId: id, keterangan: receipt.nomor });
  }
  const journal = await createJournalEntry(tx, {
    tanggal: new Date(`${receipt.tanggal}T00:00:00.000Z`), keterangan: `Penerimaan barang ${receipt.nomor} dari PO ${po.nomor}`,
    refType: "goods_receipt", refId: id, userId,
    lines: [{ accountCode: "1-300", debit: Number(total), kredit: 0 }, { accountCode: "2-100", debit: 0, kredit: Number(total) }],
  });
  await tx.update(goodsReceipts).set({ status: "posted", journalEntryId: journal.journalEntryId }).where(eq(goodsReceipts.id, id));
  // Posting saat ini sudah dihitung dalam reserved; hitung ulang posted setelah perubahan status.
  const after = await getPurchaseBalance(tx, po.id);
  if (after.length && after.every((item) => item.posted === item.ordered)) {
    await tx.update(purchaseOrders).set({ status: "received" }).where(eq(purchaseOrders.id, po.id));
  }
  await logAudit(tx, { userId, aksi: "post", entitas: "goods_receipts", entitasId: id, detail: { nomor: receipt.nomor, po: po.nomor, journalEntryId: journal.journalEntryId, total } });
}

export async function deleteDraftGoodsReceipt(tx: Transaction, id: number, userId: number) {
  const { receipt } = await kunciGRNdanPO(tx, id);
  if (receipt.status !== "draft") throw new Error("Penerimaan yang sudah diposting tidak dapat dihapus.");
  await logAudit(tx, { userId, aksi: "cancel", entitas: "goods_receipts", entitasId: id, detail: { nomor: receipt.nomor, alasan: "Draft dihapus" } });
  await tx.delete(goodsReceiptItems).where(eq(goodsReceiptItems.grnId, id));
  await tx.delete(goodsReceipts).where(eq(goodsReceipts.id, id));
}

/** Dipanggil M5 di dalam transaksi pembayaran, setelah GRN dikunci. */
export async function markGoodsReceiptPaid(tx: Transaction, grnId: number): Promise<void> {
  skemaId.parse(grnId);
  const updated = await tx.update(goodsReceipts).set({ statusBayar: "lunas" })
    .where(and(eq(goodsReceipts.id, grnId), eq(goodsReceipts.status, "posted"), eq(goodsReceipts.statusBayar, "belum"))).returning({ id: goodsReceipts.id });
  if (!updated.length) throw new Error("GRN tidak ditemukan, belum diposting, atau sudah lunas.");
}

/* Integrasi M2. Jalankan HANYA pada database uji terpisah yang sudah di-seed.
 * M2_TEST_DATABASE_RESET_OK=yes DATABASE_URL=... node --import tsx tests/m2-integration.ts
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { accounts, goodsReceipts, journalEntries, journalLines, payments, products, purchaseOrders, stockMovements } from "@/db/schema";
import { approvePurchaseOrder, cancelPurchaseOrder, createGoodsReceipt, createPurchaseOrder, deleteDraftGoodsReceipt, postGoodsReceipt, updatePurchaseOrder, updateDraftGoodsReceipt } from "@/services/purchasing";
import { bayarKeSuplier } from "@/services/payment";

if (process.env.M2_TEST_DATABASE_RESET_OK !== "yes") throw new Error("Tes hanya untuk database uji terpisah; set M2_TEST_DATABASE_RESET_OK=yes.");
const date = "2026-11-17";
const owner = 1, gudang = 2, keuangan = 4;
const transaction = <T>(fn: Parameters<typeof db.transaction<T>>[0]) => db.transaction(fn);
async function main() {
  const po = await transaction((tx) => createPurchaseOrder(tx, { supplierId: 1, tanggal: date, items: [{ productId: 1, qty: "10", hargaSatuan: "50000" }] }, owner));
  await assert.rejects(() => transaction((tx) => createGoodsReceipt(tx, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "1" }] }, gudang)), /disetujui/);
  await transaction((tx) => updatePurchaseOrder(tx, po.id, { supplierId: 1, tanggal: date, items: [{ productId: 1, qty: "10", hargaSatuan: "50000" }] }, owner));
  await transaction((tx) => approvePurchaseOrder(tx, po.id, owner));
  await assert.rejects(() => transaction((tx) => createGoodsReceipt(tx, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "11" }] }, gudang)), /melebihi/);
  const first = await transaction((tx) => createGoodsReceipt(tx, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "4" }] }, gudang));
  await assert.rejects(() => transaction((tx) => cancelPurchaseOrder(tx, po.id, owner)), /sudah memiliki/);
  await assert.rejects(() => transaction((tx) => createGoodsReceipt(tx, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "7" }] }, gudang)), /melebihi/);
  const second = await transaction((tx) => createGoodsReceipt(tx, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "6" }] }, gudang));
  await assert.rejects(() => transaction((tx) => updateDraftGoodsReceipt(tx, first.id, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "5" }] }, gudang)), /melebihi/);
  await transaction((tx) => updateDraftGoodsReceipt(tx, first.id, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "3" }] }, gudang));
  await transaction((tx) => updateDraftGoodsReceipt(tx, first.id, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "4" }] }, gudang));
  await transaction((tx) => postGoodsReceipt(tx, first.id, gudang));
  await assert.rejects(() => transaction((tx) => updateDraftGoodsReceipt(tx, first.id, { poId: po.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "4" }] }, gudang)), /draft/);
  await assert.rejects(() => transaction((tx) => updatePurchaseOrder(tx, po.id, { supplierId: 1, tanggal: date, items: [{ productId: 1, qty: "10", hargaSatuan: "50000" }] }, owner)), /draft/);
  let [product] = await db.select().from(products).where(eq(products.id, 1));
  assert.equal(product.stokSaatIni, "4.00");
  assert.equal(product.hargaPokokRataRata, "50000.00");
  const [firstReceipt] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, first.id));
  assert.equal(firstReceipt.total, "200000.00");
  assert.equal(firstReceipt.status, "posted");
  const [journal] = await db.select().from(journalEntries).where(eq(journalEntries.id, firstReceipt.journalEntryId!));
  assert.equal(journal.totalDebit, "200000.00");
  assert.equal(journal.totalKredit, "200000.00");
  assert.equal((await db.select().from(journalLines).where(eq(journalLines.journalEntryId, journal.id))).length, 2);
  await assert.rejects(() => transaction((tx) => postGoodsReceipt(tx, first.id, gudang)), /draft/);
  await transaction((tx) => postGoodsReceipt(tx, second.id, gudang));
  assert.equal((await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, po.id)))[0].status, "received");
  assert.equal((await db.select().from(stockMovements).where(eq(stockMovements.productId, 1))).length, 2);
  await transaction((tx) => bayarKeSuplier(tx, { grnId: first.id, tanggal: new Date(`${date}T00:00:00Z`), jumlah: 200000, metode: "kas", userId: keuangan }));
  assert.equal((await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, first.id)))[0].statusBayar, "lunas");
  assert.equal((await db.select().from(payments).where(eq(payments.refId, first.id))).length, 1);
  await assert.rejects(() => transaction((tx) => bayarKeSuplier(tx, { grnId: first.id, tanggal: new Date(`${date}T00:00:00Z`), jumlah: 200000, metode: "kas", userId: keuangan })), /dilunasi/);
  const po2 = await transaction((tx) => createPurchaseOrder(tx, { supplierId: 1, tanggal: date, items: [{ productId: 1, qty: "10", hargaSatuan: "70000" }] }, owner));
  await transaction((tx) => approvePurchaseOrder(tx, po2.id, owner));
  const draft = await transaction((tx) => createGoodsReceipt(tx, { poId: po2.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "10" }] }, gudang));
  await transaction((tx) => deleteDraftGoodsReceipt(tx, draft.id, gudang));
  const grn = await transaction((tx) => createGoodsReceipt(tx, { poId: po2.id, tanggal: date, items: [{ productId: 1, qtyDiterima: "10" }] }, gudang));
  // Kegagalan jurnal harus membatalkan pergerakan dan saldo stok.
  await db.update(accounts).set({ kode: "uji-hilang" }).where(eq(accounts.kode, "1-300"));
  try { await assert.rejects(() => transaction((tx) => postGoodsReceipt(tx, grn.id, gudang)), /tidak dikenal/); }
  finally { await db.update(accounts).set({ kode: "1-300" }).where(eq(accounts.kode, "uji-hilang")); }
  [product] = await db.select().from(products).where(eq(products.id, 1));
  assert.equal(product.stokSaatIni, "10.00");
  assert.equal((await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, grn.id)))[0].status, "draft");
  await transaction((tx) => postGoodsReceipt(tx, grn.id, gudang));
  [product] = await db.select().from(products).where(eq(products.id, 1));
  assert.equal(product.stokSaatIni, "20.00");
  assert.equal(product.hargaPokokRataRata, "60000.00");
  const decimal = await transaction((tx) => createPurchaseOrder(tx, { supplierId: 1, tanggal: date, items: [{ productId: 2, qty: "0.30", hargaSatuan: "0.05" }] }, owner));
  assert.equal((await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, decimal.id)))[0].total, "0.02");
  await assert.rejects(() => transaction((tx) => createPurchaseOrder(tx, { supplierId: 1, tanggal: date, items: [{ productId: 1, qty: "1", hargaSatuan: "1" }, { productId: 1, qty: "1", hargaSatuan: "1" }] }, owner)), /satu kali/);
  const concurrent = await transaction((tx) => createPurchaseOrder(tx, { supplierId: 1, tanggal: date, items: [{ productId: 3, qty: "10", hargaSatuan: "100" }] }, owner));
  await transaction((tx) => approvePurchaseOrder(tx, concurrent.id, owner));
  const attempts = await Promise.allSettled([1, 2].map(() => transaction((tx) => createGoodsReceipt(tx, { poId: concurrent.id, tanggal: date, items: [{ productId: 3, qtyDiterima: "7" }] }, gudang))));
  assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1, "Dua request bersamaan tidak boleh menerima lebih dari qty PO");
  assert.equal(attempts.filter((a) => a.status === "rejected").length, 1);
  console.log("PASS: PO, persetujuan, penerimaan bertahap, batas qty & request bersamaan, draft, posting, stok, HPP, jurnal, pembayaran, rollback, dan desimal.");
}
main().finally(() => pool.end()).catch((error) => { console.error(error); process.exitCode = 1; });

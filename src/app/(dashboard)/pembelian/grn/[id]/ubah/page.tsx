import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goodsReceipts, goodsReceiptItems, purchaseOrders, products } from "@/db/schema";
import { getPurchaseBalance } from "@/services/purchasing";
import { formatDesimal, keSeratusan } from "@/lib/validations/pembelian";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { GRNForm } from "@/components/pembelian/grn-form";

export default async function UbahGRNPage({ params }: { params: Promise<{ id: string }> }) {
  const akses = await pageAccess(["gudang"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) notFound();
  const [grn] = await db.select({ id: goodsReceipts.id, nomor: goodsReceipts.nomor, tanggal: goodsReceipts.tanggal, status: goodsReceipts.status, poId: goodsReceipts.poId, po: purchaseOrders.nomor }).from(goodsReceipts).innerJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id)).where(eq(goodsReceipts.id, id));
  if (!grn) notFound();
  if (grn.status !== "draft") return <div className="rounded-lg border bg-background p-5">Hanya GRN draft yang dapat diubah. <Link href={`/pembelian/grn/${id}`} className="text-primary underline">Kembali ke GRN</Link></div>;
  const [balance, allProducts, existing] = await Promise.all([
    db.transaction((tx) => getPurchaseBalance(tx, grn.poId)),
    db.select({ id: products.id, nama: products.nama, sku: products.sku, satuan: products.satuan }).from(products),
    db.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.grnId, id)),
  ]);
  const qty = Object.fromEntries(existing.map((i) => [i.productId, i.qtyDiterima]));
  const items = balance.map((b) => {
    const p = allProducts.find((product) => product.id === b.productId)!;
    const own = existing.filter((i) => i.productId === b.productId).reduce((sum, i) => sum + keSeratusan(i.qtyDiterima), 0n);
    return { productId: b.productId, sku: p.sku, nama: p.nama, satuan: p.satuan, sisa: formatDesimal(b.ordered - b.reserved + own), hargaSatuan: b.hargaSatuan };
  }).filter((i) => Number(i.sisa) > 0);
  return <div><PageHeader judul={`Ubah ${grn.nomor}`} deskripsi={`PO ${grn.po} · Perubahan hanya tersedia selama GRN masih draft.`} /><GRNForm poId={grn.poId} items={items} initial={{ id, tanggal: grn.tanggal, qty }} /></div>;
}

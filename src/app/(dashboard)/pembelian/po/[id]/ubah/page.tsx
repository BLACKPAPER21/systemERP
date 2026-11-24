import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, suppliers, purchaseOrders, purchaseOrderItems } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { POForm } from "@/components/pembelian/po-form";

export default async function UbahPOPage({ params }: { params: Promise<{ id: string }> }) {
  const akses = await pageAccess(["owner"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) notFound();
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  if (!po) notFound();
  if (po.status !== "draft") return <div className="rounded-lg border bg-background p-5">Hanya PO draft yang dapat diubah. <Link href={`/pembelian/po/${id}`} className="text-primary underline">Kembali ke PO</Link></div>;
  const [supplierList, productList, items] = await Promise.all([
    db.select({ id: suppliers.id, nama: suppliers.nama, kode: suppliers.kode }).from(suppliers).where(eq(suppliers.aktif, true)).orderBy(asc(suppliers.nama)),
    db.select({ id: products.id, nama: products.nama, sku: products.sku, satuan: products.satuan }).from(products).where(eq(products.aktif, true)).orderBy(asc(products.nama)),
    db.select({ productId: purchaseOrderItems.productId, qty: purchaseOrderItems.qty, hargaSatuan: purchaseOrderItems.hargaSatuan }).from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id)),
  ]);
  return <div><PageHeader judul={`Ubah ${po.nomor}`} deskripsi="Perubahan hanya tersedia selama PO masih draft." /><POForm suppliers={supplierList} products={productList} initial={{ id, supplierId: po.supplierId, tanggal: po.tanggal, items }} /></div>;
}

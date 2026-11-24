import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchaseOrders, suppliers, products } from "@/db/schema";
import { getPurchaseBalance } from "@/services/purchasing";
import { formatDesimal } from "@/lib/validations/pembelian";
import { pageAccess } from "@/lib/auth-guard";
import { formatTanggal } from "@/lib/format";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { GRNForm } from "@/components/pembelian/grn-form";

export default async function BuatGRNPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const akses = await pageAccess(["gudang"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const sp = await searchParams;
  const poId = typeof sp.po === "string" ? Number(sp.po) : 0;
  const orders = await db.select({ id: purchaseOrders.id, nomor: purchaseOrders.nomor, tanggal: purchaseOrders.tanggal, supplier: suppliers.nama }).from(purchaseOrders).innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(eq(purchaseOrders.status, "approved")).orderBy(purchaseOrders.id);
  const po = orders.find((order) => order.id === poId);
  if (!po) return <div><PageHeader judul="Pilih PO untuk Penerimaan" deskripsi="Pilih PO berstatus disetujui untuk mencatat barang yang datang." /><div className="space-y-2 rounded-lg border bg-background p-5">{orders.length ? orders.map((o) => <Link key={o.id} href={`/pembelian/grn/buat?po=${o.id}`} className="block rounded-md border p-3 text-sm hover:bg-accent"><strong>{o.nomor}</strong> · {o.supplier} · {formatTanggal(o.tanggal)}</Link>) : <p className="text-sm text-muted-foreground">Belum ada PO yang disetujui.</p>}<Link href="/pembelian/grn" className="inline-block pt-2 text-sm text-primary underline">Kembali ke daftar penerimaan</Link></div></div>;
  const [balance, allProducts] = await Promise.all([db.transaction((tx) => getPurchaseBalance(tx, po.id)), db.select({ id: products.id, nama: products.nama, sku: products.sku, satuan: products.satuan }).from(products)]);
  const items = balance.filter((b) => b.ordered > b.reserved).map((b) => {
    const p = allProducts.find((product) => product.id === b.productId)!;
    return { productId: b.productId, sku: p.sku, nama: p.nama, satuan: p.satuan, sisa: formatDesimal(b.ordered-b.reserved), hargaSatuan: b.hargaSatuan };
  });
  return <div><PageHeader judul="Buat Penerimaan Barang" deskripsi={`${po.nomor} · ${po.supplier}`} />{items.length ? <GRNForm poId={po.id} items={items} /> : <div className="rounded-lg border bg-background p-5 text-sm">Seluruh jumlah PO sudah diterima atau dicadangkan di draft. <Link className="text-primary underline" href={`/pembelian/po/${po.id}`}>Lihat PO</Link>.</div>}</div>;
}

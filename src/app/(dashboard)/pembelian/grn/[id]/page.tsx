import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goodsReceipts, goodsReceiptItems, purchaseOrders, suppliers, products } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { formatAngka, formatRupiah, formatTanggal } from "@/lib/format";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { ActionButtons } from "@/components/pembelian/action-buttons";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DetailGRN({ params }: { params: Promise<{ id: string }> }) {
  const akses = await pageAccess(["owner", "gudang", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) notFound();
  const [grn] = await db.select({ id: goodsReceipts.id, nomor: goodsReceipts.nomor, tanggal: goodsReceipts.tanggal, status: goodsReceipts.status, statusBayar: goodsReceipts.statusBayar, total: goodsReceipts.total, journalEntryId: goodsReceipts.journalEntryId, poId: purchaseOrders.id, po: purchaseOrders.nomor, supplier: suppliers.nama }).from(goodsReceipts).innerJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id)).innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(eq(goodsReceipts.id, id));
  if (!grn) notFound();
  const items = await db.select({ id: goodsReceiptItems.id, nama: products.nama, sku: products.sku, satuan: products.satuan, qty: goodsReceiptItems.qtyDiterima, harga: goodsReceiptItems.hargaSatuan, subtotal: goodsReceiptItems.subtotal }).from(goodsReceiptItems).innerJoin(products, eq(goodsReceiptItems.productId, products.id)).where(eq(goodsReceiptItems.grnId, id));
  return <div className="space-y-5"><PageHeader judul={grn.nomor} deskripsi={`${grn.supplier} · ${formatTanggal(grn.tanggal)}`} aksi={<Link href="/pembelian/grn" className={buttonVariants({ variant: "outline" })}>Kembali</Link>} />
    <div className="space-y-3 rounded-lg border bg-background p-4"><div className="flex flex-wrap items-center gap-3"><StatusBadge status={grn.status} />{grn.status === "posted" && <><span className="text-sm">Pembayaran:</span><StatusBadge status={grn.statusBayar} /></>}<span className="text-sm">PO: <Link className="text-primary underline" href={`/pembelian/po/${grn.poId}`}>{grn.po}</Link></span><span className="text-sm">Total: <strong>{formatRupiah(grn.total)}</strong></span></div>
      {grn.status === "draft" && akses.sesi.peran === "gudang" && <div className="flex flex-wrap items-start gap-2"><Link href={`/pembelian/grn/${id}/ubah`} className={buttonVariants({ variant: "outline" })}>Ubah draft</Link><ActionButtons id={id} actions={["post", "delete"]} /></div>}
      {grn.journalEntryId && akses.sesi.peran !== "gudang" && <Link className="inline-block text-sm text-primary underline" href={`/jurnal/${grn.journalEntryId}`}>Lihat jurnal penerimaan</Link>}
    </div>
    <div className="rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Jumlah diterima</TableHead><TableHead>Harga satuan</TableHead><TableHead>Subtotal</TableHead></TableRow></TableHeader><TableBody>{items.map((i) => <TableRow key={i.id}><TableCell>{i.sku} — {i.nama}</TableCell><TableCell>{formatAngka(i.qty)} {i.satuan}</TableCell><TableCell>{formatRupiah(i.harga)}</TableCell><TableCell>{formatRupiah(i.subtotal)}</TableCell></TableRow>)}</TableBody></Table></div>
  </div>;
}

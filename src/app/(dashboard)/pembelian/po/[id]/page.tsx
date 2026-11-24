import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchaseOrders, suppliers, products, goodsReceipts } from "@/db/schema";
import { getPurchaseBalance } from "@/services/purchasing";
import { pageAccess } from "@/lib/auth-guard";
import { formatAngka, formatRupiah, formatTanggal } from "@/lib/format";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { ActionButtons } from "@/components/pembelian/action-buttons";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DetailPO({ params }: { params: Promise<{ id: string }> }) {
  const akses = await pageAccess(["owner", "gudang", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) notFound();
  const [po] = await db.select({ id: purchaseOrders.id, nomor: purchaseOrders.nomor, tanggal: purchaseOrders.tanggal, status: purchaseOrders.status, total: purchaseOrders.total, supplier: suppliers.nama }).from(purchaseOrders).innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(eq(purchaseOrders.id, id));
  if (!po) notFound();
  const [balance, productList, receipts] = await Promise.all([
    db.transaction((tx) => getPurchaseBalance(tx, id)),
    db.select({ id: products.id, nama: products.nama, sku: products.sku, satuan: products.satuan }).from(products),
    db.select().from(goodsReceipts).where(eq(goodsReceipts.poId, id)).orderBy(goodsReceipts.id),
  ]);
  const hasRemaining = balance.some((b) => b.ordered > b.reserved);
  const actions: ("approve" | "cancel")[] = [];
  if (akses.sesi.peran === "owner" && po.status === "draft") actions.push("approve");
  if (akses.sesi.peran === "owner" && (po.status === "draft" || po.status === "approved") && !receipts.length) actions.push("cancel");
  return <div className="space-y-5">
    <PageHeader judul={po.nomor} deskripsi={`Supplier: ${po.supplier} · Tanggal: ${formatTanggal(po.tanggal)}`} aksi={<Link href="/pembelian/po" className={buttonVariants({ variant: "outline" })}>Kembali</Link>} />
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-background p-4"><StatusBadge status={po.status} /><span className="text-sm">Total PO: <strong>{formatRupiah(po.total)}</strong></span>{akses.sesi.peran === "gudang" && po.status === "approved" && hasRemaining && <Link href={`/pembelian/grn/buat?po=${id}`} className={buttonVariants()}>Buat penerimaan</Link>}{akses.sesi.peran === "owner" && po.status === "draft" && <Link href={`/pembelian/po/${id}/ubah`} className={buttonVariants({ variant: "outline" })}>Ubah draft</Link>}{actions.length > 0 && <ActionButtons id={id} actions={actions} />}</div>
    <div className="rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Dipesan</TableHead><TableHead>Sudah diposting</TableHead><TableHead>Dicadangkan draft</TableHead><TableHead>Sisa tersedia</TableHead><TableHead>Harga satuan</TableHead><TableHead>Subtotal</TableHead></TableRow></TableHeader><TableBody>{balance.map((b) => {
      const p = productList.find((product) => product.id === b.productId);
      return <TableRow key={b.id}><TableCell>{p?.sku} — {p?.nama}</TableCell><TableCell>{formatAngka(Number(b.ordered)/100)} {p?.satuan}</TableCell><TableCell>{formatAngka(Number(b.posted)/100)}</TableCell><TableCell>{formatAngka(Number(b.reserved-b.posted)/100)}</TableCell><TableCell>{formatAngka(Number(b.ordered-b.reserved)/100)}</TableCell><TableCell>{formatRupiah(b.hargaSatuan)}</TableCell><TableCell>{formatRupiah(b.subtotal)}</TableCell></TableRow>;
    })}</TableBody></Table></div>
    <section><h2 className="mb-3 font-semibold">Penerimaan barang</h2><div className="rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>Nomor GRN</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>{receipts.length ? receipts.map((r) => <TableRow key={r.id}><TableCell>{r.nomor}</TableCell><TableCell>{formatTanggal(r.tanggal)}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell><TableCell>{formatRupiah(r.total)}</TableCell><TableCell><Link className="text-primary underline" href={`/pembelian/grn/${r.id}`}>Detail</Link></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-5 text-center text-muted-foreground">Belum ada penerimaan barang.</TableCell></TableRow>}</TableBody></Table></div></section>
  </div>;
}

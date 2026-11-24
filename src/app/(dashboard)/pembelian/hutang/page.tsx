import Link from "next/link";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { goodsReceipts, purchaseOrders, suppliers } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PER_HALAMAN = 10;
export default async function HutangPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const sp = await searchParams;
  const halaman = Math.max(1, Math.min(100000, Math.floor(Number(sp.halaman) || 1)));
  const where = and(eq(goodsReceipts.status, "posted"), eq(goodsReceipts.statusBayar, "belum"));
  const [rows, totals] = await Promise.all([
    db.select({ id: goodsReceipts.id, nomor: goodsReceipts.nomor, tanggal: goodsReceipts.tanggal, total: goodsReceipts.total, po: purchaseOrders.nomor, supplier: suppliers.nama }).from(goodsReceipts).innerJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id)).innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(where).orderBy(desc(goodsReceipts.id)).limit(PER_HALAMAN).offset((halaman-1)*PER_HALAMAN),
    db.select({ count: count(), total: sql<string>`coalesce(sum(${goodsReceipts.total}), 0)` }).from(goodsReceipts).where(where),
  ]);
  return <div><PageHeader judul="Hutang Supplier" deskripsi="Penerimaan yang sudah diposting dan belum dilunasi." aksi={<Link className={buttonVariants({ variant: "outline" })} href="/keuangan/pembayaran">Ke pembayaran</Link>} />
    <div className="mb-4 rounded-lg border bg-background p-4"><p className="text-sm text-muted-foreground">Total hutang belum lunas</p><p className="text-xl font-semibold">{formatRupiah(totals[0]?.total ?? "0")}</p></div>
    <div className="rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>GRN</TableHead><TableHead>Tanggal</TableHead><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Hutang</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => <TableRow key={r.id}><TableCell>{r.nomor}</TableCell><TableCell>{formatTanggal(r.tanggal)}</TableCell><TableCell>{r.po}</TableCell><TableCell>{r.supplier}</TableCell><TableCell>{formatRupiah(r.total)}</TableCell><TableCell><Link className="text-primary underline" href={`/pembelian/grn/${r.id}`}>Detail</Link></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Tidak ada hutang supplier yang belum lunas.</TableCell></TableRow>}</TableBody></Table></div>
    <Pagination basePath="/pembelian/hutang" halaman={halaman} perHalaman={PER_HALAMAN} total={totals[0]?.count ?? 0} filters={{}} />
  </div>;
}

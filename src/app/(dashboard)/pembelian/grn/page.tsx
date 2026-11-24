import Link from "next/link";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { goodsReceipts, purchaseOrders, suppliers } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PER_HALAMAN = 10;
export default async function GRNPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const akses = await pageAccess(["owner", "gudang", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const halaman = Math.max(1, Math.min(100000, Math.floor(Number(sp.halaman) || 1)));
  const filters: SQL[] = [];
  if (status === "draft" || status === "posted") filters.push(eq(goodsReceipts.status, status));
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals] = await Promise.all([
    db.select({ id: goodsReceipts.id, nomor: goodsReceipts.nomor, tanggal: goodsReceipts.tanggal, status: goodsReceipts.status, total: goodsReceipts.total, po: purchaseOrders.nomor, supplier: suppliers.nama }).from(goodsReceipts).innerJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id)).innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(where).orderBy(desc(goodsReceipts.id)).limit(PER_HALAMAN).offset((halaman - 1) * PER_HALAMAN),
    db.select({ total: count() }).from(goodsReceipts).where(where),
  ]);
  return <div><PageHeader judul="Penerimaan Barang" deskripsi="Catat penerimaan barang dari PO yang sudah disetujui." aksi={akses.sesi.peran === "gudang" ? <Link href="/pembelian/grn/buat" className={buttonVariants()}>Buat penerimaan</Link> : null} />
    <form method="get" className="mb-4 flex gap-2"><select aria-label="Filter status" name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Semua status</option><option value="draft">Draft</option><option value="posted">Tercatat</option></select><Button variant="outline">Filter</Button></form>
    <div className="rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>Nomor GRN</TableHead><TableHead>Tanggal</TableHead><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => <TableRow key={r.id}><TableCell className="font-medium">{r.nomor}</TableCell><TableCell>{formatTanggal(r.tanggal)}</TableCell><TableCell>{r.po}</TableCell><TableCell>{r.supplier}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell><TableCell>{formatRupiah(r.total)}</TableCell><TableCell><Link href={`/pembelian/grn/${r.id}`} className="text-primary underline">Detail</Link></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Belum ada penerimaan yang sesuai.</TableCell></TableRow>}</TableBody></Table></div>
    <Pagination basePath="/pembelian/grn" halaman={halaman} perHalaman={PER_HALAMAN} total={totals[0]?.total ?? 0} filters={{ status }} />
  </div>;
}

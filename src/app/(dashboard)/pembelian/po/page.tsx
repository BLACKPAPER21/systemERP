import Link from "next/link";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { purchaseOrders, suppliers } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PER_HALAMAN = 10;
export default async function POPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const akses = await pageAccess(["owner", "gudang", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const supplier = typeof sp.supplier === "string" ? sp.supplier : "";
  const halaman = Math.max(1, Math.min(100000, Math.floor(Number(sp.halaman) || 1)));
  const filters: SQL[] = [];
  if (status === "draft" || status === "approved" || status === "received" || status === "cancelled") filters.push(eq(purchaseOrders.status, status));
  if (/^[1-9]\d*$/.test(supplier) && Number(supplier) <= 2147483647) filters.push(eq(purchaseOrders.supplierId, Number(supplier)));
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals, supplierList] = await Promise.all([
    db.select({ id: purchaseOrders.id, nomor: purchaseOrders.nomor, tanggal: purchaseOrders.tanggal, status: purchaseOrders.status, total: purchaseOrders.total, supplier: suppliers.nama }).from(purchaseOrders).innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(where).orderBy(desc(purchaseOrders.id)).limit(PER_HALAMAN).offset((halaman - 1) * PER_HALAMAN),
    db.select({ total: count() }).from(purchaseOrders).where(where),
    db.select({ id: suppliers.id, nama: suppliers.nama }).from(suppliers).orderBy(suppliers.nama),
  ]);
  return <div>
    <PageHeader judul="Pesanan Pembelian" deskripsi="Kelola PO dan pantau penerimaan dari supplier." aksi={akses.sesi.peran === "owner" ? <Link href="/pembelian/po/buat" className={buttonVariants()}>Buat PO</Link> : null} />
    <form method="get" className="mb-4 flex flex-wrap gap-2">
      <select aria-label="Filter status" name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Semua status</option><option value="draft">Draft</option><option value="approved">Disetujui</option><option value="received">Diterima seluruhnya</option><option value="cancelled">Dibatalkan</option></select>
      <select aria-label="Filter supplier" name="supplier" defaultValue={supplier} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Semua supplier</option>{supplierList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}</select><Button variant="outline">Filter</Button>
    </form>
    <div className="rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>Nomor PO</TableHead><TableHead>Tanggal</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>
      {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada PO yang sesuai.</TableCell></TableRow> : rows.map((r) => <TableRow key={r.id}><TableCell className="font-medium">{r.nomor}</TableCell><TableCell>{formatTanggal(r.tanggal)}</TableCell><TableCell>{r.supplier}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell><TableCell>{formatRupiah(r.total)}</TableCell><TableCell><Link className="text-primary underline" href={`/pembelian/po/${r.id}`}>Detail</Link></TableCell></TableRow>)}
    </TableBody></Table></div>
    <Pagination basePath="/pembelian/po" halaman={halaman} perHalaman={PER_HALAMAN} total={totals[0]?.total ?? 0} filters={{ status, supplier }} />
  </div>;
}

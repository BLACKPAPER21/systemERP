/* MILIK M5 — Halaman Pembayaran: Hutang Supplier (keluar) & Piutang Pelanggan (masuk) */
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import {
  goodsReceipts,
  purchaseOrders,
  suppliers,
  invoices,
  salesOrders,
  customers,
  payments,
} from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { PembayaranKeluarDialog } from "@/components/keuangan/pembayaran-keluar-dialog";
import { PembayaranMasukDialog } from "@/components/keuangan/pembayaran-masuk-dialog";

export default async function PembayaranPage() {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  // Hutang: GRN posted & belum lunas
  const hutangRows = await db
    .select({
      id: goodsReceipts.id,
      nomor: goodsReceipts.nomor,
      tanggal: goodsReceipts.tanggal,
      total: goodsReceipts.total,
      statusBayar: goodsReceipts.statusBayar,
      namaSupplier: suppliers.nama,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(eq(goodsReceipts.status, "posted"), eq(goodsReceipts.statusBayar, "belum")))
    .orderBy(goodsReceipts.id);

  // Piutang: Invoice posted & belum lunas
  const piutangRows = await db
    .select({
      id: invoices.id,
      nomor: invoices.nomor,
      tanggal: invoices.tanggal,
      jatuhTempo: invoices.jatuhTempo,
      total: invoices.total,
      statusBayar: invoices.statusBayar,
      namaPelanggan: customers.nama,
    })
    .from(invoices)
    .leftJoin(salesOrders, eq(invoices.soId, salesOrders.id))
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(and(eq(invoices.status, "posted"), eq(invoices.statusBayar, "belum")))
    .orderBy(invoices.id);

  // Riwayat pembayaran (10 terakhir)
  const riwayat = await db
    .select({
      id: payments.id,
      nomor: payments.nomor,
      tipe: payments.tipe,
      tanggal: payments.tanggal,
      jumlah: payments.jumlah,
      metode: payments.metode,
    })
    .from(payments)
    .orderBy(payments.id)
    .limit(10);

  const totalHutang = hutangRows.reduce((s, r) => s + Number(r.total), 0);
  const totalPiutang = piutangRows.reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        judul="Pembayaran"
        deskripsi="Kelola pelunasan hutang ke supplier dan penerimaan dari pelanggan."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Hutang Belum Lunas</p>
          <p className="text-2xl font-bold text-red-600">{formatRupiah(totalHutang)}</p>
          <p className="text-xs text-muted-foreground">{hutangRows.length} GRN menunggu pembayaran</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Piutang Belum Lunas</p>
          <p className="text-2xl font-bold text-blue-600">{formatRupiah(totalPiutang)}</p>
          <p className="text-xs text-muted-foreground">{piutangRows.length} Invoice menunggu pelunasan</p>
        </div>
      </div>

      {/* Hutang Supplier */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Hutang ke Supplier (GRN Belum Lunas)</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. GRN</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hutangRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada hutang yang belum dilunasi. 🎉
                  </TableCell>
                </TableRow>
              )}
              {hutangRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.nomor}</TableCell>
                  <TableCell>{r.namaSupplier ?? "—"}</TableCell>
                  <TableCell>{formatTanggal(r.tanggal)}</TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {formatRupiah(r.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.statusBayar} />
                  </TableCell>
                  <TableCell>
                    <PembayaranKeluarDialog
                      grn={{
                        id: r.id,
                        nomor: r.nomor,
                        total: r.total,
                        namaSupplier: r.namaSupplier ?? "Supplier",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Piutang Pelanggan */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Piutang dari Pelanggan (Invoice Belum Lunas)</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {piutangRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Tidak ada piutang yang belum dilunasi. 🎉
                  </TableCell>
                </TableRow>
              )}
              {piutangRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.nomor}</TableCell>
                  <TableCell>{r.namaPelanggan ?? "—"}</TableCell>
                  <TableCell>{formatTanggal(r.tanggal)}</TableCell>
                  <TableCell>{formatTanggal(r.jatuhTempo)}</TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {formatRupiah(r.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.statusBayar} />
                  </TableCell>
                  <TableCell>
                    <PembayaranMasukDialog
                      invoice={{
                        id: r.id,
                        nomor: r.nomor,
                        total: r.total,
                        namaPelanggan: r.namaPelanggan ?? "Pelanggan",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Riwayat Pembayaran */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Riwayat Pembayaran (10 Terakhir)</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. PAY</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riwayat.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Belum ada riwayat pembayaran.
                  </TableCell>
                </TableRow>
              )}
              {riwayat.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.nomor}</TableCell>
                  <TableCell>{formatTanggal(r.tanggal)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.tipe} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.metode} />
                  </TableCell>
                  <TableCell className={`text-right font-medium ${r.tipe === "in" ? "text-blue-600" : "text-red-600"}`}>
                    {r.tipe === "out" ? "-" : "+"}{formatRupiah(r.jumlah)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}


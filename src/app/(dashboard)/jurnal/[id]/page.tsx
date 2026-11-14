import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { db } from "@/db";
import {
  accounts,
  customers,
  goodsReceipts,
  invoices,
  journalEntries,
  journalLines,
  payments,
  purchaseOrders,
  salesOrders,
  stockOpnames,
  suppliers,
} from "@/db/schema";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageAccess } from "@/lib/auth-guard";
import { formatRupiah, formatTanggal } from "@/lib/format";

type SumberJurnal = {
  judul: string;
  bidang: Array<[string, string]>;
};

export default async function JurnalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const [jurnal] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);
  if (!jurnal) notFound();

  const barisJurnal = await db
    .select({
      kodeAkun: accounts.kode,
      namaAkun: accounts.nama,
      debit: journalLines.debit,
      kredit: journalLines.kredit,
      keterangan: journalLines.keterangan,
    })
    .from(journalLines)
    .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(eq(journalLines.journalEntryId, jurnal.id))
    .orderBy(asc(accounts.kode));

  let sumber: SumberJurnal | null = null;
  if (jurnal.refId !== null && jurnal.refType === "invoice") {
    const [invoice] = await db
      .select({
        nomor: invoices.nomor,
        tanggal: invoices.tanggal,
        jatuhTempo: invoices.jatuhTempo,
        total: invoices.total,
        status: invoices.status,
        statusBayar: invoices.statusBayar,
        pelanggan: customers.nama,
      })
      .from(invoices)
      .innerJoin(salesOrders, eq(invoices.soId, salesOrders.id))
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(eq(invoices.id, jurnal.refId))
      .limit(1);
    if (invoice) {
      sumber = {
        judul: "Invoice penjualan",
        bidang: [
          ["Nomor", invoice.nomor],
          ["Pelanggan", invoice.pelanggan],
          ["Tanggal", formatTanggal(invoice.tanggal)],
          ["Jatuh tempo", formatTanggal(invoice.jatuhTempo)],
          ["Total", formatRupiah(Number(invoice.total))],
          ["Status", `${invoice.status} · ${invoice.statusBayar}`],
        ],
      };
    }
  } else if (jurnal.refId !== null && jurnal.refType === "invoice_hpp") {
    const [invoice] = await db
      .select({
        nomor: invoices.nomor,
        tanggal: invoices.tanggal,
        total: invoices.total,
        totalHpp: invoices.totalHpp,
        pelanggan: customers.nama,
      })
      .from(invoices)
      .innerJoin(salesOrders, eq(invoices.soId, salesOrders.id))
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(eq(invoices.id, jurnal.refId))
      .limit(1);
    if (invoice) {
      sumber = {
        judul: "HPP invoice penjualan",
        bidang: [
          ["Nomor invoice", invoice.nomor],
          ["Pelanggan", invoice.pelanggan],
          ["Tanggal", formatTanggal(invoice.tanggal)],
          ["Nilai penjualan", formatRupiah(Number(invoice.total))],
          ["Total HPP", formatRupiah(Number(invoice.totalHpp))],
        ],
      };
    }
  } else if (jurnal.refId !== null && jurnal.refType === "goods_receipt") {
    const [penerimaan] = await db
      .select({
        nomor: goodsReceipts.nomor,
        tanggal: goodsReceipts.tanggal,
        total: goodsReceipts.total,
        status: goodsReceipts.status,
        statusBayar: goodsReceipts.statusBayar,
        supplier: suppliers.nama,
      })
      .from(goodsReceipts)
      .innerJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id))
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(goodsReceipts.id, jurnal.refId))
      .limit(1);
    if (penerimaan) {
      sumber = {
        judul: "Penerimaan barang",
        bidang: [
          ["Nomor", penerimaan.nomor],
          ["Supplier", penerimaan.supplier],
          ["Tanggal", formatTanggal(penerimaan.tanggal)],
          ["Total", formatRupiah(Number(penerimaan.total))],
          ["Status", `${penerimaan.status} · ${penerimaan.statusBayar}`],
        ],
      };
    }
  } else if (jurnal.refId !== null && jurnal.refType === "payment") {
    const [pembayaran] = await db
      .select({
        nomor: payments.nomor,
        tipe: payments.tipe,
        refType: payments.refType,
        refId: payments.refId,
        tanggal: payments.tanggal,
        jumlah: payments.jumlah,
        metode: payments.metode,
      })
      .from(payments)
      .where(eq(payments.id, jurnal.refId))
      .limit(1);
    if (pembayaran) {
      sumber = {
        judul: "Transaksi pembayaran",
        bidang: [
          ["Nomor", pembayaran.nomor],
          ["Tipe", pembayaran.tipe === "in" ? "Penerimaan pelanggan" : "Pembayaran supplier"],
          ["Referensi", `${pembayaran.refType} #${pembayaran.refId}`],
          ["Tanggal", formatTanggal(pembayaran.tanggal)],
          ["Jumlah", formatRupiah(Number(pembayaran.jumlah))],
          ["Metode", pembayaran.metode],
        ],
      };
    }
  } else if (jurnal.refId !== null && jurnal.refType === "stock_opname") {
    const [opname] = await db
      .select({
        nomor: stockOpnames.nomor,
        tanggal: stockOpnames.tanggal,
        status: stockOpnames.status,
      })
      .from(stockOpnames)
      .where(eq(stockOpnames.id, jurnal.refId))
      .limit(1);
    if (opname) {
      sumber = {
        judul: "Stock opname",
        bidang: [
          ["Nomor", opname.nomor],
          ["Tanggal", formatTanggal(opname.tanggal)],
          ["Status", opname.status],
        ],
      };
    }
  } else if (jurnal.refId !== null && jurnal.refType === "expense") {
    sumber = {
      judul: "Referensi beban operasional",
      bidang: [["ID referensi", String(jurnal.refId)]],
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        judul={`Detail Jurnal ${jurnal.nomor}`}
        deskripsi="Rincian jurnal dan dokumen sumber untuk penelusuran transaksi."
        aksi={
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke dashboard
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Jurnal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Tanggal:</span> {formatTanggal(jurnal.tanggal)}</p>
          <p><span className="text-muted-foreground">Referensi:</span> {jurnal.refType}{jurnal.refId === null ? "" : ` #${jurnal.refId}`}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">Keterangan:</span> {jurnal.keterangan}</p>
          <p><span className="text-muted-foreground">Total debit:</span> {formatRupiah(Number(jurnal.totalDebit))}</p>
          <p><span className="text-muted-foreground">Total kredit:</span> {formatRupiah(Number(jurnal.totalKredit))}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Baris Jurnal</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Akun</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barisJurnal.map((baris, index) => (
                <TableRow key={`${baris.kodeAkun}-${index}`}>
                  <TableCell>{baris.kodeAkun} · {baris.namaAkun}</TableCell>
                  <TableCell>{baris.keterangan ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(Number(baris.debit))}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(Number(baris.kredit))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dokumen Sumber</CardTitle>
        </CardHeader>
        <CardContent>
          {sumber ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <dt className="font-semibold sm:col-span-2">{sumber.judul}</dt>
              {sumber.bidang.map(([label, nilai]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-medium">{nilai}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {jurnal.refId === null
                ? "Jurnal ini tidak memiliki dokumen sumber terpisah."
                : "Dokumen sumber tidak ditemukan untuk referensi jurnal ini."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

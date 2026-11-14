import Link from "next/link";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lte,
  sql,
  sum,
} from "drizzle-orm";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  FileClock,
  PackageSearch,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { db } from "@/db";
import {
  accounts,
  customers,
  goodsReceipts,
  invoices,
  journalEntries,
  journalLines,
  payments,
  products,
  purchaseOrders,
  salesOrders,
  suppliers,
} from "@/db/schema";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageAccess } from "@/lib/auth-guard";
import { formatAngka, formatRupiah, formatTanggal } from "@/lib/format";

type TransaksiDashboard = {
  nomor: string;
  jenis: string;
  pihak: string;
  tanggal: string;
  nilai: number;
  status: string;
  href: string;
  arah: "masuk" | "keluar";
};

const TRANSAKSI_PER_HALAMAN = 5;

function tanggalIso(tanggal: Date) {
  const tahun = tanggal.getFullYear();
  const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
  const hari = String(tanggal.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

function angka(nilai: string | null) {
  return Number(nilai ?? 0);
}

function KartuKpi({
  judul,
  nilai,
  keterangan,
  ikon: Ikon,
  warnaIkon,
}: {
  judul: string;
  nilai: string;
  keterangan: string;
  ikon: typeof Boxes;
  warnaIkon: string;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardDescription>{judul}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{nilai}</CardTitle>
        </div>
        <span className={`rounded-lg p-2 ${warnaIkon}`}>
          <Ikon className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{keterangan}</p>
      </CardContent>
    </Card>
  );
}

function GrafikPenjualan({
  penjualanHarian,
  totalPenjualan30Hari,
}: {
  penjualanHarian: number[];
  totalPenjualan30Hari: number;
}) {
  const maxPenjualan = Math.max(0, ...penjualanHarian);
  return (
    <Card className="h-full">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Grafik Penjualan</CardTitle>
          <CardDescription className="mt-1">
            Penjualan harian selama 30 hari terakhir
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums">
            {formatRupiah(totalPenjualan30Hari)}
          </p>
          <p className="text-xs text-muted-foreground">total 30 hari</p>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-56 border-b border-l bg-[linear-gradient(to_bottom,transparent_24%,var(--border)_25%,transparent_26%,transparent_49%,var(--border)_50%,transparent_51%,transparent_74%,var(--border)_75%,transparent_76%)]"
          role="img"
          aria-label={`Grafik penjualan harian. Total penjualan 30 hari terakhir ${formatRupiah(totalPenjualan30Hari)}.`}
        >
          <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
            {penjualanHarian.map((nilai, index) => (
              <div
                key={`${index}-${nilai}`}
                className="flex h-full flex-1 items-end"
                title={`${formatRupiah(nilai)} · ${index === 29 ? "Hari ini" : `${29 - index} hari lalu`}`}
              >
                <div
                  className={`w-full rounded-t-sm ${
                    nilai > 0 ? "bg-primary/80 hover:bg-primary" : "bg-transparent"
                  }`}
                  style={{
                    height:
                      nilai > 0 && maxPenjualan > 0
                        ? `${(nilai / maxPenjualan) * 92}%`
                        : "0%",
                  }}
                  />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>30 hari lalu</span>
          <span>15 hari lalu</span>
          <span>Hari ini</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const params = await searchParams;
  const halamanDiminta = Math.max(1, Number(params.halaman ?? 1) || 1);
  const sekarang = new Date();
  const hariIni = tanggalIso(sekarang);
  const awalBulan = tanggalIso(
    new Date(sekarang.getFullYear(), sekarang.getMonth(), 1),
  );
  const awalGrafik = new Date(sekarang);
  awalGrafik.setDate(awalGrafik.getDate() - 29);
  const tanggalAwalGrafik = tanggalIso(awalGrafik);

  const [
    ringkasanPersediaan,
    stokKritis,
    penjualanBulan,
    bebanOperasionalBulan,
    penjualanGrafik,
    piutang,
    hutang,
    invoiceTerbaru,
    pembayaranTerbaru,
    jurnalTerbaru,
    penerimaanTerbaru,
    pesananPenjualanTerbaru,
    pesananPembelianTerbaru,
  ] = await Promise.all([
    db
      .select({
        jumlah: count(),
        totalNilai: sum(
          sql`${products.stokSaatIni} * ${products.hargaPokokRataRata}`,
        ),
      })
      .from(products),
    db
      .select({
        sku: products.sku,
        nama: products.nama,
        satuan: products.satuan,
        stok: products.stokSaatIni,
        minimum: products.stokMinimum,
      })
      .from(products)
      .where(
        and(
          eq(products.aktif, true),
          sql`${products.stokSaatIni} <= ${products.stokMinimum}`,
        ),
      )
      .orderBy(asc(products.stokSaatIni))
      .limit(5),
    db
      .select({
        totalPenjualan: sum(invoices.total),
        totalHpp: sum(invoices.totalHpp),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "posted"),
          gte(invoices.tanggal, awalBulan),
          lte(invoices.tanggal, hariIni),
        ),
      ),
    db
      .select({
        total: sum(sql`${journalLines.debit} - ${journalLines.kredit}`),
      })
      .from(journalLines)
      .innerJoin(
        journalEntries,
        eq(journalLines.journalEntryId, journalEntries.id),
      )
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(
        and(
          eq(accounts.kode, "5-200"),
          gte(journalEntries.tanggal, awalBulan),
          lte(journalEntries.tanggal, hariIni),
        ),
      ),
    db
      .select({ tanggal: invoices.tanggal, total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "posted"),
          gte(invoices.tanggal, tanggalAwalGrafik),
          lte(invoices.tanggal, hariIni),
        ),
      )
      .groupBy(invoices.tanggal),
    db
      .select({ jumlah: count(), total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "posted"),
          eq(invoices.statusBayar, "belum"),
        ),
      ),
    db
      .select({ jumlah: count(), total: sum(goodsReceipts.total) })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.status, "posted"),
          eq(goodsReceipts.statusBayar, "belum"),
        ),
      ),
    db
      .select({
        nomor: invoices.nomor,
        tanggal: invoices.tanggal,
        total: invoices.total,
        status: invoices.status,
        pihak: customers.nama,
      })
      .from(invoices)
      .innerJoin(salesOrders, eq(invoices.soId, salesOrders.id))
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .orderBy(desc(invoices.tanggal), desc(invoices.id))
      .limit(10),
    db
      .select({
        nomor: payments.nomor,
        tanggal: payments.tanggal,
        jumlah: payments.jumlah,
        tipe: payments.tipe,
        refType: payments.refType,
        refId: payments.refId,
      })
      .from(payments)
      .orderBy(desc(payments.tanggal), desc(payments.id))
      .limit(10),
    db
      .select({
        id: journalEntries.id,
        nomor: journalEntries.nomor,
        tanggal: journalEntries.tanggal,
        total: journalEntries.totalDebit,
        keterangan: journalEntries.keterangan,
        refType: journalEntries.refType,
        refId: journalEntries.refId,
      })
      .from(journalEntries)
      .orderBy(desc(journalEntries.tanggal), desc(journalEntries.id))
      .limit(10),
    db
      .select({
        nomor: goodsReceipts.nomor,
        tanggal: goodsReceipts.tanggal,
        total: goodsReceipts.total,
        status: goodsReceipts.status,
        pihak: suppliers.nama,
      })
      .from(goodsReceipts)
      .innerJoin(purchaseOrders, eq(goodsReceipts.poId, purchaseOrders.id))
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(goodsReceipts.tanggal), desc(goodsReceipts.id))
      .limit(10),
    db
      .select({
        nomor: salesOrders.nomor,
        tanggal: salesOrders.tanggal,
        total: salesOrders.total,
        status: salesOrders.status,
        pihak: customers.nama,
      })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .orderBy(desc(salesOrders.tanggal), desc(salesOrders.id))
      .limit(10),
    db
      .select({
        nomor: purchaseOrders.nomor,
        tanggal: purchaseOrders.tanggal,
        total: purchaseOrders.total,
        status: purchaseOrders.status,
        pihak: suppliers.nama,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(purchaseOrders.tanggal), desc(purchaseOrders.id))
      .limit(10),
  ]);

  const penjualanHarian = Array.from({ length: 30 }, (_, index) => {
    const tanggal = new Date(awalGrafik);
    tanggal.setDate(tanggal.getDate() + index);
    const tanggalKunci = tanggalIso(tanggal);
    const baris = penjualanGrafik.find((item) => item.tanggal === tanggalKunci);
    return angka(baris?.total ?? null);
  });
  const totalPenjualan30Hari = penjualanHarian.reduce(
    (total, nilai) => total + nilai,
    0,
  );
  const totalNilaiPersediaan = angka(
    ringkasanPersediaan[0]?.totalNilai ?? null,
  );
  const totalPiutang = angka(piutang[0]?.total ?? null);
  const totalHutang = angka(hutang[0]?.total ?? null);
  const totalPenjualanBulan = angka(penjualanBulan[0]?.totalPenjualan ?? null);
  const totalHppBulan = angka(penjualanBulan[0]?.totalHpp ?? null);
  const totalBebanOperasional = angka(bebanOperasionalBulan[0]?.total ?? null);

  const transaksiTerbaru: TransaksiDashboard[] = [
    ...invoiceTerbaru.map((item) => ({
      nomor: item.nomor,
      jenis: "Invoice penjualan",
      pihak: item.pihak,
      tanggal: item.tanggal,
      nilai: angka(item.total),
      status: item.status,
      href: "/penjualan/invoice",
      arah: "masuk" as const,
    })),
    ...pembayaranTerbaru.map((item) => ({
      nomor: item.nomor,
      jenis: item.tipe === "in" ? "Pembayaran pelanggan" : "Pembayaran supplier",
      pihak: `${item.refType === "invoice" ? "Invoice" : "Penerimaan"} #${item.refId}`,
      tanggal: item.tanggal,
      nilai: angka(item.jumlah),
      status: "posted",
      href: "/keuangan/pembayaran",
      arah: item.tipe === "in" ? ("masuk" as const) : ("keluar" as const),
    })),
    ...jurnalTerbaru.map((item) => ({
      nomor: item.nomor,
      jenis: "Jurnal",
      pihak: item.refId
        ? `${item.keterangan} · Sumber #${item.refId}`
        : item.keterangan,
      tanggal: item.tanggal,
      nilai: angka(item.total),
      status: "posted",
      href: `/jurnal/${item.id}`,
      arah:
        item.refType === "invoice_hpp"
          ? ("keluar" as const)
          : ("masuk" as const),
    })),
    ...penerimaanTerbaru.map((item) => ({
      nomor: item.nomor,
      jenis: "Penerimaan barang",
      pihak: item.pihak,
      tanggal: item.tanggal,
      nilai: angka(item.total),
      status: item.status,
      href: "/pembelian/grn",
      arah: "masuk" as const,
    })),
    ...pesananPenjualanTerbaru.map((item) => ({
      nomor: item.nomor,
      jenis: "Pesanan penjualan",
      pihak: item.pihak,
      tanggal: item.tanggal,
      nilai: angka(item.total),
      status: item.status,
      href: "/penjualan/so",
      arah: "masuk" as const,
    })),
    ...pesananPembelianTerbaru.map((item) => ({
      nomor: item.nomor,
      jenis: "Pesanan pembelian",
      pihak: item.pihak,
      tanggal: item.tanggal,
      nilai: angka(item.total),
      status: item.status,
      href: "/pembelian/po",
      arah: "keluar" as const,
    })),
  ]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 10);
  const totalHalamanTransaksi = Math.max(
    1,
    Math.ceil(transaksiTerbaru.length / TRANSAKSI_PER_HALAMAN),
  );
  const halamanTransaksi = Math.min(halamanDiminta, totalHalamanTransaksi);
  const transaksiPerHalaman = transaksiTerbaru.slice(
    (halamanTransaksi - 1) * TRANSAKSI_PER_HALAMAN,
    halamanTransaksi * TRANSAKSI_PER_HALAMAN,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        judul={`Selamat datang, ${akses.sesi.nama}`}
        deskripsi="Ringkasan kondisi usaha dan aktivitas operasional."
        aksi={
          <span className="hidden rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
            Data langsung dari database
          </span>
        }
      />

      <section
        aria-label="Indikator kinerja utama"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KartuKpi
          judul="Nilai Persediaan"
          nilai={formatRupiah(totalNilaiPersediaan)}
          keterangan={`Stok saat ini × harga pokok rata-rata · ${formatAngka(ringkasanPersediaan[0]?.jumlah ?? 0)} produk`}
          ikon={Boxes}
          warnaIkon="bg-blue-100 text-blue-700"
        />
        <KartuKpi
          judul="Total Piutang"
          nilai={formatRupiah(totalPiutang)}
          keterangan={`${formatAngka(piutang[0]?.jumlah ?? 0)} invoice belum lunas`}
          ikon={ReceiptText}
          warnaIkon="bg-amber-100 text-amber-700"
        />
        <KartuKpi
          judul="Total Hutang"
          nilai={formatRupiah(totalHutang)}
          keterangan={`${formatAngka(hutang[0]?.jumlah ?? 0)} penerimaan belum dibayar`}
          ikon={Wallet}
          warnaIkon="bg-violet-100 text-violet-700"
        />
        <KartuKpi
          judul="Laba Bersih Bulan Ini"
          nilai={formatRupiah(
            totalPenjualanBulan - totalHppBulan - totalBebanOperasional,
          )}
          keterangan={`Penjualan ${formatRupiah(totalPenjualanBulan)} − HPP ${formatRupiah(totalHppBulan)} − beban ${formatRupiah(totalBebanOperasional)}`}
          ikon={CircleDollarSign}
          warnaIkon="bg-emerald-100 text-emerald-700"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <GrafikPenjualan
          penjualanHarian={penjualanHarian}
          totalPenjualan30Hari={totalPenjualan30Hari}
        />

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Produk Stok Kritis</CardTitle>
              <CardDescription className="mt-1">
                Produk dengan stok di bawah atau sama dengan batas minimum
              </CardDescription>
            </div>
            <PackageSearch
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {stokKritis.map((produk) => (
              <div
                key={produk.sku}
                className="rounded-lg border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {produk.sku}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {produk.nama}
                    </p>
                  </div>
                  <StatusBadge status="belum" />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Stok{" "}
                    <span className="font-semibold text-foreground">
                      {formatAngka(angka(produk.stok))} {produk.satuan}
                    </span>
                    <span className="mx-1">·</span>
                    Minimum {formatAngka(angka(produk.minimum))}
                  </p>
                  <Link
                    href={`/persediaan/kartu-stok?produk=${encodeURIComponent(produk.sku)}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Kartu stok <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {stokKritis.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Tidak ada produk aktif dengan stok di bawah batas minimum.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Nilai persediaan dihitung dari stok saat ini × harga pokok rata-rata.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Transaksi Terakhir</CardTitle>
            <CardDescription className="mt-1">
              Dokumen terbaru dari berbagai modul · 5 per halaman
            </CardDescription>
          </div>
          <FileClock
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-190">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Dokumen</TableHead>
                <TableHead>Jenis / Sumber</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Arah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaksiPerHalaman.map((transaksi) => {
                const ArahIkon =
                  transaksi.arah === "masuk" ? ArrowDownRight : ArrowUpRight;
                return (
                  <TableRow key={transaksi.nomor}>
                    <TableCell>
                      <Link
                        href={transaksi.href}
                        className="font-medium text-primary hover:underline"
                      >
                        {transaksi.nomor}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p>{transaksi.jenis}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {transaksi.pihak}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTanggal(transaksi.tanggal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(transaksi.nilai)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={transaksi.status} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`flex items-center justify-end gap-1 text-xs ${
                          transaksi.arah === "masuk"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        <ArahIkon className="h-4 w-4" aria-hidden="true" />
                        {transaksi.arah === "masuk" ? "Masuk" : "Keluar"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {transaksiTerbaru.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Belum ada transaksi di database.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <div className="px-6 pb-4">
            <Pagination
              basePath="/"
              halaman={halamanTransaksi}
              perHalaman={TRANSAKSI_PER_HALAMAN}
              total={transaksiTerbaru.length}
              filters={{}}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

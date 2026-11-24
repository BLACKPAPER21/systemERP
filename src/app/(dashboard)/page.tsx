/* MILIK M6 — Dashboard manajerial.
 *
 * Fitur:
 * - Filter periode (7 hari / 30 hari / bulan ini / tahun ini) via ?periode=
 * - Ekspor ringkasan dashboard (CSV siap Excel & Cetak/PDF)
 * - Baris pintasan cepat (Quick Actions) sesuai peran pengguna
 * - KPI dengan perbandingan terhadap periode sebelumnya
 * - Grafik Penjualan vs Pembelian (Recharts)
 * - Daftar dokumen yang perlu ditindaklanjuti
 * - Transaksi terakhir dengan pencarian (?q=) & filter jenis (?jenis=), 5 per halaman
 * Stok kritis dipindah ke ikon notifikasi di header (lihat NotifikasiStok).
 */
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  sum,
} from "drizzle-orm";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookMarked,
  Boxes,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  FileClock,
  FileSpreadsheet,
  PlusCircle,
  Receipt,
  ReceiptText,
  Search,
  TrendingUp,
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
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageAccess, type Peran } from "@/lib/auth-guard";
import { formatAngka, formatRupiah, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

import { EksporDashboard } from "./_m6/ekspor-dashboard";
import { GrafikArus, type TitikGrafik } from "./_m6/grafik-arus";
import {
  PERIODE_BAWAAN,
  PILIHAN_PERIODE,
  daftarEmberGrafik,
  hitungRentang,
  parsePeriode,
  selisihHari,
  type KodePeriode,
} from "./_m6/periode";

/* ------------------------------------------------------------------ */
/* Konstanta & tipe                                                    */
/* ------------------------------------------------------------------ */

const TRANSAKSI_PER_HALAMAN = 5;
/** Batas jumlah dokumen terbaru yang diambil per sumber & secara total. */
const BATAS_TRANSAKSI = 25;

const JENIS_TRANSAKSI = [
  { kode: "semua", label: "Semua jenis" },
  { kode: "invoice", label: "Invoice penjualan" },
  { kode: "pembayaran", label: "Pembayaran" },
  { kode: "jurnal", label: "Jurnal" },
  { kode: "penerimaan", label: "Penerimaan barang" },
  { kode: "so", label: "Pesanan penjualan" },
  { kode: "po", label: "Pesanan pembelian" },
] as const;

type KodeJenis = (typeof JENIS_TRANSAKSI)[number]["kode"];

const PINTASAN_CEPAT: {
  label: string;
  href: string;
  ikon: typeof Boxes;
  peran: Peran[];
}[] = [
  {
    label: "Laporan Laba Rugi & Neraca",
    href: "/keuangan/laporan",
    ikon: FileSpreadsheet,
    peran: ["owner", "keuangan"],
  },
  {
    label: "Buat Sales Order",
    href: "/penjualan/so/buat",
    ikon: PlusCircle,
    peran: ["owner"],
  },
  {
    label: "Invoice Penjualan",
    href: "/penjualan/so/invoice",
    ikon: ReceiptText,
    peran: ["owner", "keuangan"],
  },
  {
    label: "Catat Pembayaran",
    href: "/keuangan/pembayaran",
    ikon: Wallet,
    peran: ["owner", "keuangan"],
  },
  {
    label: "Catat Beban",
    href: "/keuangan/beban",
    ikon: Receipt,
    peran: ["owner", "keuangan"],
  },
  {
    label: "Buku Besar",
    href: "/keuangan/buku-besar",
    ikon: BookMarked,
    peran: ["owner", "keuangan"],
  },
];

type TransaksiDashboard = {
  kunci: string;
  nomor: string;
  jenis: string;
  pihak: string;
  tanggal: string;
  nilai: number;
  status: string;
  href: string;
  arah: "masuk" | "keluar";
};

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function angka(nilai: string | number | null | undefined) {
  return Number(nilai ?? 0);
}

function teksParam(nilai: string | string[] | undefined) {
  return (Array.isArray(nilai) ? nilai[0] : nilai)?.trim() ?? "";
}

/** Escape karakter wildcard LIKE agar input pengguna dicari apa adanya. */
function polaCari(q: string) {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

function hrefDashboard(p: { periode?: KodePeriode; q?: string; jenis?: string }) {
  const params = new URLSearchParams();
  if (p.periode && p.periode !== PERIODE_BAWAAN) params.set("periode", p.periode);
  if (p.q) params.set("q", p.q);
  if (p.jenis && p.jenis !== "semua") params.set("jenis", p.jenis);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

async function ringkasanLaba(awal: string, akhir: string) {
  const [jual, beban] = await Promise.all([
    db
      .select({
        penjualan: sum(invoices.total),
        hpp: sum(invoices.totalHpp),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "posted"),
          gte(invoices.tanggal, awal),
          lte(invoices.tanggal, akhir),
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
          gte(journalEntries.tanggal, awal),
          lte(journalEntries.tanggal, akhir),
        ),
      ),
  ]);
  const penjualan = angka(jual[0]?.penjualan);
  const hpp = angka(jual[0]?.hpp);
  const bebanOperasional = angka(beban[0]?.total);
  return {
    penjualan,
    hpp,
    beban: bebanOperasional,
    laba: penjualan - hpp - bebanOperasional,
  };
}

/* ------------------------------------------------------------------ */
/* Komponen tampilan                                                   */
/* ------------------------------------------------------------------ */

function Perubahan({ kini, lalu }: { kini: number; lalu: number }) {
  if (lalu === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {kini === 0 ? "Belum ada data pembanding" : "Baru pada periode ini"}
      </span>
    );
  }
  const persen = ((kini - lalu) / Math.abs(lalu)) * 100;
  const naik = persen >= 0;
  const Ikon = naik ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        naik ? "text-emerald-700" : "text-rose-700",
      )}
    >
      <Ikon className="h-3.5 w-3.5" aria-hidden="true" />
      {formatAngka(Math.round(Math.abs(persen) * 10) / 10)}%
      <span className="ml-1 font-normal text-muted-foreground">
        vs periode sebelumnya
      </span>
    </span>
  );
}

function KartuKpi({
  judul,
  nilai,
  keterangan,
  perubahan,
  ikon: Ikon,
  warnaIkon,
}: {
  judul: string;
  nilai: string;
  keterangan: string;
  perubahan?: ReactNode;
  ikon: typeof Boxes;
  warnaIkon: string;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardDescription>{judul}</CardDescription>
          <CardTitle className="truncate text-xl tabular-nums">{nilai}</CardTitle>
        </div>
        <span className={`shrink-0 rounded-lg p-2 ${warnaIkon}`}>
          <Ikon className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        {perubahan ? <div>{perubahan}</div> : null}
        <p className="text-xs text-muted-foreground">{keterangan}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const params = await searchParams;
  const periode = parsePeriode(teksParam(params.periode));
  const rentang = hitungRentang(periode);
  const q = teksParam(params.q).slice(0, 100);
  const jenisParam = teksParam(params.jenis);
  const jenis: KodeJenis = JENIS_TRANSAKSI.some((j) => j.kode === jenisParam)
    ? (jenisParam as KodeJenis)
    : "semua";
  const halamanDiminta = Math.max(1, Number(teksParam(params.halaman)) || 1);
  const pola = q ? polaCari(q) : null;
  const hariIni = rentang.akhir;

  /** Jalankan query transaksi hanya bila jenisnya sesuai filter. */
  function jikaJenis<T>(kode: KodeJenis, query: () => PromiseLike<T[]>) {
    return jenis === "semua" || jenis === kode
      ? Promise.resolve(query())
      : Promise.resolve([] as T[]);
  }

  const [
    labaKini,
    labaLalu,
    ringkasanPersediaan,
    grafikPenjualan,
    grafikPembelian,
    piutangTerbuka,
    hutangTerbuka,
    statusSo,
    statusPo,
    statusInvoice,
    statusGrn,
    invoiceTerbaru,
    pembayaranTerbaru,
    jurnalTerbaru,
    penerimaanTerbaru,
    pesananPenjualanTerbaru,
    pesananPembelianTerbaru,
  ] = await Promise.all([
    ringkasanLaba(rentang.awal, rentang.akhir),
    ringkasanLaba(rentang.awalLalu, rentang.akhirLalu),
    db
      .select({
        jumlah: count(),
        totalNilai: sum(
          sql`${products.stokSaatIni} * ${products.hargaPokokRataRata}`,
        ),
      })
      .from(products),
    db
      .select({ tanggal: invoices.tanggal, total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "posted"),
          gte(invoices.tanggal, rentang.awal),
          lte(invoices.tanggal, rentang.akhir),
        ),
      )
      .groupBy(invoices.tanggal),
    db
      .select({ tanggal: goodsReceipts.tanggal, total: sum(goodsReceipts.total) })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.status, "posted"),
          gte(goodsReceipts.tanggal, rentang.awal),
          lte(goodsReceipts.tanggal, rentang.akhir),
        ),
      )
      .groupBy(goodsReceipts.tanggal),
    db
      .select({ jatuhTempo: invoices.jatuhTempo, total: invoices.total })
      .from(invoices)
      .where(
        and(eq(invoices.status, "posted"), eq(invoices.statusBayar, "belum")),
      ),
    db
      .select({ tanggal: goodsReceipts.tanggal, total: goodsReceipts.total })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.status, "posted"),
          eq(goodsReceipts.statusBayar, "belum"),
        ),
      ),
    db
      .select({ status: salesOrders.status, jumlah: count() })
      .from(salesOrders)
      .groupBy(salesOrders.status),
    db
      .select({ status: purchaseOrders.status, jumlah: count() })
      .from(purchaseOrders)
      .groupBy(purchaseOrders.status),
    db
      .select({ status: invoices.status, jumlah: count() })
      .from(invoices)
      .groupBy(invoices.status),
    db
      .select({ status: goodsReceipts.status, jumlah: count() })
      .from(goodsReceipts)
      .groupBy(goodsReceipts.status),

    // ---- Transaksi terakhir (dibatasi periode, pencarian & jenis) ----
    jikaJenis("invoice", () =>
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
        .where(
          and(
            gte(invoices.tanggal, rentang.awal),
            lte(invoices.tanggal, rentang.akhir),
            pola
              ? or(ilike(invoices.nomor, pola), ilike(customers.nama, pola))
              : undefined,
          ),
        )
        .orderBy(desc(invoices.tanggal), desc(invoices.id))
        .limit(BATAS_TRANSAKSI),
    ),
    jikaJenis("pembayaran", () =>
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
        .where(
          and(
            gte(payments.tanggal, rentang.awal),
            lte(payments.tanggal, rentang.akhir),
            pola ? ilike(payments.nomor, pola) : undefined,
          ),
        )
        .orderBy(desc(payments.tanggal), desc(payments.id))
        .limit(BATAS_TRANSAKSI),
    ),
    jikaJenis("jurnal", () =>
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
        .where(
          and(
            gte(journalEntries.tanggal, rentang.awal),
            lte(journalEntries.tanggal, rentang.akhir),
            pola
              ? or(
                  ilike(journalEntries.nomor, pola),
                  ilike(journalEntries.keterangan, pola),
                )
              : undefined,
          ),
        )
        .orderBy(desc(journalEntries.tanggal), desc(journalEntries.id))
        .limit(BATAS_TRANSAKSI),
    ),
    jikaJenis("penerimaan", () =>
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
        .where(
          and(
            gte(goodsReceipts.tanggal, rentang.awal),
            lte(goodsReceipts.tanggal, rentang.akhir),
            pola
              ? or(ilike(goodsReceipts.nomor, pola), ilike(suppliers.nama, pola))
              : undefined,
          ),
        )
        .orderBy(desc(goodsReceipts.tanggal), desc(goodsReceipts.id))
        .limit(BATAS_TRANSAKSI),
    ),
    jikaJenis("so", () =>
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
        .where(
          and(
            gte(salesOrders.tanggal, rentang.awal),
            lte(salesOrders.tanggal, rentang.akhir),
            pola
              ? or(ilike(salesOrders.nomor, pola), ilike(customers.nama, pola))
              : undefined,
          ),
        )
        .orderBy(desc(salesOrders.tanggal), desc(salesOrders.id))
        .limit(BATAS_TRANSAKSI),
    ),
    jikaJenis("po", () =>
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
        .where(
          and(
            gte(purchaseOrders.tanggal, rentang.awal),
            lte(purchaseOrders.tanggal, rentang.akhir),
            pola
              ? or(ilike(purchaseOrders.nomor, pola), ilike(suppliers.nama, pola))
              : undefined,
          ),
        )
        .orderBy(desc(purchaseOrders.tanggal), desc(purchaseOrders.id))
        .limit(BATAS_TRANSAKSI),
    ),
  ]);

  /* ---- Grafik ---- */
  const kunciEmber = (tanggal: string) =>
    rentang.kelompok === "bulan" ? tanggal.slice(0, 7) : tanggal;
  const petaGrafik = new Map<string, TitikGrafik>(
    daftarEmberGrafik(rentang).map((e) => [
      e.kunci,
      { label: e.label, penjualan: 0, pembelian: 0 },
    ]),
  );
  for (const baris of grafikPenjualan) {
    const titik = petaGrafik.get(kunciEmber(baris.tanggal));
    if (titik) titik.penjualan += angka(baris.total);
  }
  for (const baris of grafikPembelian) {
    const titik = petaGrafik.get(kunciEmber(baris.tanggal));
    if (titik) titik.pembelian += angka(baris.total);
  }
  const dataGrafik = [...petaGrafik.values()];
  const totalPembelianPeriode = dataGrafik.reduce((t, d) => t + d.pembelian, 0);

  /* ---- Piutang & hutang (untuk KPI dan "Perlu Tindakan") ---- */
  const totalPiutang = piutangTerbuka.reduce((t, inv) => t + angka(inv.total), 0);
  const totalHutang = hutangTerbuka.reduce((t, grn) => t + angka(grn.total), 0);
  const invoiceJatuhTempo = piutangTerbuka.filter(
    (inv) => selisihHari(hariIni, inv.jatuhTempo) > 0,
  ).length;

  /* ---- Perlu tindakan ---- */
  const hitung = (baris: { status: string; jumlah: number }[], status: string) =>
    baris.find((b) => b.status === status)?.jumlah ?? 0;
  const perluTindakan = [
    {
      label: "Invoice lewat jatuh tempo",
      jumlah: invoiceJatuhTempo,
      href: "/keuangan/pembayaran",
      penting: true,
    },
    {
      label: "Pesanan penjualan menunggu konfirmasi",
      jumlah: hitung(statusSo, "draft"),
      href: "/penjualan/so",
      penting: false,
    },
    {
      label: "Pesanan penjualan siap dibuatkan invoice",
      jumlah: hitung(statusSo, "confirmed"),
      href: "/penjualan/so",
      penting: false,
    },
    {
      label: "Invoice belum diposting",
      jumlah: hitung(statusInvoice, "draft"),
      href: "/penjualan/so/invoice",
      penting: false,
    },
    {
      label: "Pesanan pembelian menunggu persetujuan",
      jumlah: hitung(statusPo, "draft"),
      href: "/pembelian/po",
      penting: false,
    },
    {
      label: "Pesanan pembelian menunggu barang datang",
      jumlah: hitung(statusPo, "approved"),
      href: "/pembelian/po",
      penting: false,
    },
    {
      label: "Penerimaan barang belum diposting",
      jumlah: hitung(statusGrn, "draft"),
      href: "/pembelian/grn",
      penting: false,
    },
  ].filter((t) => t.jumlah > 0);

  /* ---- Transaksi terakhir ---- */
  const semuaTransaksi: TransaksiDashboard[] = [
    ...invoiceTerbaru.map((item) => ({
      kunci: `inv-${item.nomor}`,
      nomor: item.nomor,
      jenis: "Invoice penjualan",
      pihak: item.pihak,
      tanggal: item.tanggal,
      nilai: angka(item.total),
      status: item.status,
      href: "/penjualan/so/invoice",
      arah: "masuk" as const,
    })),
    ...pembayaranTerbaru.map((item) => ({
      kunci: `pay-${item.nomor}`,
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
      kunci: `jur-${item.id}`,
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
        item.refType === "invoice_hpp" ? ("keluar" as const) : ("masuk" as const),
    })),
    ...penerimaanTerbaru.map((item) => ({
      kunci: `grn-${item.nomor}`,
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
      kunci: `so-${item.nomor}`,
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
      kunci: `po-${item.nomor}`,
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
    .sort(
      (a, b) =>
        b.tanggal.localeCompare(a.tanggal) || b.nomor.localeCompare(a.nomor),
    )
    .slice(0, BATAS_TRANSAKSI);

  const totalHalamanTransaksi = Math.max(
    1,
    Math.ceil(semuaTransaksi.length / TRANSAKSI_PER_HALAMAN),
  );
  const halamanTransaksi = Math.min(halamanDiminta, totalHalamanTransaksi);
  const transaksiPerHalaman = semuaTransaksi.slice(
    (halamanTransaksi - 1) * TRANSAKSI_PER_HALAMAN,
    halamanTransaksi * TRANSAKSI_PER_HALAMAN,
  );
  const adaFilterTransaksi = q !== "" || jenis !== "semua";

  const totalNilaiPersediaan = angka(ringkasanPersediaan[0]?.totalNilai);
  const pintasanTersedia = PINTASAN_CEPAT.filter((p) =>
    p.peran.includes(akses.sesi.peran),
  );
  const labelJenisAktif =
    JENIS_TRANSAKSI.find((j) => j.kode === jenis)?.label ?? "Semua jenis";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        judul={`Selamat datang, ${akses.sesi.nama}`}
        deskripsi={`Ringkasan kondisi usaha · ${formatTanggal(rentang.awal)} – ${formatTanggal(rentang.akhir)}`}
        aksi={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <EksporDashboard
              data={{
                kodePeriode: periode,
                labelPeriode: rentang.label,
                awal: rentang.awal,
                akhir: rentang.akhir,
                dicetakOleh: akses.sesi.nama,
                peran: akses.sesi.peran,
                filterCari: q,
                filterJenisLabel: labelJenisAktif,
                kpi: {
                  penjualanKini: labaKini.penjualan,
                  penjualanLalu: labaLalu.penjualan,
                  hppKini: labaKini.hpp,
                  bebanKini: labaKini.beban,
                  labaKini: labaKini.laba,
                  labaLalu: labaLalu.laba,
                  totalPembelian: totalPembelianPeriode,
                  totalPiutang,
                  jumlahPiutang: piutangTerbuka.length,
                  invoiceJatuhTempo,
                  totalHutang,
                  jumlahHutang: hutangTerbuka.length,
                  nilaiPersediaan: totalNilaiPersediaan,
                  jumlahProduk: ringkasanPersediaan[0]?.jumlah ?? 0,
                },
                grafik: dataGrafik,
                perluTindakan: perluTindakan.map((t) => ({
                  label: t.label,
                  jumlah: t.jumlah,
                })),
                transaksi: semuaTransaksi.map((t) => ({
                  nomor: t.nomor,
                  jenis: t.jenis,
                  pihak: t.pihak,
                  tanggal: t.tanggal,
                  nilai: t.nilai,
                  status: t.status,
                  arah: t.arah,
                })),
              }}
            />
            <nav
              aria-label="Pilih periode"
              className="inline-flex rounded-lg border bg-background p-0.5"
            >
              {PILIHAN_PERIODE.map((p) => {
                const aktif = p.kode === periode;
                return (
                  <Link
                    key={p.kode}
                    href={hrefDashboard({ periode: p.kode, q, jenis })}
                    aria-current={aktif ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      aktif
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {p.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        }
      />

      {/* ---- Pintasan cepat ---- */}
      <nav
        aria-label="Pintasan cepat"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          Pintasan:
        </span>
        {pintasanTersedia.map((item) => {
          const Ikon = item.ikon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Ikon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ---- KPI ---- */}
      <section
        aria-label="Indikator kinerja utama"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        <KartuKpi
          judul={`Penjualan · ${rentang.label}`}
          nilai={formatRupiah(labaKini.penjualan)}
          perubahan={<Perubahan kini={labaKini.penjualan} lalu={labaLalu.penjualan} />}
          keterangan={`Periode sebelumnya ${formatRupiah(labaLalu.penjualan)}`}
          ikon={TrendingUp}
          warnaIkon="bg-sky-100 text-sky-700"
        />
        <KartuKpi
          judul={`Laba Bersih · ${rentang.label}`}
          nilai={formatRupiah(labaKini.laba)}
          perubahan={<Perubahan kini={labaKini.laba} lalu={labaLalu.laba} />}
          keterangan={`Penjualan − HPP ${formatRupiah(labaKini.hpp)} − beban ${formatRupiah(labaKini.beban)}`}
          ikon={CircleDollarSign}
          warnaIkon="bg-emerald-100 text-emerald-700"
        />
        <KartuKpi
          judul="Total Piutang"
          nilai={formatRupiah(totalPiutang)}
          keterangan={`${formatAngka(piutangTerbuka.length)} invoice belum lunas · ${formatAngka(invoiceJatuhTempo)} lewat jatuh tempo`}
          ikon={ReceiptText}
          warnaIkon="bg-amber-100 text-amber-700"
        />
        <KartuKpi
          judul="Total Hutang"
          nilai={formatRupiah(totalHutang)}
          keterangan={`${formatAngka(hutangTerbuka.length)} penerimaan belum dibayar`}
          ikon={Wallet}
          warnaIkon="bg-violet-100 text-violet-700"
        />
        <KartuKpi
          judul="Nilai Persediaan"
          nilai={formatRupiah(totalNilaiPersediaan)}
          keterangan={`Stok × harga pokok rata-rata · ${formatAngka(ringkasanPersediaan[0]?.jumlah ?? 0)} produk`}
          ikon={Boxes}
          warnaIkon="bg-blue-100 text-blue-700"
        />
      </section>

      {/* ---- Grafik + Perlu tindakan ---- */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Penjualan vs Pembelian</CardTitle>
              <CardDescription className="mt-1">
                {rentang.kelompok === "bulan" ? "Per bulan" : "Per hari"} ·{" "}
                {rentang.label.toLowerCase()}
              </CardDescription>
            </div>
            <dl className="flex gap-6 text-right">
              <div>
                <dt className="text-xs text-muted-foreground">Penjualan</dt>
                <dd className="font-semibold tabular-nums">
                  {formatRupiah(labaKini.penjualan)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pembelian</dt>
                <dd className="font-semibold tabular-nums">
                  {formatRupiah(totalPembelianPeriode)}
                </dd>
              </div>
            </dl>
          </CardHeader>
          <CardContent>
            <GrafikArus data={dataGrafik} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Perlu Tindakan</CardTitle>
              <CardDescription className="mt-1">
                Dokumen yang menunggu diproses
              </CardDescription>
            </div>
            <ClipboardList
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            {perluTindakan.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Semua dokumen sudah diproses.
              </p>
            ) : (
              <ul className="space-y-2">
                {perluTindakan.map((t) => (
                  <li key={t.label}>
                    <Link
                      href={t.href}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                            t.penting
                              ? "bg-red-100 text-red-700"
                              : "bg-secondary text-secondary-foreground",
                          )}
                        >
                          {formatAngka(t.jumlah)}
                        </span>
                        {t.label}
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ---- Transaksi terakhir ---- */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Transaksi Terakhir</CardTitle>
            <CardDescription className="mt-1">
              Dokumen terbaru pada periode {rentang.label.toLowerCase()} ·{" "}
              {TRANSAKSI_PER_HALAMAN} per halaman
            </CardDescription>
          </div>
          <FileClock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Form
            key={`${periode}|${q}|${jenis}`}
            action="/"
            scroll={false}
            role="search"
            aria-label="Cari transaksi"
            className="flex flex-wrap items-end gap-2 px-6 pb-4"
          >
            {periode !== PERIODE_BAWAAN ? (
              <input type="hidden" name="periode" value={periode} />
            ) : null}
            <div className="relative min-w-56 flex-1">
              <label htmlFor="cari-transaksi" className="sr-only">
                Cari nomor dokumen atau nama pihak
              </label>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="cari-transaksi"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Cari nomor dokumen, pelanggan, supplier…"
                maxLength={100}
                className="pl-8"
              />
            </div>
            <div>
              <label htmlFor="jenis-transaksi" className="sr-only">
                Jenis transaksi
              </label>
              <select
                id="jenis-transaksi"
                name="jenis"
                defaultValue={jenis}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {JENIS_TRANSAKSI.map((j) => (
                  <option key={j.kode} value={j.kode}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonVariants({ size: "default" })}>
              Terapkan
            </button>
            {adaFilterTransaksi ? (
              <Link
                href={hrefDashboard({ periode })}
                scroll={false}
                className={buttonVariants({ variant: "ghost" })}
              >
                Reset
              </Link>
            ) : null}
          </Form>

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
                  <TableRow key={transaksi.kunci}>
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
              {semuaTransaksi.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {adaFilterTransaksi
                      ? "Tidak ada transaksi yang cocok dengan pencarian/filter."
                      : "Belum ada transaksi pada periode ini."}
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
              total={semuaTransaksi.length}
              filters={{
                periode: periode !== PERIODE_BAWAAN ? periode : "",
                q,
                jenis: jenis !== "semua" ? jenis : "",
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

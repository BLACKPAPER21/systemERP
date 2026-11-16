/* MILIK M5 — Laporan Keuangan: Laba Rugi & Neraca (PRD §5.5, §13 skenario demo)
 * Peran: owner | keuangan
 *
 * Laba Rugi:
 *   Pendapatan (4-100) − HPP (5-100) = Laba Kotor
 *   Laba Kotor − Beban Operasional (5-200) = Laba Bersih
 *
 * Neraca:
 *   Aset = Kas (1-100) + Piutang (1-200) + Persediaan (1-300)
 *   Liabilitas = Hutang Usaha (2-100)
 *   Ekuitas = Modal (3-100) + Laba Bersih
 *   Uji Seimbang: Aset = Liabilitas + Ekuitas
 */
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, journalLines } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { formatRupiah } from "@/lib/format";

type SaldoAkun = Record<string, number>; // kode → nilai saldo (sudah mempertimbangkan saldo normal)

async function hitungSaldoAkun(): Promise<SaldoAkun> {
  const daftarAkun = await db.select().from(accounts);
  const semuaLines = await db
    .select({
      accountId: journalLines.accountId,
      debit: journalLines.debit,
      kredit: journalLines.kredit,
    })
    .from(journalLines);

  // Map id → kode & saldo normal
  const akunMap = new Map(daftarAkun.map((a) => [a.id, a]));
  const saldo: Record<string, { debit: number; kredit: number }> = {};

  for (const a of daftarAkun) {
    saldo[a.kode] = { debit: 0, kredit: 0 };
  }

  for (const l of semuaLines) {
    const akun = akunMap.get(l.accountId);
    if (!akun) continue;
    saldo[akun.kode].debit += Number(l.debit);
    saldo[akun.kode].kredit += Number(l.kredit);
  }

  // Hitung saldo bersih per kode (positif = sisi saldo normal)
  const result: SaldoAkun = {};
  for (const a of daftarAkun) {
    if (a.saldoNormal === "debit") {
      result[a.kode] = saldo[a.kode].debit - saldo[a.kode].kredit;
    } else {
      result[a.kode] = saldo[a.kode].kredit - saldo[a.kode].debit;
    }
  }
  return result;
}

function NilaiRow({
  label,
  nilai,
  indent = false,
  bold = false,
  positif = true,
}: {
  label: string;
  nilai: number;
  indent?: boolean;
  bold?: boolean;
  positif?: boolean;
}) {
  const colorClass = nilai < 0 ? "text-red-600" : positif ? "text-foreground" : "text-muted-foreground";
  return (
    <div className={`flex justify-between py-1.5 ${indent ? "pl-6" : ""} ${bold ? "font-semibold border-t border-dashed mt-1 pt-2" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`${colorClass} ${bold ? "text-base" : "text-sm"}`}>
        {formatRupiah(Math.abs(nilai))}{nilai < 0 ? " (Rugi)" : ""}
      </span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-muted/40 px-4 py-2 rounded-md mb-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );
}

export default async function LaporanPage() {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const s = await hitungSaldoAkun();

  // ===== LABA RUGI =====
  const pendapatan = s["4-100"] ?? 0;
  const hpp = s["5-100"] ?? 0;
  const labaKotor = pendapatan - hpp;
  const bebanOperasional = s["5-200"] ?? 0;
  const labaBersih = labaKotor - bebanOperasional;

  // ===== NERACA =====
  const kas = s["1-100"] ?? 0;
  const piutang = s["1-200"] ?? 0;
  const persediaan = s["1-300"] ?? 0;
  const totalAset = kas + piutang + persediaan;

  const hutangUsaha = s["2-100"] ?? 0;
  const totalLiabilitas = hutangUsaha;

  const modal = s["3-100"] ?? 0;
  const totalEkuitas = modal + labaBersih;

  const totalLiabilitasDanEkuitas = totalLiabilitas + totalEkuitas;
  const selisih = totalAset - totalLiabilitasDanEkuitas;
  const neracaSeimbang = Math.abs(selisih) < 1; // toleransi Rp 1

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Laporan Keuangan"
        deskripsi="Laba Rugi dan Neraca berdasarkan seluruh jurnal yang telah terbentuk."
      />

      {/* Verifikasi Neraca Banner */}
      <div
        className={`rounded-lg border p-4 ${
          neracaSeimbang
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{neracaSeimbang ? "✅" : "⚠️"}</span>
          <div>
            <p className={`font-semibold ${neracaSeimbang ? "text-green-800" : "text-red-800"}`}>
              {neracaSeimbang
                ? "Neraca Seimbang — Aset = Liabilitas + Ekuitas"
                : `Neraca TIDAK Seimbang — Selisih: ${formatRupiah(Math.abs(selisih))}`}
            </p>
            <p className={`text-xs mt-0.5 ${neracaSeimbang ? "text-green-600" : "text-red-600"}`}>
              {neracaSeimbang
                ? `${formatRupiah(totalAset)} = ${formatRupiah(totalLiabilitas)} + ${formatRupiah(totalEkuitas)}`
                : "Ada kesalahan dalam pencatatan jurnal. Periksa daftar jurnal."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== LAPORAN LABA RUGI ===== */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="text-lg font-bold border-b pb-2">Laporan Laba Rugi</h2>

          <SectionHeader title="Pendapatan" />
          <div className="px-4 space-y-1">
            <NilaiRow label="Pendapatan Penjualan (4-100)" nilai={pendapatan} indent />
          </div>

          <SectionHeader title="Harga Pokok Penjualan (HPP)" />
          <div className="px-4 space-y-1">
            <NilaiRow label="HPP Penjualan (5-100)" nilai={hpp} indent />
          </div>
          <div className="px-4">
            <NilaiRow label="Laba Kotor" nilai={labaKotor} bold />
          </div>

          <SectionHeader title="Beban Operasional" />
          <div className="px-4 space-y-1">
            <NilaiRow label="Beban Operasional (5-200)" nilai={bebanOperasional} indent />
          </div>
          <div className="px-4 mt-2">
            <NilaiRow label="Laba Bersih" nilai={labaBersih} bold />
          </div>
        </div>

        {/* ===== NERACA ===== */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="text-lg font-bold border-b pb-2">Neraca</h2>

          <SectionHeader title="Aset" />
          <div className="px-4 space-y-1">
            <NilaiRow label="Kas & Bank (1-100)" nilai={kas} indent />
            <NilaiRow label="Piutang Usaha (1-200)" nilai={piutang} indent />
            <NilaiRow label="Persediaan Barang (1-300)" nilai={persediaan} indent />
            <NilaiRow label="Total Aset" nilai={totalAset} bold />
          </div>

          <SectionHeader title="Liabilitas" />
          <div className="px-4 space-y-1">
            <NilaiRow label="Hutang Usaha (2-100)" nilai={hutangUsaha} indent />
            <NilaiRow label="Total Liabilitas" nilai={totalLiabilitas} bold />
          </div>

          <SectionHeader title="Ekuitas" />
          <div className="px-4 space-y-1">
            <NilaiRow label="Modal Pemilik (3-100)" nilai={modal} indent />
            <NilaiRow label="Laba Bersih" nilai={labaBersih} indent />
            <NilaiRow label="Total Ekuitas" nilai={totalEkuitas} bold />
          </div>

          <div className="px-4 mt-3 border-t pt-3">
            <NilaiRow label="Total Liabilitas + Ekuitas" nilai={totalLiabilitasDanEkuitas} bold />
          </div>

          {/* Verifikasi Silang */}
          <div className={`mt-3 rounded-md px-4 py-2 text-xs font-medium ${neracaSeimbang ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {neracaSeimbang
              ? `✓ Uji Neraca: ${formatRupiah(totalAset)} = ${formatRupiah(totalLiabilitasDanEkuitas)}`
              : `✗ Selisih: ${formatRupiah(Math.abs(selisih))}`}
          </div>
        </div>
      </div>

      {/* Referensi skenario demo */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold mb-2">📊 Panduan Verifikasi Angka Demo (PRD §13.1)</h3>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="font-medium text-foreground">Stok akhir:</span> 6 unit (10 masuk − 4 keluar)</div>
          <div><span className="font-medium text-foreground">Nilai persediaan:</span> Rp 300.000 (6 × Rp 50.000)</div>
          <div><span className="font-medium text-foreground">Laba kotor:</span> Rp 120.000 (320.000 − 200.000)</div>
          <div><span className="font-medium text-foreground">Saldo kas:</span> Rp 820.000 (1jt modal + 320rb terima − 500rb bayar)</div>
        </div>
      </div>
    </div>
  );
}


/* MILIK M5 — Buku Besar per Akun (PRD §5.5)
 * Menampilkan saldo dan pergerakan per akun dari journal_lines.
 * Peran: owner | keuangan
 */
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, journalLines, journalEntries } from "@/db/schema";
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
import { formatRupiah, formatTanggal } from "@/lib/format";

export default async function BukuBesarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const kodeAkun = typeof sp.akun === "string" ? sp.akun : "";

  // Daftar semua akun
  const daftarAkun = await db
    .select()
    .from(accounts)
    .orderBy(accounts.kode);

  // Saldo per akun (agregat dari semua journal_lines)
  const saldoAkun: Record<string, { debit: number; kredit: number }> = {};
  for (const akun of daftarAkun) {
    saldoAkun[akun.id] = { debit: 0, kredit: 0 };
  }

  const semuaLines = await db
    .select({
      accountId: journalLines.accountId,
      debit: journalLines.debit,
      kredit: journalLines.kredit,
    })
    .from(journalLines);

  for (const l of semuaLines) {
    if (saldoAkun[l.accountId]) {
      saldoAkun[l.accountId].debit += Number(l.debit);
      saldoAkun[l.accountId].kredit += Number(l.kredit);
    }
  }

  // Detail pergerakan akun yang dipilih
  let detailAkun: {
    tanggal: string;
    nomor: string;
    keterangan: string | null;
    jurnalKeterangan: string;
    debit: string;
    kredit: string;
  }[] = [];

  const akunDipilih = kodeAkun ? daftarAkun.find((a) => a.kode === kodeAkun) : null;

  if (akunDipilih) {
    detailAkun = await db
      .select({
        tanggal: journalEntries.tanggal,
        nomor: journalEntries.nomor,
        keterangan: journalLines.keterangan,
        jurnalKeterangan: journalEntries.keterangan,
        debit: journalLines.debit,
        kredit: journalLines.kredit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(eq(journalLines.accountId, akunDipilih.id))
      .orderBy(desc(journalEntries.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Buku Besar"
        deskripsi="Saldo dan pergerakan setiap akun dalam bagan akun."
      />

      {/* Ringkasan Semua Akun */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-sm">Saldo Semua Akun</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Saldo Normal</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Kredit</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daftarAkun.map((akun) => {
              const saldo = saldoAkun[akun.id] ?? { debit: 0, kredit: 0 };
              const nilaiSaldo =
                akun.saldoNormal === "debit"
                  ? saldo.debit - saldo.kredit
                  : saldo.kredit - saldo.debit;
              return (
                <TableRow key={akun.id} className={kodeAkun === akun.kode ? "bg-primary/5" : ""}>
                  <TableCell className="font-mono text-xs">{akun.kode}</TableCell>
                  <TableCell className="font-medium">{akun.nama}</TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{akun.tipe}</TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{akun.saldoNormal}</TableCell>
                  <TableCell className="text-right text-sm">{formatRupiah(saldo.debit)}</TableCell>
                  <TableCell className="text-right text-sm">{formatRupiah(saldo.kredit)}</TableCell>
                  <TableCell className={`text-right font-semibold ${nilaiSaldo < 0 ? "text-red-600" : "text-green-700"}`}>
                    {formatRupiah(Math.abs(nilaiSaldo))}
                    {nilaiSaldo < 0 ? " (minus)" : ""}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/keuangan/buku-besar?akun=${akun.kode}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Detail
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail Akun yang Dipilih */}
      {akunDipilih && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                {akunDipilih.kode} — {akunDipilih.nama}
              </h2>
              <p className="text-xs text-muted-foreground capitalize">
                {akunDipilih.tipe} · Saldo normal: {akunDipilih.saldoNormal}
              </p>
            </div>
            <a
              href="/keuangan/buku-besar"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Semua akun
            </a>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. JV</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailAkun.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Belum ada pergerakan untuk akun ini.
                  </TableCell>
                </TableRow>
              )}
              {detailAkun.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{formatTanggal(l.tanggal)}</TableCell>
                  <TableCell className="font-mono text-xs text-primary">{l.nomor}</TableCell>
                  <TableCell>
                    {l.jurnalKeterangan}
                    {l.keterangan ? (
                      <span className="ml-2 text-xs text-muted-foreground">({l.keterangan})</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(l.debit) > 0 ? formatRupiah(l.debit) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(l.kredit) > 0 ? formatRupiah(l.kredit) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


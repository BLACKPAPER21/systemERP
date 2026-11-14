/* MILIK M5 — Halaman Daftar Jurnal Umum (PRD §5.5)
 * Peran: owner | keuangan
 * Menampilkan semua journal_entries dengan detail baris debit/kredit.
 */
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, SQL } from "drizzle-orm";

import { db } from "@/db";
import { journalEntries, journalLines, accounts, users } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatTanggal, STATUS_LABEL } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

const PER_HALAMAN = 15;

export default async function JurnalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tglDari = typeof sp.dari === "string" ? sp.dari : "";
  const tglSampai = typeof sp.sampai === "string" ? sp.sampai : "";
  const halaman = Math.max(1, Number(sp.halaman ?? 1) || 1);

  const filters: SQL[] = [];
  if (q) {
    filters.push(
      or(
        ilike(journalEntries.nomor, `%${q}%`),
        ilike(journalEntries.keterangan, `%${q}%`),
      )!,
    );
  }
  if (tglDari) filters.push(gte(journalEntries.tanggal, tglDari));
  if (tglSampai) filters.push(lte(journalEntries.tanggal, tglSampai));

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(journalEntries)
    .where(where);

  const rows = await db
    .select({
      id: journalEntries.id,
      nomor: journalEntries.nomor,
      tanggal: journalEntries.tanggal,
      keterangan: journalEntries.keterangan,
      refType: journalEntries.refType,
      totalDebit: journalEntries.totalDebit,
      totalKredit: journalEntries.totalKredit,
      dibuatOlehNama: users.nama,
    })
    .from(journalEntries)
    .leftJoin(users, eq(journalEntries.dibuatOleh, users.id))
    .where(where)
    .orderBy(desc(journalEntries.id))
    .limit(PER_HALAMAN)
    .offset((halaman - 1) * PER_HALAMAN);

  // Ambil baris jurnal untuk setiap entry yang ditampilkan
  const entryIds = rows.map((r) => r.id);
  const allLines =
    entryIds.length > 0
      ? await db
          .select({
            journalEntryId: journalLines.journalEntryId,
            debit: journalLines.debit,
            kredit: journalLines.kredit,
            keterangan: journalLines.keterangan,
            namaAkun: accounts.nama,
            kodeAkun: accounts.kode,
          })
          .from(journalLines)
          .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
          .where(inArray(journalLines.journalEntryId, entryIds))
          .orderBy(asc(journalLines.id))
      : [];

  // Group lines per entry
  const linesPerEntry = new Map<number, typeof allLines>();
  for (const id of entryIds) {
    linesPerEntry.set(id, []);
  }

  for (const line of allLines) {
    const arr = linesPerEntry.get(line.journalEntryId) ?? [];
    arr.push(line);
    linesPerEntry.set(line.journalEntryId, arr);
  }

  const filters2 = { q, dari: tglDari, sampai: tglSampai };

  return (
    <div className="space-y-4">
      <PageHeader
        judul="Jurnal Umum"
        deskripsi="Seluruh jurnal akuntansi yang terbentuk otomatis dari transaksi operasional."
      />

      {/* Filter */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Cari nomor / keterangan</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Ketik untuk mencari…"
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Dari tanggal</label>
          <input
            name="dari"
            type="date"
            defaultValue={tglDari}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Sampai tanggal</label>
          <input
            name="sampai"
            type="date"
            defaultValue={tglSampai}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filter
        </button>
        {(q || tglDari || tglSampai) && (
          <a
            href="/keuangan/jurnal"
            className="h-9 inline-flex items-center rounded-md border px-4 text-sm text-muted-foreground hover:bg-accent"
          >
            Reset
          </a>
        )}
      </form>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor JV</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Kredit</TableHead>
              <TableHead>Dibuat Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Belum ada jurnal.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const entryLines = linesPerEntry.get(r.id) ?? [];
              return [
                <TableRow key={`h-${r.id}`} className="bg-muted/20 font-medium">
                  <TableCell className="font-mono text-xs text-primary">{r.nomor}</TableCell>
                  <TableCell>{formatTanggal(r.tanggal)}</TableCell>
                  <TableCell>{r.keterangan}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.refType} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-700">
                    {formatRupiah(r.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-700">
                    {formatRupiah(r.totalKredit)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.dibuatOlehNama ?? "—"}</TableCell>
                </TableRow>,
                ...entryLines.map((l, i) => (
                  <TableRow key={`l-${r.id}-${i}`} className="text-xs text-muted-foreground">
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="pl-6">
                      <span className="font-mono text-xs text-muted-foreground">{l.kodeAkun}</span>
                      {" "}{l.namaAkun}
                      {l.keterangan ? <span className="ml-2 italic text-muted-foreground/70">({l.keterangan})</span> : null}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">
                      {Number(l.debit) > 0 ? formatRupiah(l.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(l.kredit) > 0 ? formatRupiah(l.kredit) : "—"}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )),
              ];
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination
        basePath="/keuangan/jurnal"
        halaman={halaman}
        perHalaman={PER_HALAMAN}
        total={total}
        filters={filters2}
      />
    </div>
  );
}


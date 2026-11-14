/* MILIK M5 — Halaman Beban Operasional (PRD §5.5)
 * Menampilkan daftar beban operasional (ref_type = 'expense') & form input baru.
 * Peran: owner | keuangan
 */
import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { journalEntries, users } from "@/db/schema";
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
import { formatRupiah, formatTanggal } from "@/lib/format";
import { BebanDialog } from "@/components/keuangan/beban-dialog";

const PER_HALAMAN = 15;

export default async function BebanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const halaman = Math.max(1, Number(sp.halaman ?? 1) || 1);

  const where = eq(journalEntries.refType, "expense");

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
      totalDebit: journalEntries.totalDebit,
      dibuatOlehNama: users.nama,
    })
    .from(journalEntries)
    .leftJoin(users, eq(journalEntries.dibuatOleh, users.id))
    .where(where)
    .orderBy(desc(journalEntries.id))
    .limit(PER_HALAMAN)
    .offset((halaman - 1) * PER_HALAMAN);

  const totalBeban = rows.reduce((s, r) => s + Number(r.totalDebit), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        judul="Beban Operasional"
        deskripsi="Catat pengeluaran beban operasional; jurnal J6 terbentuk otomatis."
        aksi={<BebanDialog />}
      />

      <div className="rounded-lg border bg-orange-50 border-orange-200 p-4">
        <p className="text-sm font-medium text-orange-800">
          Total Beban Bulan Ini:{" "}
          <span className="text-lg font-bold">{formatRupiah(totalBeban)}</span>
        </p>
        <p className="text-xs text-orange-600 mt-1">
          Jurnal yang terbentuk: D 5-200 Beban Operasional / K 1-100 Kas & Bank
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor JV</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Dicatat Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada beban yang dicatat.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs text-primary">{r.nomor}</TableCell>
                <TableCell>{formatTanggal(r.tanggal)}</TableCell>
                <TableCell>{r.keterangan}</TableCell>
                <TableCell className="text-right font-medium text-orange-700">
                  {formatRupiah(r.totalDebit)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.dibuatOlehNama ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        basePath="/keuangan/beban"
        halaman={halaman}
        perHalaman={PER_HALAMAN}
        total={total}
        filters={{}}
      />
    </div>
  );
}


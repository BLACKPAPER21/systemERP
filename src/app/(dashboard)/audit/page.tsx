/* Halaman Log Audit — wilayah M1 (NF-10, §5.1).
 * Menampilkan jejak aksi create/update/post/cancel dari seluruh modul.
 * Hanya Owner yang membuka halaman ini.
 */
import { desc, eq, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { auditLogs, users as usersTable } from "@/db/schema";
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

const PER_HALAMAN = 20;

const usersPenulis = alias(usersTable, "users_penulis");

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const aksi = typeof sp.aksi === "string" ? sp.aksi : "";
  const halaman = Math.max(1, Number(sp.halaman ?? 1) || 1);

  const where =
    aksi === "create" || aksi === "update" || aksi === "post" || aksi === "cancel"
      ? eq(auditLogs.aksi, aksi)
      : undefined;

  const [baris, hitung] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        waktu: auditLogs.waktu,
        aksi: auditLogs.aksi,
        entitas: auditLogs.entitas,
        entitasId: auditLogs.entitasId,
        detail: auditLogs.detail,
        penulis: usersPenulis.nama,
      })
      .from(auditLogs)
      .leftJoin(usersPenulis, eq(auditLogs.userId, usersPenulis.id))
      .where(where)
      .orderBy(desc(auditLogs.id))
      .limit(PER_HALAMAN)
      .offset((halaman - 1) * PER_HALAMAN),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  const total = Number(hitung[0]?.total ?? 0);

  return (
    <div>
      <PageHeader
        judul="Log Audit"
        deskripsi="Jejak seluruh aksi create/update/post/cancel sepanjang sistem, termasuk pelaku dan waktunya."
      />

      <form method="get" className="mb-4 flex gap-2">
        <select
          name="aksi"
          defaultValue={aksi}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Semua aksi</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="post">post</option>
          <option value="cancel">cancel</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
        >
          Filter
        </button>
      </form>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Oleh</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada aktivitas tercatat.
                </TableCell>
              </TableRow>
            ) : (
              baris.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatWaktu(l.waktu)}</TableCell>
                  <TableCell>
                    <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                      {l.aksi}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.entitas}</TableCell>
                  <TableCell>{l.entitasId}</TableCell>
                  <TableCell>{l.penulis ?? `#${l.id}`}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                    {l.detail ? JSON.stringify(l.detail) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        basePath="/audit"
        halaman={halaman}
        perHalaman={PER_HALAMAN}
        total={total}
        filters={{ aksi }}
      />
    </div>
  );
}

function formatWaktu(t: Date): string {
  const d = new Date(t);
  const hari = String(d.getDate()).padStart(2, "0");
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const tahun = d.getFullYear();
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${hari}/${bulan}/${tahun} ${jam}:${menit}`;
}

/* Halaman Manajemen Pengguna — wilayah M1. Hanya Owner (matriks §4.2). */
import { asc, count } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PenggunaFormDialog } from "./pengguna-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTanggal } from "@/lib/format";

const PER_HALAMAN = 10;

const LABEL_PERAN: Record<string, string> = {
  owner: "Owner",
  gudang: "Staf Gudang",
  sales: "Kasir / Sales",
  keuangan: "Staf Keuangan",
};

export default async function PenggunaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const halaman = Math.max(1, Number(sp.halaman ?? 1) || 1);

  const [baris, hitung] = await Promise.all([
    db
      .select()
      .from(users)
      .orderBy(asc(users.id))
      .limit(PER_HALAMAN)
      .offset((halaman - 1) * PER_HALAMAN),
    db.select({ total: count() }).from(users),
  ]);

  const total = Number(hitung[0]?.total ?? 0);

  return (
    <div>
      <PageHeader
        judul="Manajemen Pengguna"
        deskripsi="Kelola pengguna beserta perannya. Setiap aksi tercatat pada log audit."
        aksi={
          <PenggunaFormDialog trigger={<Button>Tambah Pengguna</Button>} />
        }
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="w-[90px]">Ubah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada pengguna.
                </TableCell>
              </TableRow>
            ) : (
              baris.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nama}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{LABEL_PERAN[u.peran] ?? u.peran}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.aktif ? "aktif" : "nonaktif"} />
                  </TableCell>
                  <TableCell>{formatTanggal(u.createdAt)}</TableCell>
                  <TableCell>
                    <PenggunaFormDialog
                      trigger={
                        <Button variant="ghost" size="sm">
                          Ubah
                        </Button>
                      }
                      baris={{
                        id: u.id,
                        nama: u.nama,
                        email: u.email,
                        peran: u.peran,
                        aktif: u.aktif,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        basePath="/master/pengguna"
        halaman={halaman}
        perHalaman={PER_HALAMAN}
        total={total}
        filters={{}}
      />
    </div>
  );
}

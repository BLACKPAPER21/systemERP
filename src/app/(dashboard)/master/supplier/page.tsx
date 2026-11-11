/* Halaman daftar Supplier — wilayah M1 (NF-19). Roles: owner, gudang, keuangan (§4.2). */
import { and, asc, count, eq, ilike, or, SQL } from "drizzle-orm";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { MitraFormDialog } from "@/components/shared/mitra-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

import { simpanSupplier } from "./actions";

const PER_HALAMAN = 10;

export default async function SupplierPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "gudang", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const halaman = Math.max(1, Number(sp.halaman ?? 1) || 1);

  const filters: SQL[] = [];
  if (q) {
    filters.push(or(ilike(suppliers.kode, `%${q}%`), ilike(suppliers.nama, `%${q}%`))!);
  }
  if (status === "aktif") filters.push(eq(suppliers.aktif, true));
  if (status === "nonaktif") filters.push(eq(suppliers.aktif, false));
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [baris, hitung] = await Promise.all([
    db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(asc(suppliers.kode))
      .limit(PER_HALAMAN)
      .offset((halaman - 1) * PER_HALAMAN),
    db.select({ total: count() }).from(suppliers).where(where),
  ]);

  const total = Number(hitung[0]?.total ?? 0);
  const bolehUbah = akses.sesi.peran === "owner";

  return (
    <div>
      <PageHeader
        judul="Master Supplier"
        deskripsi="Data supplier untuk modul Pembelian."
        aksi={
          bolehUbah ? (
            <MitraFormDialog
              trigger={<Button>Tambah Supplier</Button>}
              judul="Tambah Supplier"
              action={simpanSupplier}
            />
          ) : null
        }
      />

      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari kode atau nama supplier..."
          className="max-w-xs bg-background"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Status</TableHead>
              {bolehUbah ? <TableHead className="w-[90px]">Ubah</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.length === 0 ? (
              <TableRow>
                <TableCell colSpan={bolehUbah ? 6 : 5} className="text-center text-muted-foreground">
                  Belum ada supplier.
                </TableCell>
              </TableRow>
            ) : (
              baris.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.kode}</TableCell>
                  <TableCell>{s.nama}</TableCell>
                  <TableCell>{s.telepon ?? "—"}</TableCell>
                  <TableCell>{s.alamat ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.aktif ? "aktif" : "nonaktif"} />
                  </TableCell>
                  {bolehUbah ? (
                    <TableCell>
                      <MitraFormDialog
                        trigger={
                          <Button variant="ghost" size="sm">
                            Ubah
                          </Button>
                        }
                        judul="Ubah Supplier"
                        action={simpanSupplier}
                        readOnlyKode
                        baris={{
                          id: s.id,
                          kode: s.kode,
                          nama: s.nama,
                          telepon: s.telepon ?? "",
                          alamat: s.alamat ?? "",
                          aktif: s.aktif,
                        }}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        basePath="/master/supplier"
        halaman={halaman}
        perHalaman={PER_HALAMAN}
        total={total}
        filters={{ q, status }}
      />
    </div>
  );
}

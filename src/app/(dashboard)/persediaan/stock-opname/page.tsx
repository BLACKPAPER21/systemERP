
import { desc, eq, ilike } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { stockOpnames } from "@/db/schema/inventory";
import { users } from "@/db/schema/master";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAngka } from "@/lib/format";

export default async function StockOpnamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "gudang"]);

  if (!akses.ok) {
    return <AksesDitolak pesan={akses.pesan} />;
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const daftarOpname = await db
    .select({
      id: stockOpnames.id,
      nomor: stockOpnames.nomor,
      tanggal: stockOpnames.tanggal,
      status: stockOpnames.status,
      namaPencatat: users.nama,
    })
    .from(stockOpnames)
    .leftJoin(users, eq(stockOpnames.dicatatOleh, users.id))
    .where(q ? ilike(stockOpnames.nomor, `%${q}%`) : undefined)
    .orderBy(desc(stockOpnames.id));

  const totalDokumen = daftarOpname.length;

  const totalDraft = daftarOpname.filter(
    (item) => item.status === "draft",
  ).length;

  const totalPosted = daftarOpname.filter(
    (item) => item.status === "posted",
  ).length;

  return (
    <div>
      <PageHeader
        judul="Stock Opname"
        deskripsi="Catat hasil pemeriksaan fisik persediaan dan sesuaikan saldo stok berdasarkan hasil penghitungan."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatAngka(totalDokumen)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dokumen Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-yellow-600">
              {formatAngka(totalDraft)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dokumen Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">
              {formatAngka(totalPosted)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari nomor Stock Opname..."
            className="max-w-xs bg-background"
          />
          <Button type="submit" variant="outline">
            Cari
          </Button>
        </form>

        <Link
          href="/persediaan/stock-opname/baru"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        >
          + Buat Stock Opname
        </Link>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Dokumen</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Dicatat Oleh</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {daftarOpname.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Belum ada dokumen Stock Opname.
                </TableCell>
              </TableRow>
            ) : (
              daftarOpname.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.nomor}
                  </TableCell>

                  <TableCell>
                    {new Date(
                      `${item.tanggal}T00:00:00`,
                    ).toLocaleDateString("id-ID")}
                  </TableCell>

                  <TableCell>{item.namaPencatat ?? "-"}</TableCell>

                  <TableCell>
                    {item.status === "draft" ? (
                      <span className="inline-flex rounded-md border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Posted
                      </span>
                    )}
                  </TableCell>

                  <Link
  href={`/persediaan/stock-opname/${item.id}`}
  className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
>
  Detail
</Link>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

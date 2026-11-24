
import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
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
import { formatAngka, formatRupiah } from "@/lib/format";

export default async function SaldoStokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "gudang", "sales", "keuangan"]);

  if (!akses.ok) {
    return <AksesDitolak pesan={akses.pesan} />;
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const kondisiAktif = eq(products.aktif, true);

  const kondisi = q
    ? and(
        kondisiAktif,
        or(
          ilike(products.sku, `%${q}%`),
          ilike(products.nama, `%${q}%`),
        ),
      )
    : kondisiAktif;

  const daftarProduk = await db
    .select({
      id: products.id,
      sku: products.sku,
      nama: products.nama,
      satuan: products.satuan,
      stokSaatIni: products.stokSaatIni,
      stokMinimum: products.stokMinimum,
      hargaPokokRataRata: products.hargaPokokRataRata,
    })
    .from(products)
    .where(kondisi)
    .orderBy(asc(products.sku));

  const totalProduk = daftarProduk.length;

  const totalStok = daftarProduk.reduce(
    (total, produk) => total + Number(produk.stokSaatIni),
    0,
  );

  const stokMinimum = daftarProduk.filter(
    (produk) =>
      Number(produk.stokSaatIni) <= Number(produk.stokMinimum),
  ).length;

  return (
    <div>
      <PageHeader
        judul="Daftar Saldo Stok"
        deskripsi="Pantau jumlah persediaan, stok minimum, dan harga pokok rata-rata produk."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatAngka(totalProduk)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Kuantitas Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatAngka(totalStok)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produk Perlu Perhatian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">
              {formatAngka(stokMinimum)}
            </p>
          </CardContent>
        </Card>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari SKU atau nama produk..."
          className="max-w-xs bg-background"
        />
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead className="text-right">Harga Pokok Rata-rata</TableHead>
              <TableHead>Status Stok</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {daftarProduk.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada data produk.
                </TableCell>
              </TableRow>
            ) : (
              daftarProduk.map((produk) => {
                const stok = Number(produk.stokSaatIni);
                const minimum = Number(produk.stokMinimum);
                const perluRestok = stok <= minimum;

                return (
                  <TableRow key={produk.id}>
                    <TableCell className="font-medium">
                      {produk.sku}
                    </TableCell>
                    <TableCell>{produk.nama}</TableCell>
                    <TableCell>{produk.satuan}</TableCell>
                    <TableCell className="text-right">
                      {formatAngka(produk.stokSaatIni)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAngka(produk.stokMinimum)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(produk.hargaPokokRataRata)}
                    </TableCell>
                    <TableCell>
                      {perluRestok ? (
                        <span className="inline-flex rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Stok Minimum
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Aman
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
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

export default async function PeringatanStokPage() {
  const akses = await pageAccess(["owner", "gudang", "sales", "keuangan"]);

  if (!akses.ok) {
    return <AksesDitolak pesan={akses.pesan} />;
  }

  const semuaProduk = await db
    .select({
      id: products.id,
      sku: products.sku,
      nama: products.nama,
      satuan: products.satuan,
      stokSaatIni: products.stokSaatIni,
      stokMinimum: products.stokMinimum,
    })
    .from(products)
    .where(eq(products.aktif, true))
    .orderBy(asc(products.sku));

  const produkPerluPerhatian = semuaProduk
    .filter(
      (produk) =>
        Number(produk.stokSaatIni) <= Number(produk.stokMinimum),
    )
    .sort(
      (a, b) =>
        Number(a.stokSaatIni) - Number(b.stokSaatIni),
    );

  const stokHabis = produkPerluPerhatian.filter(
    (produk) => Number(produk.stokSaatIni) <= 0,
  ).length;

  const stokMenipis = produkPerluPerhatian.length - stokHabis;

  return (
    <div>
      <PageHeader
        judul="Peringatan Stok Minimum"
        deskripsi="Pantau produk yang stoknya sudah mencapai atau berada di bawah batas minimum."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produk Perlu Perhatian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {produkPerluPerhatian.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produk Kehabisan Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">
              {stokHabis}
            </p>
            <p className="text-xs text-muted-foreground">
              Produk dengan stok nol atau kurang
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-3">
        <h2 className="text-base font-semibold">
          Daftar Produk dengan Stok Minimum
        </h2>
        <p className="text-sm text-muted-foreground">
          Produk ditampilkan jika stok saat ini kurang dari atau sama dengan
          stok minimum.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead className="text-right">Kekurangan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {produkPerluPerhatian.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Tidak ada produk yang mencapai batas stok minimum.
                </TableCell>
              </TableRow>
            ) : (
              produkPerluPerhatian.map((produk) => {
                const stok = Number(produk.stokSaatIni);
                const minimum = Number(produk.stokMinimum);
                const kekurangan = Math.max(minimum - stok, 0);
                const habis = stok <= 0;

                return (
                  <TableRow key={produk.id}>
                    <TableCell>{produk.sku}</TableCell>
                    <TableCell className="font-medium">
                      {produk.nama}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAngka(produk.stokSaatIni)} {produk.satuan}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAngka(produk.stokMinimum)} {produk.satuan}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAngka(kekurangan)} {produk.satuan}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          habis
                            ? "font-medium text-red-600"
                            : "font-medium text-amber-600"
                        }
                      >
                        {habis ? "Stok Habis" : "Stok Menipis"}
                      </span>
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


import { CatatStokFisikForm } from "./catat-stok-fisik-form";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostingStockOpnameButton } from "./posting-stock-opname-button";
import { db } from "@/db";
import { products } from "@/db/schema/master";
import {
  stockOpnames,
  stockOpnameItems,
} from "@/db/schema/inventory";
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

export default async function DetailStockOpnamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const akses = await pageAccess(["owner", "gudang"]);

  if (!akses.ok) {
    return <AksesDitolak pesan={akses.pesan} />;
  }

  const { id } = await params;
  const opnameId = Number(id);

  if (!Number.isInteger(opnameId) || opnameId <= 0) {
    notFound();
  }

  const [opname] = await db
    .select()
    .from(stockOpnames)
    .where(eq(stockOpnames.id, opnameId))
    .limit(1);

  if (!opname) {
    notFound();
  }

  const daftarItem = await db
    .select({
      id: stockOpnameItems.id,
      productId: stockOpnameItems.productId,
      sku: products.sku,
      namaProduk: products.nama,
      satuan: products.satuan,
      qtySistem: stockOpnameItems.qtySistem,
      qtyFisik: stockOpnameItems.qtyFisik,
      selisih: stockOpnameItems.selisih,
    })
    .from(stockOpnameItems)
    .innerJoin(
      products,
      eq(stockOpnameItems.productId, products.id),
    )
    .where(eq(stockOpnameItems.opnameId, opnameId))
    .orderBy(asc(products.sku));
      const semuaProduk = await db
    .select({
      id: products.id,
      sku: products.sku,
      nama: products.nama,
      satuan: products.satuan,
      stokSaatIni: products.stokSaatIni,
    })
    .from(products)
    .where(eq(products.aktif, true))
    .orderBy(asc(products.sku));

  const produkSudahDicatat = new Set(
    daftarItem.map((item) => item.productId),
  );

  const produkTersedia = semuaProduk
    .filter((produk) => !produkSudahDicatat.has(produk.id))
    .map((produk) => ({
      ...produk,
      stokSaatIni: String(produk.stokSaatIni),
    }));

  return (
    <div>
      <PageHeader
        judul="Detail Stock Opname"
        deskripsi="Informasi dokumen dan hasil pemeriksaan fisik persediaan."
      />

      <div className="mb-4">
        <Link
          href="/persediaan/stock-opname"
          className="text-sm text-primary hover:underline"
        >
          ← Kembali ke daftar Stock Opname
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Nomor Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{opname.nomor}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {new Date(
                `${opname.tanggal}T00:00:00`,
              ).toLocaleDateString("id-ID")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Status Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={
                opname.status === "draft"
                  ? "rounded-md bg-yellow-100 px-2 py-1 text-sm font-medium text-yellow-800"
                  : "rounded-md bg-green-100 px-2 py-1 text-sm font-medium text-green-800"
              }
            >
              {opname.status === "draft" ? "Draft" : "Posted"}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="mb-3">
        <h2 className="text-lg font-semibold">
          Hasil Penghitungan Stok
        </h2>
        <p className="text-sm text-muted-foreground">
          Daftar produk yang sudah dicatat dalam dokumen ini.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok Sistem</TableHead>
              <TableHead className="text-right">Stok Fisik</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {daftarItem.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Belum ada produk yang dicatat.
                </TableCell>
              </TableRow>
            ) : (
              daftarItem.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell className="font-medium">
                    {item.namaProduk}
                  </TableCell>
                  <TableCell>{item.satuan}</TableCell>
                  <TableCell className="text-right">
                    {formatAngka(item.qtySistem)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAngka(item.qtyFisik)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAngka(item.selisih)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {opname.status === "draft" && (
  <>
    <section className="mt-6 space-y-3">
      <h2 className="text-lg font-semibold">
        Catat Stok Fisik
      </h2>

      <CatatStokFisikForm
        opnameId={opnameId}
        daftarProduk={produkTersedia}
      />
    </section>

    {daftarItem.length > 0 && (
      <section className="mt-6 rounded-lg border p-5 space-y-3">
        <h2 className="text-lg font-semibold">
          Posting Stock Opname
        </h2>

        <p className="text-sm text-muted-foreground">
          Posting akan memperbarui saldo stok berdasarkan hasil penghitungan fisik.
        </p>

        <PostingStockOpnameButton opnameId={opnameId} />
      </section>
    )}
  </>
  )}
  </div>
  );
}
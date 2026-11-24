
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
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
import { Button } from "@/components/ui/button";
import { formatAngka, formatRupiah } from "@/lib/format";

export default async function KartuStokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "gudang", "sales", "keuangan"]);

  if (!akses.ok) {
    return <AksesDitolak pesan={akses.pesan} />;
  }

  const sp = await searchParams;
  const idParam =
    typeof sp.productId === "string" ? Number(sp.productId) : undefined;

  const daftarProduk = await db
    .select({
      id: products.id,
      sku: products.sku,
      nama: products.nama,
      satuan: products.satuan,
    })
    .from(products)
    .where(eq(products.aktif, true))
    .orderBy(asc(products.sku));

  const produkTerpilih =
    daftarProduk.find((produk) => produk.id === idParam) ??
    daftarProduk[0];

  const pergerakan = produkTerpilih
    ? await db
        .select({
          id: stockMovements.id,
          tanggal: stockMovements.tanggal,
          tipe: stockMovements.tipe,
          qty: stockMovements.qty,
          hargaSatuan: stockMovements.hargaSatuan,
          saldoSetelah: stockMovements.saldoSetelah,
          refType: stockMovements.refType,
          refId: stockMovements.refId,
          keterangan: stockMovements.keterangan,
        })
        .from(stockMovements)
        .where(eq(stockMovements.productId, produkTerpilih.id))
        .orderBy(
          desc(stockMovements.tanggal),
          desc(stockMovements.id),
        )
    : [];

  const totalMasuk = pergerakan
    .filter((item) => item.tipe === "in")
    .reduce((total, item) => total + Number(item.qty), 0);

  const totalKeluar = pergerakan
    .filter((item) => item.tipe === "out")
    .reduce((total, item) => total + Math.abs(Number(item.qty)), 0);

  const saldoAkhir =
    pergerakan.length > 0
      ? pergerakan[0].saldoSetelah
      : "0";

  const labelTipe = (tipe: string) => {
    if (tipe === "in") return "Barang Masuk";
    if (tipe === "out") return "Barang Keluar";
    return "Penyesuaian";
  };

  const labelReferensi = (refType: string) => {
    if (refType === "goods_receipt") return "Penerimaan Barang";
    if (refType === "invoice") return "Penjualan";
    return "Stock Opname";
  };

  return (
    <div>
      <PageHeader
        judul="Kartu Stok"
        deskripsi="Riwayat pergerakan barang masuk, barang keluar, dan penyesuaian stok produk."
      />

      <form method="get" className="mb-6 flex flex-wrap gap-2">
        <select
          name="productId"
          defaultValue={produkTerpilih?.id.toString() ?? ""}
          className="h-10 min-w-64 rounded-md border bg-background px-3 text-sm"
          disabled={daftarProduk.length === 0}
        >
          {daftarProduk.length === 0 ? (
            <option value="">Belum ada produk</option>
          ) : (
            daftarProduk.map((produk) => (
              <option key={produk.id} value={produk.id}>
                {produk.sku} - {produk.nama}
              </option>
            ))
          )}
        </select>

        <Button type="submit" variant="outline" disabled={!produkTerpilih}>
          Tampilkan
        </Button>
      </form>

      {produkTerpilih ? (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {produkTerpilih.nama}
            </h2>
            <p className="text-sm text-muted-foreground">
              SKU: {produkTerpilih.sku} | Satuan: {produkTerpilih.satuan}
            </p>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Barang Masuk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600">
                  {formatAngka(totalMasuk)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Barang Keluar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-red-600">
                  {formatAngka(totalKeluar)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Akhir Tercatat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatAngka(saldoAkhir)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-3">
            <h2 className="text-base font-semibold">
              Riwayat Pergerakan Stok
            </h2>
            <p className="text-sm text-muted-foreground">
              Riwayat diurutkan dari transaksi terbaru.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis Transaksi</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Keluar</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pergerakan.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Belum ada riwayat pergerakan stok untuk produk ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  pergerakan.map((item) => {
                    const qty = Number(item.qty);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {new Date(item.tanggal).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell>
                          {labelTipe(item.tipe)}
                        </TableCell>
                        <TableCell>
                          {labelReferensi(item.refType)}
                          {" #"}
                          {item.refId}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {item.tipe === "in"
                            ? formatAngka(qty)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {item.tipe === "out"
                            ? formatAngka(Math.abs(qty))
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRupiah(item.hargaSatuan)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAngka(item.saldoSetelah)}
                        </TableCell>
                        <TableCell>
                          {item.keterangan || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-background p-8 text-center text-muted-foreground">
          Belum ada produk aktif yang dapat ditampilkan.
        </div>
      )}
    </div>
  );
}

/* Halaman daftar Produk — wilayah M1 (PRD §5.1, tata letak NF-19).
 * Kolom `stok_saat_ini` & `harga_pokok_rata_rata` hanya DIBACA (§8.2):
 * tidak ada input, tidak ada tulis — sepenuhnya milik M3.
 */
import { and, asc, count, eq, ilike, or, SQL } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
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
import { formatAngka, formatRupiah } from "@/lib/format";

import { ProdukFormDialog } from "./produk-form";

const PER_HALAMAN = 10;

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const akses = await pageAccess(["owner", "gudang", "sales", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const halaman = Math.max(1, Number(sp.halaman ?? 1) || 1);

  const filters: SQL[] = [];
  if (q) {
    filters.push(
      or(ilike(products.sku, `%${q}%`), ilike(products.nama, `%${q}%`))!,
    );
  }
  if (status === "aktif") filters.push(eq(products.aktif, true));
  if (status === "nonaktif") filters.push(eq(products.aktif, false));
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [baris, hitung] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(asc(products.sku))
      .limit(PER_HALAMAN)
      .offset((halaman - 1) * PER_HALAMAN),
    db.select({ total: count() }).from(products).where(where),
  ]);

  const total = Number(hitung[0]?.total ?? 0);
  const bolehUbah = akses.sesi.peran === "owner";

  return (
    <div>
      <PageHeader
        judul="Master Produk"
        deskripsi="Data produk: SKU, satuan, harga jual, dan stok minimum."
        aksi={
          bolehUbah ? (
            <ProdukFormDialog
              trigger={<Button>Tambah Produk</Button>}
            />
          ) : null
        }
      />

      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari SKU atau nama produk..."
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
              <TableHead>SKU</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead>Status</TableHead>
              {bolehUbah ? <TableHead className="w-[90px]">Ubah</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.length === 0 ? (
              <TableRow>
                <TableCell colSpan={bolehUbah ? 8 : 7} className="text-center text-muted-foreground">
                  Belum ada produk. Tambahkan produk pertama Anda.
                </TableCell>
              </TableRow>
            ) : (
              baris.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.sku}</TableCell>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell>{p.satuan}</TableCell>
                  <TableCell className="text-right">{formatRupiah(p.hargaJual)}</TableCell>
                  <TableCell className="text-right">{formatAngka(p.stokSaatIni)}</TableCell>
                  <TableCell className="text-right">{formatAngka(p.stokMinimum)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.aktif ? "aktif" : "nonaktif"} />
                  </TableCell>
                  {bolehUbah ? (
                    <TableCell>
                      <ProdukFormDialog
                        trigger={
                          <Button variant="ghost" size="sm">
                            Ubah
                          </Button>
                        }
                        baris={{
                          id: p.id,
                          sku: p.sku,
                          nama: p.nama,
                          satuan: p.satuan,
                          hargaJual: String(p.hargaJual),
                          stokMinimum: String(p.stokMinimum),
                          aktif: p.aktif,
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
        basePath="/master/produk"
        halaman={halaman}
        perHalaman={PER_HALAMAN}
        total={total}
        filters={{ q, status }}
      />
    </div>
  );
}

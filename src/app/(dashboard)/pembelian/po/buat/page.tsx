import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, suppliers } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { POForm } from "@/components/pembelian/po-form";

export default async function BuatPOPage() {
  const akses = await pageAccess(["owner"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;
  const [supplierList, productList] = await Promise.all([
    db.select({ id: suppliers.id, nama: suppliers.nama, kode: suppliers.kode }).from(suppliers).where(eq(suppliers.aktif, true)).orderBy(asc(suppliers.nama)),
    db.select({ id: products.id, nama: products.nama, sku: products.sku, satuan: products.satuan }).from(products).where(eq(products.aktif, true)).orderBy(asc(products.nama)),
  ]);
  return <div><PageHeader judul="Buat Pesanan Pembelian" deskripsi="PO tersimpan sebagai draft dan belum memengaruhi stok." /><POForm suppliers={supplierList} products={productList} /></div>;
}

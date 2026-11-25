
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import { BuatStockOpnameButton } from "./buat-button";

export default async function BuatStockOpnamePage() {
  const akses = await pageAccess(["owner", "gudang"]);

  if (!akses.ok) {
    return <AksesDitolak pesan={akses.pesan} />;
  }

  return (
    <div>
      <PageHeader
        judul="Buat Stock Opname"
        deskripsi="Buat dokumen pemeriksaan fisik persediaan sebelum melakukan pencatatan stok."
      />

      <div className="max-w-2xl rounded-lg border bg-background p-6">
        <h2 className="text-lg font-semibold">
          Dokumen Stock Opname Baru
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Sistem akan membuat nomor dokumen secara otomatis dan
          menggunakan tanggal saat dokumen dibuat.
        </p>

        <p className="mt-3 text-sm text-muted-foreground">
          Dokumen akan disimpan dengan status Draft. Setelah dibuat,
          Anda dapat memilih produk dan memasukkan hasil penghitungan
          stok fisik.
        </p>

        <div className="mt-6">
          <BuatStockOpnameButton />
        </div>
      </div>
    </div>
  );
}

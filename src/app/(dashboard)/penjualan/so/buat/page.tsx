import { getFormOptions } from "./actions";
import SOForm from "./so-form";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";

export const metadata = {
  title: "Buat Sales Order | SystemERP",
};

export default async function BuatSOPage() {
  // NF-3 — hanya owner & sales boleh membuat SO (PRD §3 matriks akses M4)
  const akses = await pageAccess(["owner", "sales"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  // Mengambil data pelanggan dan produk (Inventory) secara SSR (Server-Side)
  const masterData = await getFormOptions();

  return (
    <div className="max-w-6xl mx-auto py-6">
      {masterData.success ? (
        <SOForm masterData={masterData} />
      ) : (
        <div className="p-6 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center font-medium">
          Gagal memuat modul Master/Inventory. Pastikan koneksi database stabil.
        </div>
      )}
    </div>
  );
}
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  getPesananPenjualan,
  type OpsiPelangganSO,
  type PesananPenjualanItem,
} from "./actions";
import { Plus, FileText, DollarSign, ShoppingCart, Clock } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { SOTableClient } from "./so-table-client";

export const metadata = {
  title: "Sales Order | SystemERP",
};

export default async function PesananPenjualanPage() {
  const { data: pesanan, customers, ringkasan, error } = await getPesananPenjualan();
  const daftarPesanan = (pesanan || []) as PesananPenjualanItem[];
  const daftarCustomer = (customers || []) as OpsiPelangganSO[];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          judul="Sales Order (SO)"
          deskripsi="Kelola daftar pesanan penjualan, daftar bayar, sisa piutang, dan status pembayaran."
        />

        <Link href="/penjualan/so/buat" className="shrink-0">
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Buat SO Baru
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Nilai Transaksi (Confirmed+)</p>
            <h3 className="text-xl font-bold text-gray-900">
              {formatRupiah(Number(ringkasan?.totalPendapatan || 0))}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Dokumen SO</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {ringkasan?.totalPesanan || 0}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">SO Confirmed</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {ringkasan?.pesananConfirmed || 0}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">SO Draft</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {ringkasan?.pesananDraft || 0}
            </h3>
          </div>
        </div>
      </div>

      <SOTableClient data={daftarPesanan} customers={daftarCustomer} error={error} />
    </div>
  );
}
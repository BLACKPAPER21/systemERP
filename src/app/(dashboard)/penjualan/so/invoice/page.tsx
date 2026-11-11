import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getInvoices } from "./actions";
import { Search, FileText, Eye, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";

export const metadata = {
  title: "Daftar Invoice | SystemERP",
};

// Helper warna untuk status pembayaran
function getPaymentStatusProps(statusBayar: string) {
  switch (statusBayar) {
    case "lunas":
      return { status: "Aktif", label: "LUNAS" }; // Hijau
    case "belum":
      return { status: "Nonaktif", label: "BELUM BAYAR" }; // Merah
    default:
      return { status: "Menunggu", label: statusBayar };
  }
}

export default async function InvoicePage() {
  const { data: listInvoice, ringkasan, error } = await getInvoices();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <PageHeader 
        title="Faktur Penjualan (Invoice)" 
        description="Kelola tagihan pelanggan, pantau piutang, dan penerimaan pembayaran." 
      />

      {/* WIDGET ANALITIK KEUANGAN & PIUTANG */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <FileText className="h-6 w-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Nilai Tagihan</p>
            <h3 className="text-xl font-bold text-gray-900">
              {formatRupiah(Number(ringkasan?.totalTagihan || 0))}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            <AlertCircle className="h-6 w-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Piutang Berjalan (Belum Dibayar)</p>
            <h3 className="text-xl font-bold text-gray-900">
              {formatRupiah(Number(ringkasan?.totalPiutang || 0))}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            <CheckCircle className="h-6 w-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Penerimaan (Lunas)</p>
            <h3 className="text-xl font-bold text-gray-900">
              {formatRupiah(Number(ringkasan?.totalLunas || 0))}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <DollarSign className="h-6 w-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Menunggu Pembayaran</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {ringkasan?.jumlahUnpaid || 0} <span className="text-sm font-normal text-gray-500">dokumen</span>
            </h3>
          </div>
        </div>
      </div>

      {/* TABEL INVOICE */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input 
              type="text"
              placeholder="Cari Nomor Invoice atau Customer..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="outline">Filter Pembayaran</Button>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : listInvoice.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <FileText className="h-12 w-12 text-gray-300 mb-3"/>
            <p className="font-medium text-gray-900">Belum ada dokumen Invoice</p>
            <p className="text-sm mt-1">Invoice akan otomatis muncul di sini setelah Anda memproses SO (Sales Order).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Nomor Invoice</TableHead>
                  <TableHead>Tanggal Cetak</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                  <TableHead className="text-center">Pembayaran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listInvoice.map((row) => {
                  const payProps = getPaymentStatusProps(row.statusBayar);
                  const validPayStatus = payProps.status as "Aktif" | "Nonaktif" | "Menunggu" | "Proses";

                  return (
                    <TableRow className="hover:bg-gray-50" key={row.id}>
                      <TableCell>
                        <div className="font-medium text-indigo-600">{row.nomorInvoice}</div>
                        <div className="text-xs text-gray-500">Ref: {row.nomorSO}</div>
                      </TableCell>
                      <TableCell>
                        {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(row.tanggal))}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${new Date(row.jatuhTempo) < new Date() && row.statusBayar === "belum" ? "text-red-600" : "text-gray-900"}`}>
                          {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(row.jatuhTempo))}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {row.namaCustomer || "-"}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900 text-right">
                        {formatRupiah(Number(row.total))}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge label={payProps.label} status={validPayStatus}/>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/penjualan/invoice/${row.id}`}>
                            <Button size="icon" title="Lihat Tagihan" variant="outline" className="hover:bg-indigo-50 hover:text-indigo-600 border-indigo-200">
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
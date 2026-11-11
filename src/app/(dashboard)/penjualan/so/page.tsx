import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPesananPenjualan } from "./actions";
import { Plus, Search, FileText, Eye, MoreHorizontal, DollarSign, ShoppingCart, Clock } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";

export const metadata = {
  title: "Sales Order | SystemERP",
};

function getStatusProps(status: string) {
  switch (status) {
    case "invoiced":
      return { status: "Aktif", label: "Invoiced" };
    case "confirmed":
      return { status: "Proses", label: "Confirmed" };
    case "draft":
      return { status: "Menunggu", label: "Draft" };
    case "cancelled":
      return { status: "Nonaktif", label: "Cancelled" };
    default:
      return { status: "Menunggu", label: status };
  }
}

export default async function PesananPenjualanPage() {
  const { data: pesanan, ringkasan, error } = await getPesananPenjualan();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 
        HEADER DENGAN TOMBOL BUAT SO
        Jika komponen PageHeader Anda tidak mendukung children, 
        kita letakkan tombolnya di sampingnya menggunakan flexbox. 
      */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Sales Order (SO)" 
          description="Kelola daftar pesanan penjualan, dari draft hingga siap invoice." 
        />
        
        {/* INI ADALAH TOMBOL TAMBAH SO YANG DIINGINKAN */}
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
            <DollarSign className="h-6 w-6"/>
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
            <ShoppingCart className="h-6 w-6"/>
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
            <FileText className="h-6 w-6"/>
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
            <Clock className="h-6 w-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">SO Draft</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {ringkasan?.pesananDraft || 0}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input 
              type="text"
              placeholder="Cari Nomor SO atau Customer..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="outline">Filter Status</Button>
            <Button className="w-full sm:w-auto flex items-center gap-2" variant="outline">
              <FileText className="h-4 w-4"/>
              Export CSV
            </Button>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : pesanan.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <FileText className="h-12 w-12 text-gray-300 mb-3"/>
            <p className="font-medium text-gray-900">Belum ada dokumen Sales Order</p>
            <p className="text-sm mt-1">Buat dokumen SO pertama dengan menekan tombol "Buat SO Baru" di pojok kanan atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Nomor SO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pesanan.map((row) => {
                  const badgeProps = getStatusProps(row.status);
                  const validStatus = badgeProps.status as "Aktif" | "Nonaktif" | "Menunggu" | "Proses";

                  return (
                    <TableRow className="hover:bg-gray-50" key={row.id}>
                      <TableCell className="font-medium text-blue-600">
                        {row.nomor}
                      </TableCell>
                      <TableCell>
                        {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(row.tanggal))}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {row.namaCustomer || "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {formatRupiah(Number(row.total))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={badgeProps.label.toUpperCase()} status={validStatus}/>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {row.dibuatOleh || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          
                          {/* INI ADALAH TOMBOL DETAIL SO YANG DIPERBAIKI */}
                          <Link href={`/penjualan/so/${row.id}`}>
                            <Button size="icon" title="Lihat Detail SO" variant="ghost" className="hover:bg-blue-50 hover:text-blue-600">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <Button size="icon" title="Opsi Lainnya" variant="ghost">
                            <MoreHorizontal className="h-4 w-4 text-gray-600"/>
                          </Button>
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
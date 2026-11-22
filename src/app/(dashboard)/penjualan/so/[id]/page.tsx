import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDetailSO } from "./actions";
import { formatRupiah } from "@/lib/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SOActionButtons from "./action-buttons";
import { PrintPDFButton } from "./print-pdf-button";

export const metadata = {
  title: "Detail Sales Order | SystemERP",
};

export default async function DetailSOPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const soId = parseInt(resolvedParams.id, 10);

  const { success, data, error } = await getDetailSO(soId);

  if (!success || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="p-6 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center font-medium shadow-sm">
          {error || "Data Sales Order tidak ditemukan."}
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/penjualan/so">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar SO
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const serializedItems = (data.items || []).map((item) => ({
    id: item.id,
    productId: item.productId,
    namaProduk: item.namaProduk ?? "Produk Tidak Dikenal",
    hargaSatuan: String(item.hargaSatuan ?? 0),
    qty: String(item.qty ?? 0),
    subtotal: String(item.subtotal ?? 0),
  }));

  const serializedInvoice = data.invoice
    ? {
        id: data.invoice.id,
        nomor: String(data.invoice.nomor ?? ""),
        tanggal: String(data.invoice.tanggal ?? ""),
        jatuhTempo: String(data.invoice.jatuhTempo ?? ""),
        total: String(data.invoice.total ?? data.total ?? 0),
        status: String(data.invoice.status ?? ""),
        statusBayar: String(data.invoice.statusBayar ?? "belum"),
      }
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <PageHeader
        judul={`Detail SO: ${data.nomor}`}
        deskripsi="Rincian informasi dokumen Sales Order."
        aksi={
          <>
            <PrintPDFButton data={{ ...data, items: serializedItems }} />
            <Link href="/penjualan/so">
              <Button variant="outline" className="flex items-center gap-2 bg-gray-50">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>
            </Link>
          </>
        }
      />

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 border-b bg-gray-50/50">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Nomor SO</p>
            <p className="font-medium text-gray-900">{data.nomor}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Tanggal</p>
            <p className="font-medium text-gray-900">
              {new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(data.tanggal))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Pelanggan</p>
            <p className="font-medium text-blue-600">{data.namaCustomer || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Status Dokumen</p>
            <StatusBadge status={data.status} />
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Rincian Barang / Produk</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100/50">
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-center w-24">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serializedItems.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-500">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.namaProduk || "Produk Tidak Dikenal"}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-gray-600">
                      {formatRupiah(Number(item.hargaSatuan))}
                    </TableCell>
                    <TableCell className="text-center font-medium bg-gray-50/50">{Number(item.qty)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-gray-900">
                      {formatRupiah(Number(item.subtotal))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <SOActionButtons
            soId={data.id}
            nomorSO={data.nomor}
            tanggalSO={String(data.tanggal)}
            namaCustomer={data.namaCustomer}
            totalSO={String(data.total)}
            items={serializedItems}
            invoice={serializedInvoice}
            status={data.status}
          />

          <div className="text-right bg-white p-4 rounded-xl border shadow-sm w-full md:w-auto min-w-[250px]">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Tagihan SO</p>
            <h2 className="text-3xl font-bold text-blue-600">
              {formatRupiah(Number(data.total))}
            </h2>
          </div>
        </div>

        <div className="px-6 py-3 border-t bg-gray-100 text-xs text-gray-400 text-right">
          Dokumen dibuat oleh: {data.dibuatOleh || "Sistem"}
        </div>
      </div>
    </div>
  );
}
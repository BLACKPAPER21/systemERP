"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, XCircle } from "lucide-react";
import { confirmSO, generateInvoiceAndCutStock } from "./actions";

interface SOActionButtonsProps {
  soId: number;
  status: string;
}

export default function SOActionButtons({ soId, status }: SOActionButtonsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Handler Konfirmasi SO
  const handleConfirm = async () => {
    const isSure = window.confirm(
      "Apakah Anda yakin ingin mengkonfirmasi Sales Order ini?\n\nSetelah dikonfirmasi, dokumen ini akan dikunci dan siap untuk diteruskan menjadi Invoice & pemotongan stok gudang."
    );
    
    if (!isSure) return;

    setIsLoading(true);
    const res = await confirmSO(soId);
    setIsLoading(false);

    if (res.success) {
      alert("Status SO berhasil diubah menjadi CONFIRMED!");
      router.refresh();
    } else {
      alert(res.error || "Gagal mengkonfirmasi.");
    }
  };

  // Handler Generate Invoice & Potong Stok
  const handleGenerateInvoice = async () => {
    const isSure = window.confirm(
      "PERHATIAN: Memproses ke Invoice akan secara otomatis MEMOTONG STOK FISIK di gudang sejumlah pesanan ini.\n\nLanjutkan proses?"
    );

    if (!isSure) return;

    setIsLoading(true);
    const res = await generateInvoiceAndCutStock(soId);
    setIsLoading(false);

    if (res.success) {
      alert("BERHASIL! Invoice telah diterbitkan dan Stok Gudang telah terpotong otomatis.");
      router.refresh();
    } else {
      // Menampilkan alert spesifik, misalnya jika stok barang minus
      alert(`GAGAL MEMPROSES:\n\n${res.error}`);
    }
  };

  return (
    <div className="flex gap-3">
      {status === "draft" && (
        <>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {isLoading ? "Memproses..." : "Konfirmasi SO"}
          </Button>
          <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Batalkan SO
          </Button>
        </>
      )}

      {status === "confirmed" && (
        <Button 
          onClick={handleGenerateInvoice}
          disabled={isLoading}
          variant="outline" 
          className="border-green-500 text-green-700 hover:bg-green-50 flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          {isLoading ? "Memotong Stok..." : "Proses ke Invoice & Surat Jalan"}
        </Button>
      )}
      
      {status === "invoiced" && (
        <div className="text-sm font-medium text-green-700 px-4 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Invoice & Pemotongan Stok Selesai
        </div>
      )}
    </div>
  );
}
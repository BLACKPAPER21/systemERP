"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Printer, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { confirmSO, generateInvoiceAndCutStock } from "./actions";

export interface InvoiceInfoCetak {
  id: number;
  nomor: string;
  tanggal: Date | string;
  jatuhTempo: Date | string;
  total: number | string;
  status: string;
  statusBayar: string;
}

export interface ItemCetakInvoice {
  id: number | string;
  productId?: number | string | null;
  namaProduk?: string | null;
  hargaSatuan: number | string;
  qty: number | string;
  subtotal: number | string;
}

interface SOActionButtonsProps {
  soId: number;
  nomorSO: string;
  tanggalSO: Date | string;
  namaCustomer?: string | null;
  totalSO: number | string;
  items: ItemCetakInvoice[];
  invoice?: InvoiceInfoCetak | null;
  status: string;
}

function escapeHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTanggalID(val: Date | string): string {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d);
}

function toSafeNumber(val: unknown): number {
  const num = Number(val ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export default function SOActionButtons({
  soId,
  nomorSO,
  tanggalSO,
  namaCustomer,
  totalSO,
  items,
  invoice,
  status,
}: SOActionButtonsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
      alert(`GAGAL MEMPROSES:\n\n${res.error}`);
    }
  };

  const handleCetakInvoice = () => {
    const safeItems = Array.isArray(items) ? items : [];
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      alert("Izinkan pop-up browser terlebih dahulu untuk mencetak invoice.");
      return;
    }

    const nomorInv = invoice?.nomor || `INV-${nomorSO}`;
    const tglInv = invoice?.tanggal ? formatTanggalID(invoice.tanggal) : formatTanggalID(tanggalSO);
    const jatuhTempoInv = invoice?.jatuhTempo ? formatTanggalID(invoice.jatuhTempo) : "-";
    const nominalInv = toSafeNumber(invoice?.total ?? totalSO ?? 0);
    const isLunas = invoice?.statusBayar === "lunas";
    const statusBayarInv = isLunas ? "Lunas" : "Belum Lunas";

    const rowsHtml =
      safeItems.length > 0
        ? safeItems
            .map((item, idx) => {
              const hargaSatuanNum = toSafeNumber(item.hargaSatuan);
              const qtyNum = toSafeNumber(item.qty);
              const subtotalNum =
                item.subtotal !== undefined && item.subtotal !== null
                  ? toSafeNumber(item.subtotal)
                  : hargaSatuanNum * qtyNum;
              const namaProdukText =
                typeof item.namaProduk === "string" && item.namaProduk.trim() !== ""
                  ? item.namaProduk.trim()
                  : `Produk #${escapeHtml(item.productId ?? item.id ?? idx + 1)}`;

              return `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td>${escapeHtml(namaProdukText)}</td>
                  <td style="text-align:right;font-family:monospace;">${escapeHtml(
                    formatRupiah(hargaSatuanNum)
                  )}</td>
                  <td style="text-align:center;">${escapeHtml(qtyNum)}</td>
                  <td style="text-align:right;font-family:monospace;font-weight:600;">${escapeHtml(
                    formatRupiah(subtotalNum)
                  )}</td>
                </tr>
              `;
            })
            .join("")
        : `
          <tr>
            <td colspan="5" style="text-align:center;color:#6b7280;padding:14px;">
              Tidak ada item produk pada dokumen ini.
            </td>
          </tr>
        `;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${escapeHtml(nomorInv)}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 28px; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #15803d; padding-bottom: 14px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
          .subtitle { font-size: 12px; color: #6b7280; margin: 0; }
          .badge-lunas { display: inline-block; padding: 4px 10px; border-radius: 6px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-belum { display: inline-block; padding: 4px 10px; border-radius: 6px; background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px; }
          .meta-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 2px; }
          .meta-value { font-size: 13px; font-weight: 600; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
          th { background: #f3f4f6; text-align: left; font-weight: 700; }
          .summary-box { margin-left: auto; width: 280px; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 16px; background: #f9fafb; text-align: right; }
          .summary-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
          .summary-total { font-size: 20px; font-weight: 700; color: #15803d; }
          .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: right; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">INVOICE PENJUALAN</h1>
            <p class="subtitle">Nomor Invoice: <strong>${escapeHtml(nomorInv)}</strong> &bull; Ref SO: <strong>${escapeHtml(nomorSO)}</strong></p>
          </div>
          <span class="${isLunas ? "badge-lunas" : "badge-belum"}">${escapeHtml(statusBayarInv)}</span>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Pelanggan</div>
            <div class="meta-value">${escapeHtml(namaCustomer || "-")}</div>
          </div>
          <div>
            <div class="meta-label">Tanggal Invoice</div>
            <div class="meta-value">${escapeHtml(tglInv)}</div>
          </div>
          <div>
            <div class="meta-label">Jatuh Tempo</div>
            <div class="meta-value">${escapeHtml(jatuhTempoInv)}</div>
          </div>
          <div>
            <div class="meta-label">Status Pembayaran</div>
            <div class="meta-value">${escapeHtml(statusBayarInv)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:44px;text-align:center;">No</th>
              <th>Nama Produk</th>
              <th style="text-align:right;">Harga Satuan</th>
              <th style="width:70px;text-align:center;">Qty</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-label">Total Tagihan Invoice</div>
          <div class="summary-total">${escapeHtml(formatRupiah(nominalInv))}</div>
        </div>

        <div class="footer">
          Dicetak pada: ${escapeHtml(new Date().toLocaleString("id-ID"))}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
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
        <>
          <div className="text-sm font-medium text-green-700 px-4 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Invoice &amp; Pemotongan Stok Selesai
          </div>
          <Button
            type="button"
            onClick={handleCetakInvoice}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Cetak Invoice
          </Button>
        </>
      )}
    </div>
  );
}
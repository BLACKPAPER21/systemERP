"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export interface DetailSOItemPrint {
  id: number | string;
  namaProduk?: string | null;
  hargaSatuan: number | string;
  qty: number | string;
  subtotal: number | string;
}

export interface DetailSOPrintData {
  id: number | string;
  nomor: string;
  tanggal: Date | string;
  status: string;
  total: number | string;
  namaCustomer?: string | null;
  dibuatOleh?: string | null;
  items: DetailSOItemPrint[];
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

export function PrintPDFButton({ data }: { data: DetailSOPrintData }) {
  const handlePrintPDF = () => {
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      alert("Izinkan pop-up browser terlebih dahulu untuk mencetak atau menyimpan PDF.");
      return;
    }

    const itemsRows = (data.items || [])
      .map(
        (item, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${escapeHtml(item.namaProduk || "Produk Tidak Dikenal")}</td>
            <td style="text-align:right;font-family:monospace;">${escapeHtml(
              formatRupiah(Number(item.hargaSatuan || 0))
            )}</td>
            <td style="text-align:center;">${escapeHtml(Number(item.qty || 0))}</td>
            <td style="text-align:right;font-family:monospace;font-weight:600;">${escapeHtml(
              formatRupiah(Number(item.subtotal || 0))
            )}</td>
          </tr>
        `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sales Order - ${escapeHtml(data.nomor)}</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            padding: 28px;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1d4ed8;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 24px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .meta-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #6b7280;
            font-weight: 700;
            margin-bottom: 2px;
          }
          .meta-value {
            font-size: 13px;
            font-weight: 600;
            color: #111827;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            font-size: 12px;
          }
          th {
            background: #f3f4f6;
            text-align: left;
            font-weight: 700;
          }
          .summary-box {
            margin-left: auto;
            width: 280px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 12px 16px;
            background: #f9fafb;
            text-align: right;
          }
          .summary-label {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .summary-total {
            font-size: 20px;
            font-weight: 700;
            color: #1d4ed8;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
            text-align: right;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">SALES ORDER</h1>
            <p class="subtitle">Nomor Dokumen: <strong>${escapeHtml(data.nomor)}</strong></p>
          </div>
          <span class="badge">${escapeHtml(data.status)}</span>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Pelanggan</div>
            <div class="meta-value">${escapeHtml(data.namaCustomer || "-")}</div>
          </div>
          <div>
            <div class="meta-label">Tanggal Transaksi</div>
            <div class="meta-value">${escapeHtml(formatTanggalID(data.tanggal))}</div>
          </div>
          <div>
            <div class="meta-label">Nomor Sales Order</div>
            <div class="meta-value">${escapeHtml(data.nomor)}</div>
          </div>
          <div>
            <div class="meta-label">Dibuat Oleh</div>
            <div class="meta-value">${escapeHtml(data.dibuatOleh || "Sistem")}</div>
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
            ${itemsRows}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-label">Total Tagihan SO</div>
          <div class="summary-total">${escapeHtml(formatRupiah(Number(data.total || 0)))}</div>
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
    <Button
      type="button"
      variant="outline"
      onClick={handlePrintPDF}
      className="flex items-center gap-2"
    >
      <Printer className="h-4 w-4" /> Cetak PDF
    </Button>
  );
}
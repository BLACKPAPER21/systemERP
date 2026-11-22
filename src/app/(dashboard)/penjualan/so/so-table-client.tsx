"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Search,
  FileText,
  Eye,
  Filter,
  Download,
  ChevronDown,
  RotateCcw,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { SOActionMenu } from "./so-action-menu";
import type { OpsiPelangganSO, PesananPenjualanItem } from "./actions";

interface SOTableClientProps {
  data: PesananPenjualanItem[];
  customers: OpsiPelangganSO[];
  error?: string;
}

function formatTanggalID(val: Date | string, style: "medium" | "short" = "medium"): string {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: style }).format(d);
}

function toDateOnlyString(val: Date | string): string {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function escapeCsv(val: unknown): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ringkasDaftarBayar(row: PesananPenjualanItem): string {
  if (!row.daftarBayar || row.daftarBayar.length === 0) {
    return `${formatRupiah(Number(row.totalBayar || 0))} (Belum ada pembayaran)`;
  }
  const detail = row.daftarBayar
    .map((b) => {
      const tgl = b.tanggal ? `${formatTanggalID(b.tanggal, "short")}: ` : "";
      const met = b.metode ? ` [${b.metode}]` : "";
      return `${tgl}${formatRupiah(Number(b.nominal || 0))}${met}`;
    })
    .join("; ");
  return `${formatRupiah(Number(row.totalBayar || 0))} — ${detail}`;
}

export function SOTableClient({ data, customers, error }: SOTableClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusBayarFilter, setStatusBayarFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [tanggalDari, setTanggalDari] = useState("");
  const [tanggalSampai, setTanggalSampai] = useState("");

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [exportMenuOpen]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach((row) => {
      if (row.status) set.add(row.status);
    });
    return Array.from(set);
  }, [data]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return data.filter((row) => {
      if (q) {
        const matchNomor = (row.nomor || "").toLowerCase().includes(q);
        const matchCustomer = (row.namaCustomer || "").toLowerCase().includes(q);
        const matchUser = (row.dibuatOleh || "").toLowerCase().includes(q);
        const matchStatus = (row.status || "").toLowerCase().includes(q);
        const matchBayar = (row.statusPelunasan || "").toLowerCase().includes(q);
        if (!matchNomor && !matchCustomer && !matchUser && !matchStatus && !matchBayar) {
          return false;
        }
      }

      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (statusBayarFilter !== "all") {
        const pelunasan = row.statusPelunasan || "Belum Lunas";
        if (pelunasan !== statusBayarFilter) return false;
      }

      if (customerFilter !== "all") {
        if (String(row.customerId ?? "") !== customerFilter) return false;
      }

      const rowDate = toDateOnlyString(row.tanggal);
      if (tanggalDari && rowDate && rowDate < tanggalDari) {
        return false;
      }
      if (tanggalSampai && rowDate && rowDate > tanggalSampai) {
        return false;
      }

      return true;
    });
  }, [
    data,
    searchQuery,
    statusFilter,
    statusBayarFilter,
    customerFilter,
    tanggalDari,
    tanggalSampai,
  ]);

  const hasActiveFilter =
    statusFilter !== "all" ||
    statusBayarFilter !== "all" ||
    customerFilter !== "all" ||
    Boolean(tanggalDari) ||
    Boolean(tanggalSampai) ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStatusBayarFilter("all");
    setCustomerFilter("all");
    setTanggalDari("");
    setTanggalSampai("");
  };

  const handleExportCSV = () => {
    setExportMenuOpen(false);
    const headers = [
      "Nomor SO",
      "Tanggal",
      "Customer",
      "Total Nilai",
      "Total Bayar",
      "Daftar Bayar",
      "Sisa Piutang",
      "Status",
      "Status Bayar",
      "Dibuat Oleh",
    ];

    const lines = [
      headers.map(escapeCsv).join(","),
      ...filteredData.map((row) =>
        [
          row.nomor,
          formatTanggalID(row.tanggal, "medium"),
          row.namaCustomer || "-",
          Number(row.total || 0),
          Number(row.totalBayar || 0),
          ringkasDaftarBayar(row),
          Number(row.sisaPiutang ?? row.total ?? 0),
          row.status,
          row.statusPelunasan || "Belum Lunas",
          row.dibuatOleh || "-",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-order-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDOCS = () => {
    setExportMenuOpen(false);
    const rowsHtml = filteredData
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.nomor)}</td>
            <td>${escapeHtml(formatTanggalID(row.tanggal, "medium"))}</td>
            <td>${escapeHtml(row.namaCustomer || "-")}</td>
            <td style="text-align:right;">${escapeHtml(formatRupiah(Number(row.total || 0)))}</td>
            <td>${escapeHtml(ringkasDaftarBayar(row))}</td>
            <td style="text-align:right;">${escapeHtml(
              formatRupiah(Number(row.sisaPiutang ?? row.total ?? 0))
            )}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(row.statusPelunasan || "Belum Lunas")}</td>
            <td>${escapeHtml(row.dibuatOleh || "-")}</td>
          </tr>
        `
      )
      .join("");

    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Laporan Sales Order</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; }
          h2 { margin-bottom: 4px; }
          p { color: #6b7280; font-size: 9.5pt; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 9pt; vertical-align: top; }
          th { background-color: #f3f4f6; text-align: left; }
        </style>
      </head>
      <body>
        <h2>Laporan Sales Order (SO)</h2>
        <p>Dicetak pada: ${escapeHtml(new Date().toLocaleString("id-ID"))} &bull; Total baris: ${filteredData.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nomor SO</th>
              <th>Tanggal</th>
              <th>Customer</th>
              <th>Total Nilai</th>
              <th>Daftar Bayar</th>
              <th>Sisa Piutang</th>
              <th>Status</th>
              <th>Status Bayar</th>
              <th>Dibuat Oleh</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + docHtml], {
      type: "application/msword;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-order-${new Date().toISOString().split("T")[0]}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setExportMenuOpen(false);
    const printWin = window.open("", "_blank", "width=960,height=680");
    if (!printWin) {
      alert("Izinkan pop-up browser terlebih dahulu untuk mencetak/menyimpan PDF.");
      return;
    }

    const rowsHtml = filteredData
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.nomor)}</td>
            <td>${escapeHtml(formatTanggalID(row.tanggal, "medium"))}</td>
            <td>${escapeHtml(row.namaCustomer || "-")}</td>
            <td style="text-align:right;">${escapeHtml(formatRupiah(Number(row.total || 0)))}</td>
            <td>${escapeHtml(ringkasDaftarBayar(row))}</td>
            <td style="text-align:right;">${escapeHtml(
              formatRupiah(Number(row.sisaPiutang ?? row.total ?? 0))
            )}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(row.statusPelunasan || "Belum Lunas")}</td>
            <td>${escapeHtml(row.dibuatOleh || "-")}</td>
          </tr>
        `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sales Order - PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
          h2 { margin: 0 0 4px 0; }
          p { margin: 0 0 14px 0; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; vertical-align: top; }
          th { background: #f1f5f9; text-align: left; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h2>Laporan Sales Order (SO)</h2>
        <p>Tanggal cetak: ${escapeHtml(new Date().toLocaleString("id-ID"))} | Jumlah data: ${filteredData.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nomor SO</th>
              <th>Tanggal</th>
              <th>Customer</th>
              <th>Total Nilai</th>
              <th>Daftar Bayar</th>
              <th>Sisa Piutang</th>
              <th>Status</th>
              <th>Status Bayar</th>
              <th>Dibuat Oleh</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
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
    <div className="bg-white border rounded-xl shadow-sm overflow-visible">
      {/* BAR PENCARIAN, FILTER & EXPORT */}
      <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nomor SO, Customer, User..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant={showFilters || hasActiveFilter ? "default" : "outline"}
            onClick={() => setShowFilters((prev) => !prev)}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter Kolom
            {hasActiveFilter && (
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[11px]">
                Aktif
              </span>
            )}
          </Button>

          {hasActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              className="w-full sm:w-auto flex items-center gap-1.5 text-gray-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}

          {/* DROPDOWN EXPORT: PDF, CSV, DOCS */}
          <div className="relative w-full sm:w-auto" ref={exportRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 origin-top-right rounded-lg border bg-white shadow-lg ring-1 ring-black/5 z-50 py-1">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="h-4 w-4 text-rose-600" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDOCS}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Export DOCS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL FILTER MULTI-KOLOM */}
      {showFilters && (
        <div className="p-4 bg-gray-50/80 border-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600">Status Dokumen</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600">Status Bayar</label>
            <select
              value={statusBayarFilter}
              onChange={(e) => setStatusBayarFilter(e.target.value)}
              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status Bayar</option>
              <option value="Lunas">Lunas</option>
              <option value="Belum Lunas">Belum Lunas</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600">Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600">Tanggal Dari</label>
            <input
              type="date"
              value={tanggalDari}
              onChange={(e) => setTanggalDari(e.target.value)}
              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600">Tanggal Sampai</label>
            <input
              type="date"
              value={tanggalSampai}
              onChange={(e) => setTanggalSampai(e.target.value)}
              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* KONTEN TABEL */}
      {error ? (
        <div className="p-8 text-center text-red-500 font-medium">{error}</div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="font-medium text-gray-900">
            {data.length === 0
              ? "Belum ada dokumen Sales Order"
              : "Tidak ada data Sales Order yang cocok dengan filter"}
          </p>
          <p className="text-sm mt-1">
            {data.length === 0
              ? 'Buat dokumen SO pertama dengan menekan tombol "Buat SO Baru" di pojok kanan atas.'
              : "Coba ubah atau reset kriteria filter kolom."}
          </p>
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
                <TableHead>Daftar Bayar</TableHead>
                <TableHead>Sisa Piutang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Status Bayar</TableHead>
                <TableHead>Dibuat Oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => {
                const isLunas = row.statusPelunasan === "Lunas";

                return (
                  <TableRow className="hover:bg-gray-50 align-top" key={row.id}>
                    <TableCell className="font-medium text-blue-600">{row.nomor}</TableCell>
                    <TableCell>{formatTanggalID(row.tanggal, "medium")}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {row.namaCustomer || "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {formatRupiah(Number(row.total))}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-semibold text-gray-800">
                        {formatRupiah(Number(row.totalBayar || 0))}
                      </div>
                      {row.daftarBayar && row.daftarBayar.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                          {row.daftarBayar.map((bayar) => (
                            <li key={String(bayar.id)}>
                              {bayar.tanggal ? `${formatTanggalID(bayar.tanggal, "short")}: ` : ""}
                              {formatRupiah(Number(bayar.nominal || 0))}
                              {bayar.metode ? ` (${bayar.metode})` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-gray-400">Belum ada pembayaran</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {formatRupiah(Number(row.sisaPiutang ?? row.total))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          isLunas
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {row.statusPelunasan || "Belum Lunas"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {row.dibuatOleh || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <Link href={`/penjualan/so/${row.id}`}>
                          <Button
                            size="icon"
                            title="Lihat Detail SO"
                            variant="ghost"
                            className="hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        <SOActionMenu row={row} customers={customers} />
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
  );
}
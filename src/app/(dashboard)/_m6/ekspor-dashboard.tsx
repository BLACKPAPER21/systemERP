"use client";

/* MILIK M6 — Tombol ekspor ringkasan dashboard (Excel .xlsx bergaris & Cetak PDF).
 * Menghasilkan workbook .xlsx asli dengan kolom proporsional, border tabel,
 * header berwarna, baris selang-seling, baris Total, serta sheet rincian ber-AutoFilter.
 */
import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  STATUS_LABEL,
  formatAngka,
  formatRupiah,
  formatTanggal,
} from "@/lib/format";

import type { TitikGrafik } from "./grafik-arus";
import {
  bangunWorkbookXlsx,
  type BarisExcel,
  type DefinisiSheet,
  type GayaSel,
  type SelExcel,
} from "./xlsx-ringkas";

export type BarisTransaksiEkspor = {
  nomor: string;
  jenis: string;
  pihak: string;
  tanggal: string;
  nilai: number;
  status: string;
  arah: "masuk" | "keluar";
};

export type DataEksporDashboard = {
  kodePeriode: string;
  labelPeriode: string;
  awal: string;
  akhir: string;
  dicetakOleh: string;
  peran: string;
  filterCari: string;
  filterJenisLabel: string;
  kpi: {
    penjualanKini: number;
    penjualanLalu: number;
    hppKini: number;
    bebanKini: number;
    labaKini: number;
    labaLalu: number;
    totalPembelian: number;
    totalPiutang: number;
    jumlahPiutang: number;
    invoiceJatuhTempo: number;
    totalHutang: number;
    jumlahHutang: number;
    nilaiPersediaan: number;
    jumlahProduk: number;
  };
  grafik: TitikGrafik[];
  perluTindakan: { label: string; jumlah: number }[];
  transaksi: BarisTransaksiEkspor[];
};

function escapeHtml(nilai: unknown): string {
  return String(nilai ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sel(nilai: string | number | null, gaya: GayaSel): SelExcel {
  return { nilai, gaya };
}

/** Buat baris penuh yang digabung (merged) dengan border utuh di seluruh kolom. */
function barisGabungPenuh(
  teks: string,
  jumlahKolom: number,
  gaya: GayaSel,
  tinggi: number,
): BarisExcel {
  return {
    tinggi,
    sel: Array.from({ length: jumlahKolom }, (_, i) =>
      sel(i === 0 ? teks : null, gaya),
    ),
  };
}

export function susunSheetsDashboard(
  data: DataEksporDashboard,
  waktuEkspor: string,
): DefinisiSheet[] {
  const { kpi } = data;
  const rentangTeks = `${data.labelPeriode} (${formatTanggal(data.awal)} – ${formatTanggal(data.akhir)})`;
  const infoFilter =
    data.filterCari || data.filterJenisLabel !== "Semua jenis"
      ? `  |  Filter: ${data.filterJenisLabel}${data.filterCari ? ` ("${data.filterCari}")` : ""}`
      : "";
  const subJudul = `Periode: ${rentangTeks}  |  Dicetak oleh: ${data.dicetakOleh} (${data.peran})  |  Waktu: ${waktuEkspor}${infoFilter}`;

  /* ================================================================ */
  /* SHEET 1 — Ringkasan Dashboard (7 kolom simetris A..G)            */
  /* ================================================================ */
  const barisS1: BarisExcel[] = [];
  const gabungS1: string[] = [];

  const tambahBaris = (b: BarisExcel) => {
    barisS1.push(b);
    return barisS1.length; // nomor baris berbasis 1
  };

  // Banner judul
  const rJudul = tambahBaris(
    barisGabungPenuh(
      "LAPORAN RINGKASAN DASHBOARD — SYSTEMERP",
      7,
      "bannerJudul",
      28,
    ),
  );
  gabungS1.push(`A${rJudul}:G${rJudul}`);

  const rSub = tambahBaris(barisGabungPenuh(subJudul, 7, "bannerSub", 20));
  gabungS1.push(`A${rSub}:G${rSub}`);

  tambahBaris({ tinggi: 10, sel: [] });

  // ---- Tabel 1: KPI ----
  const rSeksiKpi = tambahBaris(
    barisGabungPenuh(
      "1. INDIKATOR KINERJA UTAMA (KPI)",
      7,
      "judulSeksi",
      22,
    ),
  );
  gabungS1.push(`A${rSeksiKpi}:G${rSeksiKpi}`);

  const rThKpi = tambahBaris({
    tinggi: 22,
    sel: [
      sel("No", "thTengah"),
      sel("Indikator KPI", "thKiri"),
      sel(null, "thKiri"),
      sel("Keterangan / Pembanding", "thKiri"),
      sel(null, "thKiri"),
      sel("Nilai (Rp)", "thKanan"),
      sel("Ringkasan", "thTengah"),
    ],
  });
  gabungS1.push(`B${rThKpi}:C${rThKpi}`, `D${rThKpi}:E${rThKpi}`);

  const daftarKpi: [string, string, number, string][] = [
    [
      `Penjualan (${data.labelPeriode})`,
      `Periode sebelumnya: ${formatRupiah(kpi.penjualanLalu)}`,
      kpi.penjualanKini,
      rentangTeks,
    ],
    [
      `Harga Pokok Penjualan (HPP)`,
      "Total HPP dari invoice yang telah diposting",
      kpi.hppKini,
      rentangTeks,
    ],
    [
      "Beban Operasional",
      "Akun beban operasional (5-200) pada periode terpilih",
      kpi.bebanKini,
      rentangTeks,
    ],
    [
      `Laba Bersih (${data.labelPeriode})`,
      `Periode sebelumnya: ${formatRupiah(kpi.labaLalu)}`,
      kpi.labaKini,
      kpi.labaKini >= 0 ? "Laba" : "Rugi",
    ],
    [
      `Pembelian Tercatat (${data.labelPeriode})`,
      "Total penerimaan barang yang diposting",
      kpi.totalPembelian,
      rentangTeks,
    ],
    [
      "Total Piutang Belum Lunas",
      `${formatAngka(kpi.invoiceJatuhTempo)} invoice lewat jatuh tempo`,
      kpi.totalPiutang,
      `${formatAngka(kpi.jumlahPiutang)} invoice`,
    ],
    [
      "Total Hutang Belum Dibayar",
      "Penerimaan barang berstatus belum dibayar",
      kpi.totalHutang,
      `${formatAngka(kpi.jumlahHutang)} dokumen`,
    ],
    [
      "Nilai Persediaan Saat Ini",
      "Stok saat ini × harga pokok rata-rata",
      kpi.nilaiPersediaan,
      `${formatAngka(kpi.jumlahProduk)} produk`,
    ],
  ];

  daftarKpi.forEach(([nama, ket, nilai, ringkas], idx) => {
    const z = idx % 2 === 1;
    const gKiri: GayaSel = z ? "tdKiriZebra" : "tdKiri";
    const gTengah: GayaSel = z ? "tdTengahZebra" : "tdTengah";
    const gAngka: GayaSel = z ? "tdAngkaZebra" : "tdAngka";
    const r = tambahBaris({
      tinggi: 20,
      sel: [
        sel(idx + 1, gTengah),
        sel(nama, gKiri),
        sel(null, gKiri),
        sel(ket, gKiri),
        sel(null, gKiri),
        sel(nilai, gAngka),
        sel(ringkas, gTengah),
      ],
    });
    gabungS1.push(`B${r}:C${r}`, `D${r}:E${r}`);
  });

  tambahBaris({ tinggi: 12, sel: [] });

  // ---- Tabel 2: Perlu Tindakan (jika ada) ----
  if (data.perluTindakan.length > 0) {
    const rSeksiTindakan = tambahBaris(
      barisGabungPenuh(
        "2. DOKUMEN PERLU TINDAKAN",
        7,
        "judulSeksi",
        22,
      ),
    );
    gabungS1.push(`A${rSeksiTindakan}:G${rSeksiTindakan}`);

    const rThTindakan = tambahBaris({
      tinggi: 22,
      sel: [
        sel("No", "thTengah"),
        sel("Jenis Tindak Lanjut", "thKiri"),
        sel(null, "thKiri"),
        sel(null, "thKiri"),
        sel(null, "thKiri"),
        sel("Jumlah Dokumen", "thTengah"),
        sel("Status", "thTengah"),
      ],
    });
    gabungS1.push(`B${rThTindakan}:E${rThTindakan}`);

    data.perluTindakan.forEach((t, idx) => {
      const z = idx % 2 === 1;
      const gKiri: GayaSel = z ? "tdKiriZebra" : "tdKiri";
      const gTengah: GayaSel = z ? "tdTengahZebra" : "tdTengah";
      const r = tambahBaris({
        tinggi: 20,
        sel: [
          sel(idx + 1, gTengah),
          sel(t.label, gKiri),
          sel(null, gKiri),
          sel(null, gKiri),
          sel(null, gKiri),
          sel(t.jumlah, gTengah),
          sel("Menunggu", gTengah),
        ],
      });
      gabungS1.push(`B${r}:E${r}`);
    });

    tambahBaris({ tinggi: 12, sel: [] });
  }

  // ---- Tabel 3: Transaksi Terakhir ----
  const nomorSeksiTrx = data.perluTindakan.length > 0 ? "3" : "2";
  const rSeksiTrx = tambahBaris(
    barisGabungPenuh(
      `${nomorSeksiTrx}. DAFTAR TRANSAKSI TERAKHIR (${data.transaksi.length} DOKUMEN)`,
      7,
      "judulSeksi",
      22,
    ),
  );
  gabungS1.push(`A${rSeksiTrx}:G${rSeksiTrx}`);

  tambahBaris({
    tinggi: 22,
    sel: [
      sel("No", "thTengah"),
      sel("Nomor Dokumen", "thKiri"),
      sel("Jenis Transaksi", "thKiri"),
      sel("Pihak / Keterangan", "thKiri"),
      sel("Tanggal", "thTengah"),
      sel("Nilai (Rp)", "thKanan"),
      sel("Status & Arah", "thTengah"),
    ],
  });

  if (data.transaksi.length === 0) {
    const rKosong = tambahBaris(
      barisGabungPenuh(
        "Tidak ada transaksi pada periode atau filter ini.",
        7,
        "tdTengah",
        22,
      ),
    );
    gabungS1.push(`A${rKosong}:G${rKosong}`);
  } else {
    let totalNilaiTrx = 0;
    data.transaksi.forEach((t, idx) => {
      totalNilaiTrx += t.nilai;
      const z = idx % 2 === 1;
      const gKiri: GayaSel = z ? "tdKiriZebra" : "tdKiri";
      const gTengah: GayaSel = z ? "tdTengahZebra" : "tdTengah";
      const gAngka: GayaSel = z ? "tdAngkaZebra" : "tdAngka";
      const labelStatus = `${STATUS_LABEL[t.status] ?? t.status} (${t.arah === "masuk" ? "Masuk" : "Keluar"})`;

      tambahBaris({
        tinggi: 20,
        sel: [
          sel(idx + 1, gTengah),
          sel(t.nomor, gKiri),
          sel(t.jenis, gKiri),
          sel(t.pihak, gKiri),
          sel(formatTanggal(t.tanggal), gTengah),
          sel(t.nilai, gAngka),
          sel(labelStatus, gTengah),
        ],
      });
    });

    const rTotalTrx = tambahBaris({
      tinggi: 22,
      sel: [
        sel("TOTAL NILAI DOKUMEN TERCANTUM", "totalKanan"),
        sel(null, "totalKanan"),
        sel(null, "totalKanan"),
        sel(null, "totalKanan"),
        sel(null, "totalKanan"),
        sel(totalNilaiTrx, "totalAngka"),
        sel(`${data.transaksi.length} dokumen`, "totalKiri"),
      ],
    });
    gabungS1.push(`A${rTotalTrx}:E${rTotalTrx}`);
  }

  /* ================================================================ */
  /* SHEET 2 — Rincian Penjualan vs Pembelian (Tabel + AutoFilter)    */
  /* ================================================================ */
  const barisS2: BarisExcel[] = [
    barisGabungPenuh(
      `RINCIAN PENJUALAN VS PEMBELIAN — ${data.labelPeriode.toUpperCase()}`,
      5,
      "bannerJudul",
      26,
    ),
    barisGabungPenuh(subJudul, 5, "bannerSub", 19),
    { tinggi: 8, sel: [] },
    {
      tinggi: 22,
      sel: [
        sel("No", "thTengah"),
        sel("Tanggal / Bulan", "thTengah"),
        sel("Penjualan (Rp)", "thKanan"),
        sel("Pembelian (Rp)", "thKanan"),
        sel("Selisih Penjualan − Pembelian (Rp)", "thKanan"),
      ],
    },
  ];
  const gabungS2 = ["A1:E1", "A2:E2"];

  let totalJualGrafik = 0;
  let totalBeliGrafik = 0;
  data.grafik.forEach((g, idx) => {
    totalJualGrafik += g.penjualan;
    totalBeliGrafik += g.pembelian;
    const z = idx % 2 === 1;
    barisS2.push({
      tinggi: 19,
      sel: [
        sel(idx + 1, z ? "tdTengahZebra" : "tdTengah"),
        sel(g.label, z ? "tdTengahZebra" : "tdTengah"),
        sel(g.penjualan, z ? "tdAngkaZebra" : "tdAngka"),
        sel(g.pembelian, z ? "tdAngkaZebra" : "tdAngka"),
        sel(g.penjualan - g.pembelian, z ? "tdAngkaZebra" : "tdAngka"),
      ],
    });
  });

  const barisAkhirDataS2 = barisS2.length;
  const rTotalS2 = barisAkhirDataS2 + 1;
  barisS2.push({
    tinggi: 22,
    sel: [
      sel("TOTAL PERIODE", "totalKanan"),
      sel(null, "totalKanan"),
      sel(totalJualGrafik, "totalAngka"),
      sel(totalBeliGrafik, "totalAngka"),
      sel(totalJualGrafik - totalBeliGrafik, "totalAngka"),
    ],
  });
  gabungS2.push(`A${rTotalS2}:B${rTotalS2}`);

  /* ================================================================ */
  /* SHEET 3 — Transaksi Terakhir (Tabel penuh + AutoFilter)          */
  /* ================================================================ */
  const barisS3: BarisExcel[] = [
    barisGabungPenuh(
      `DAFTAR TRANSAKSI TERAKHIR — ${data.labelPeriode.toUpperCase()}`,
      8,
      "bannerJudul",
      26,
    ),
    barisGabungPenuh(subJudul, 8, "bannerSub", 19),
    { tinggi: 8, sel: [] },
    {
      tinggi: 22,
      sel: [
        sel("No", "thTengah"),
        sel("Nomor Dokumen", "thKiri"),
        sel("Jenis Transaksi", "thKiri"),
        sel("Pihak / Keterangan", "thKiri"),
        sel("Tanggal", "thTengah"),
        sel("Nilai (Rp)", "thKanan"),
        sel("Status", "thTengah"),
        sel("Arah", "thTengah"),
      ],
    },
  ];
  const gabungS3 = ["A1:H1", "A2:H2"];

  if (data.transaksi.length === 0) {
    barisS3.push(
      barisGabungPenuh(
        "Tidak ada transaksi pada periode atau filter ini.",
        8,
        "tdTengah",
        22,
      ),
    );
    gabungS3.push("A5:H5");
  } else {
    let totalS3 = 0;
    data.transaksi.forEach((t, idx) => {
      totalS3 += t.nilai;
      const z = idx % 2 === 1;
      barisS3.push({
        tinggi: 20,
        sel: [
          sel(idx + 1, z ? "tdTengahZebra" : "tdTengah"),
          sel(t.nomor, z ? "tdKiriZebra" : "tdKiri"),
          sel(t.jenis, z ? "tdKiriZebra" : "tdKiri"),
          sel(t.pihak, z ? "tdKiriZebra" : "tdKiri"),
          sel(formatTanggal(t.tanggal), z ? "tdTengahZebra" : "tdTengah"),
          sel(t.nilai, z ? "tdAngkaZebra" : "tdAngka"),
          sel(STATUS_LABEL[t.status] ?? t.status, z ? "tdTengahZebra" : "tdTengah"),
          sel(t.arah === "masuk" ? "Masuk" : "Keluar", z ? "tdTengahZebra" : "tdTengah"),
        ],
      });
    });

    const rTotalS3 = barisS3.length + 1;
    barisS3.push({
      tinggi: 22,
      sel: [
        sel("TOTAL NILAI", "totalKanan"),
        sel(null, "totalKanan"),
        sel(null, "totalKanan"),
        sel(null, "totalKanan"),
        sel(null, "totalKanan"),
        sel(totalS3, "totalAngka"),
        sel(`${data.transaksi.length} dokumen`, "totalKiri"),
        sel(null, "totalKiri"),
      ],
    });
    gabungS3.push(`A${rTotalS3}:E${rTotalS3}`, `G${rTotalS3}:H${rTotalS3}`);
  }

  return [
    {
      nama: "Ringkasan Dashboard",
      lebarKolom: [6, 22, 22, 34, 15, 22, 22],
      baris: barisS1,
      gabung: gabungS1,
    },
    {
      nama: "Penjualan vs Pembelian",
      lebarKolom: [7, 18, 22, 22, 28],
      baris: barisS2,
      gabung: gabungS2,
      autoFilter: data.grafik.length > 0 ? `A4:E${barisAkhirDataS2}` : undefined,
    },
    {
      nama: "Transaksi Terakhir",
      lebarKolom: [6, 22, 24, 38, 14, 22, 16, 12],
      baris: barisS3,
      gabung: gabungS3,
      autoFilter:
        data.transaksi.length > 0
          ? `A4:H${4 + data.transaksi.length}`
          : undefined,
    },
  ];
}

export function EksporDashboard({ data }: { data: DataEksporDashboard }) {
  const [pesanStatus, setPesanStatus] = useState("");

  function unduhExcel() {
    const waktuCetak = new Date().toLocaleString("id-ID");
    const sheets = susunSheetsDashboard(data, waktuCetak);
    const bytes = bangunWorkbookXlsx(sheets);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = `laporan-dashboard-${data.kodePeriode}-${data.akhir}.xlsx`;
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    URL.revokeObjectURL(url);
    setPesanStatus("Berkas Excel laporan dashboard berhasil diunduh.");
  }

  function cetakPdf() {
    const jendela = window.open("", "_blank", "width=960,height=760");
    if (!jendela) {
      setPesanStatus(
        "Pop-up diblokir browser. Izinkan pop-up untuk mencetak atau menyimpan PDF.",
      );
      return;
    }

    const { kpi } = data;
    const barisTindakan =
      data.perluTindakan.length === 0
        ? `<p style="font-size:12px;color:#059669;margin:0;">Semua dokumen sudah diproses.</p>`
        : `<ul>${data.perluTindakan
            .map(
              (t) =>
                `<li><strong>${escapeHtml(formatAngka(t.jumlah))}</strong> — ${escapeHtml(t.label)}</li>`,
            )
            .join("")}</ul>`;

    const barisTransaksi =
      data.transaksi.length === 0
        ? `<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:16px;">Tidak ada transaksi pada periode/filter ini.</td></tr>`
        : data.transaksi
            .map(
              (t) => `
              <tr>
                <td style="font-weight:600;">${escapeHtml(t.nomor)}</td>
                <td>
                  <div>${escapeHtml(t.jenis)}</div>
                  <div style="font-size:11px;color:#6b7280;">${escapeHtml(t.pihak)}</div>
                </td>
                <td>${escapeHtml(formatTanggal(t.tanggal))}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums;">${escapeHtml(formatRupiah(t.nilai))}</td>
                <td>${escapeHtml(STATUS_LABEL[t.status] ?? t.status)}</td>
                <td style="text-align:right;">${t.arah === "masuk" ? "Masuk" : "Keluar"}</td>
              </tr>`,
            )
            .join("");

    jendela.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Ringkasan Dashboard - ${escapeHtml(data.labelPeriode)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      padding: 28px;
      margin: 0;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111827;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .title { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 12px; color: #4b5563; margin: 0; }
    .meta { text-align: right; font-size: 11px; color: #4b5563; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f9fafb;
    }
    .kpi-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .kpi-val { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .kpi-note { font-size: 10px; color: #6b7280; margin-top: 3px; }
    h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 18px 0 8px 0;
      color: #374151;
    }
    ul { margin: 0; padding-left: 18px; font-size: 12px; }
    li { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #d1d5db; padding: 7px 9px; font-size: 11.5px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; font-weight: 700; }
    .footer {
      margin-top: 22px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 10.5px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .kpi-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">RINGKASAN EKSEKUTIF — SYSTEMERP</h1>
      <p class="subtitle">Periode: <strong>${escapeHtml(data.labelPeriode)}</strong> (${escapeHtml(formatTanggal(data.awal))} – ${escapeHtml(formatTanggal(data.akhir))})</p>
    </div>
    <div class="meta">
      <div>Dicetak oleh: <strong>${escapeHtml(data.dicetakOleh)}</strong> (${escapeHtml(data.peran)})</div>
      <div>Waktu cetak: ${escapeHtml(new Date().toLocaleString("id-ID"))}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Penjualan (${escapeHtml(data.labelPeriode)})</div>
      <div class="kpi-val">${escapeHtml(formatRupiah(kpi.penjualanKini))}</div>
      <div class="kpi-note">Sebelumnya: ${escapeHtml(formatRupiah(kpi.penjualanLalu))}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Laba Bersih (${escapeHtml(data.labelPeriode)})</div>
      <div class="kpi-val">${escapeHtml(formatRupiah(kpi.labaKini))}</div>
      <div class="kpi-note">HPP ${escapeHtml(formatRupiah(kpi.hppKini))} · Beban ${escapeHtml(formatRupiah(kpi.bebanKini))}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pembelian Tercatat (${escapeHtml(data.labelPeriode)})</div>
      <div class="kpi-val">${escapeHtml(formatRupiah(kpi.totalPembelian))}</div>
      <div class="kpi-note">Penerimaan barang diposting</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Piutang</div>
      <div class="kpi-val">${escapeHtml(formatRupiah(kpi.totalPiutang))}</div>
      <div class="kpi-note">${escapeHtml(formatAngka(kpi.jumlahPiutang))} invoice belum lunas (${escapeHtml(formatAngka(kpi.invoiceJatuhTempo))} jatuh tempo)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Hutang</div>
      <div class="kpi-val">${escapeHtml(formatRupiah(kpi.totalHutang))}</div>
      <div class="kpi-note">${escapeHtml(formatAngka(kpi.jumlahHutang))} penerimaan belum dibayar</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Nilai Persediaan</div>
      <div class="kpi-val">${escapeHtml(formatRupiah(kpi.nilaiPersediaan))}</div>
      <div class="kpi-note">${escapeHtml(formatAngka(kpi.jumlahProduk))} produk terdaftar</div>
    </div>
  </div>

  <h2>Dokumen Perlu Tindakan</h2>
  ${barisTindakan}

  <h2>Transaksi Terakhir (${escapeHtml(String(data.transaksi.length))} dokumen)</h2>
  <table>
    <thead>
      <tr>
        <th>Dokumen</th>
        <th>Jenis / Sumber</th>
        <th>Tanggal</th>
        <th style="text-align:right;">Nilai</th>
        <th>Status</th>
        <th style="text-align:right;">Arah</th>
      </tr>
    </thead>
    <tbody>${barisTransaksi}</tbody>
  </table>

  <div class="footer">
    <span>SystemERP — UMKM Retail/Distribusi</span>
    <span>Sumber: Database langsung</span>
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`);
    jendela.document.close();
    setPesanStatus("Jendela cetak PDF ringkasan dashboard dibuka.");
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={unduhExcel}
        title="Unduh laporan dashboard dalam tabel Excel (.xlsx) rapi"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
        Export Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={cetakPdf}
        title="Cetak atau simpan ringkasan dashboard sebagai PDF"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        Cetak PDF
      </Button>
      <p role="status" className="sr-only">
        {pesanStatus}
      </p>
    </div>
  );
}

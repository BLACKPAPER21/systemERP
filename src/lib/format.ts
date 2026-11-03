/* MILIK M1 — Format bersama seluruh modul (PRD NF-20, NF-17)
 *
 * Semua modul WAJIB memakai fungsi ini; dilarang menulis format sendiri
 * agar angka dan tanggal tampil seragam di seluruh aplikasi.
 */

/** `Rp 1.234.567` — pemisah ribuan Indonesia (NF-17). */
export function formatRupiah(nilai: number | string | null | undefined): string {
  if (nilai === null || nilai === undefined || nilai === "") return "—";
  const angka = typeof nilai === "string" ? Number(nilai) : nilai;
  if (Number.isNaN(angka)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(angka);
}

/** Angka polos dengan pemisah ribuan, tanpa simbol mata uang. */
export function formatAngka(nilai: number | string | null | undefined): string {
  if (nilai === null || nilai === undefined || nilai === "") return "—";
  const angka = typeof nilai === "string" ? Number(nilai) : nilai;
  if (Number.isNaN(angka)) return "—";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(angka);
}

/** `DD/MM/YYYY` (NF-20). Menerima string "YYYY-MM-DD" atau objek Date. */
export function formatTanggal(
  tanggal: string | Date | null | undefined,
): string {
  if (!tanggal) return "—";
  if (typeof tanggal === "string") {
    // "2026-11-03" → "03/11/2026"
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tanggal);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(tanggal);
    return Number.isNaN(d.getTime()) ? "—" : formatTanggal(d);
  }
  const tgl = tanggal;
  const hari = String(tgl.getDate()).padStart(2, "0");
  const bulan = String(tgl.getMonth() + 1).padStart(2, "0"); // waktu lokal server
  const tahun = tgl.getFullYear();
  return `${hari}/${bulan}/${tahun}`;
}

/** Tanggal hari ini sebagai string "YYYY-MM-DD" (untuk value input date). */
export function hariIniIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// ==== NF-21 — Pemetaan warna lencana status (dipakai StatusBadge) ====
// draft → abu-abu | approved/confirmed → biru | posted/lunas → hijau | cancelled → merah
export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  approved: "Disetujui",
  confirmed: "Dikonfirmasi",
  received: "Diterima",
  posted: "Tercatat",
  lunas: "Lunas",
  belum: "Belum",
  cancelled: "Dibatalkan",
  invoiced: "Terinvoice",
  aktif: "Aktif",
  nonaktif: "Nonaktif",
  in: "Masuk",
  out: "Keluar",
  adjustment: "Penyesuaian",
  opening_balance: "Saldo Awal",
  goods_receipt: "Penerimaan Barang",
  invoice: "Invoice",
  invoice_hpp: "HPP",
  payment: "Pembayaran",
  expense: "Beban",
  stock_opname: "Stock Opname",
  kas: "Kas",
  transfer: "Transfer",
};

export const STATUS_KELAS: Record<string, string> = {
  // abu-abu
  draft: "bg-secondary text-secondary-foreground border",
  belum: "bg-secondary text-secondary-foreground border",
  nonaktif: "bg-secondary text-secondary-foreground border",
  // biru
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  received: "bg-blue-100 text-blue-800 border-blue-200",
  invoiced: "bg-blue-100 text-blue-800 border-blue-200",
  // hijau
  posted: "bg-green-100 text-green-800 border-green-200",
  lunas: "bg-green-100 text-green-800 border-green-200",
  aktif: "bg-green-100 text-green-800 border-green-200",
  // merah
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

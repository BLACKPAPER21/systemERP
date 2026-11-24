/* MILIK M1 — tujuan halaman setelah berhasil masuk, ditentukan per peran.
 *
 * Dashboard (M6) hanya boleh dibuka owner & keuangan (PRD §4.2), sehingga
 * gudang dan sales diarahkan ke halaman yang memang boleh mereka buka —
 * kalau tidak, mereka langsung disambut panel "Akses ditolak" setelah masuk.
 *
 * Berkas ini sengaja bebas impor sisi-server agar aman dipakai komponen klien.
 */
export type PeranRute = "owner" | "gudang" | "sales" | "keuangan";

export function ruteAwal(peran: PeranRute | string | undefined): string {
  return peran === "owner" || peran === "keuangan" ? "/" : "/master/produk";
}

/* MILIK M1 — tujuan halaman setelah berhasil masuk, ditentukan per peran.
 *
 * Ini hanya menentukan halaman PENDARATAN, bukan hak akses. Hak akses tetap
 * dijaga pageAccess()/requireRole() sesuai matriks PRD §4.2 — peran keuangan
 * misalnya tetap boleh membuka Dashboard, hanya saja tidak mendarat di sana.
 *
 * Setiap peran diarahkan ke halaman yang memang boleh ia buka; kalau tidak,
 * pengguna disambut panel "Akses ditolak" tepat setelah berhasil masuk.
 *
 * Berkas ini sengaja bebas impor sisi-server agar aman dipakai komponen klien.
 */
export type PeranRute = "owner" | "gudang" | "sales" | "keuangan";

const TUJUAN: Record<PeranRute, string> = {
  owner: "/", // Dashboard manajerial (M6)
  keuangan: "/keuangan/pembayaran", // langsung ke halaman kerja M5
  gudang: "/master/produk",
  sales: "/master/produk",
};

export function ruteAwal(peran: PeranRute | string | undefined): string {
  return TUJUAN[peran as PeranRute] ?? "/master/produk";
}

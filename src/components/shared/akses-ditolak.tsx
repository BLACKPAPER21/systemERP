/* Panel "Akses ditolak" — ditampilkan server-side bila peran tidak sesuai
 * matriks hak akses (PRD §4.2, NF-3). Bukan sekadar tombol yang disembunyikan.
 */
import { ShieldX } from "lucide-react";

export function AksesDitolak({ pesan }: { pesan?: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border bg-card p-8 text-center">
      <ShieldX className="mx-auto mb-4 h-10 w-10 text-destructive" />
      <h2 className="mb-1 text-lg font-semibold">Akses ditolak</h2>
      <p className="text-sm text-muted-foreground">
        {pesan ??
          "Peran Anda tidak memiliki akses ke halaman ini. Hubungi pemilik usaha bila memerlukan akses."}
      </p>
    </div>
  );
}

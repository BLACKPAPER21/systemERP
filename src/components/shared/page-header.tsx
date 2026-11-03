/* Tata letak halaman daftar seragam (NF-19): judul, tombol aksi kanan atas,
 * filter, tabel, penomoran halaman. Milik M1, dipakai seluruh modul.
 */
import type { ReactNode } from "react";

export function PageHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi?: string;
  aksi?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{judul}</h1>
        {deskripsi ? (
          <p className="mt-1 text-sm text-muted-foreground">{deskripsi}</p>
        ) : null}
      </div>
      {aksi ? <div className="flex items-center gap-2">{aksi}</div> : null}
    </div>
  );
}

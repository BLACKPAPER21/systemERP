"use client";

/* Form tambah/ubah Supplier / Pelanggan (komponen bersama M1).
 * `action` adalah server action milik halaman pemanggil diteruskan sebagai prop.
 */
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import type { AksiHasil, BarisMitra } from "@/lib/aksi";

export function MitraFormDialog({
  baris,
  trigger,
  judul,
  deskripsi,
  action,
  readOnlyKode,
}: {
  baris?: BarisMitra; // undefined → tambah baru
  trigger: React.ReactNode;
  judul: string;
  deskripsi?: string;
  action: (
    id: number | null,
    raw: { kode: string; nama: string; telepon: string; alamat: string; aktif: boolean },
  ) => Promise<AksiHasil>;
  readOnlyKode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [form, setForm] = useState({
    kode: baris?.kode ?? "",
    nama: baris?.nama ?? "",
    telepon: baris?.telepon ?? "",
    alamat: baris?.alamat ?? "",
    aktif: baris?.aktif ?? true,
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    const hasil = await action(baris?.id ?? null, {
      kode: form.kode,
      nama: form.nama,
      telepon: form.telepon,
      alamat: form.alamat,
      aktif: form.aktif,
    });
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <FormDialog
        open={open}
        onOpenChange={(o) => setOpen(o)}
        judul={judul}
        deskripsi={
          deskripsi ??
          "Isi data. Kode unik dipakai untuk merujuk dokumen antarmodul."
        }
        galat={galat}
        proses={proses}
        onSubmit={onSubmit}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`kode-${baris?.id ?? "baru"}`}>Kode</Label>
              <Input
                id={`kode-${baris?.id ?? "baru"}`}
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
                placeholder="mis. SUP-001"
                disabled={!!baris && readOnlyKode}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`telepon-${baris?.id ?? "baru"}`}>Telepon</Label>
              <Input
                id={`telepon-${baris?.id ?? "baru"}`}
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="mis. 0812xxxx"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`nama-${baris?.id ?? "baru"}`}>Nama</Label>
            <Input
              id={`nama-${baris?.id ?? "baru"}`}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`alamat-${baris?.id ?? "baru"}`}>Alamat</Label>
            <Input
              id={`alamat-${baris?.id ?? "baru"}`}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              className="h-4 w-4"
            />
            Aktif
          </label>
        </div>
      </FormDialog>
    </>
  );
}

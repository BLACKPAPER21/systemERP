"use client";

/* Form tambah/ubah Produk — wilayah M1.
 * PENTING (PRD §8.2, ceklis B.2): form TIDAK MEMILIH input
 * `stok_saat_ini` dan `harga_pokok_rata_rata` — kedua kolom dihitung oleh M3.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog, useFormDialog } from "@/components/shared/form-dialog";
import { simpanProduk } from "../actions";

export interface BarisProduk {
  id: number;
  sku: string;
  nama: string;
  satuan: string;
  hargaJual: string;
  stokMinimum: string;
  aktif: boolean;
}

export function ProdukFormDialog({
  baris,
  trigger,
}: {
  baris?: BarisProduk; // undefined → tambah baru
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { open, setOpen, proses, setProses, galat, setGalat } = useFormDialog();
  const [form, setForm] = useState({
    sku: baris?.sku ?? "",
    nama: baris?.nama ?? "",
    satuan: baris?.satuan ?? "",
    hargaJual: baris ? String(baris.hargaJual) : "",
    stokMinimum: baris ? String(baris.stokMinimum) : "",
    aktif: baris?.aktif ?? true,
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    const hasil = await simpanProduk(baris?.id ?? null, {
      sku: form.sku,
      nama: form.nama,
      satuan: form.satuan,
      hargaJual: form.hargaJual,
      stokMinimum: form.stokMinimum,
      aktif: form.aktif,
    });
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o && baris) setForm({
            sku: baris.sku,
            nama: baris.nama,
            satuan: baris.satuan,
            hargaJual: String(baris.hargaJual),
            stokMinimum: String(baris.stokMinimum),
            aktif: baris.aktif,
          });
        }}
        judul={baris ? "Ubah Produk" : "Tambah Produk"}
        deskripsi="Isi data produk. Stok dan harga pokok rata-rata dikelola modul Persediaan secara otomatis."
        galat={galat}
        proses={proses}
        onSubmit={onSubmit}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="mis. BRG-001"
                disabled={!!baris}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="satuan">Satuan</Label>
              <Input
                id="satuan"
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                placeholder="mis. pcs"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama">Nama</Label>
            <Input
              id="nama"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Beras Premium 5kg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hargaJual">Harga Jual (Rp)</Label>
              <Input
                id="hargaJual"
                type="number"
                min="0"
                step="0.01"
                value={form.hargaJual}
                onChange={(e) => setForm({ ...form, hargaJual: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stokMinimum">Stok Minimum</Label>
              <Input
                id="stokMinimum"
                type="number"
                min="0"
                step="0.01"
                value={form.stokMinimum}
                onChange={(e) => setForm({ ...form, stokMinimum: e.target.value })}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              className="h-4 w-4"
            />
            Produk aktif
          </label>
        </div>
      </FormDialog>
    </>
  );
}

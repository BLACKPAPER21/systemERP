"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog, useFormDialog } from "@/components/shared/form-dialog";
import { formatAngka } from "@/lib/format";
import { simpanProduk } from "./actions";

export interface BarisProduk {
  id: number;
  sku: string;
  nama: string;
  satuan: string;
  hargaJual: string;
  stokMinimum: string;
  stokSaatIni?: string;
  aktif: boolean;
}

export function ProdukFormDialog({
  baris,
  trigger,
}: {
  baris?: BarisProduk;
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
    tambahStok: "",
    aktif: baris?.aktif ?? true,
  });

  const stokAwal = Number(baris?.stokSaatIni ?? 0);
  const parsedTambah = Number((form.tambahStok || "0").replace(",", "."));
  const tambahAman = Number.isNaN(parsedTambah) ? 0 : Math.max(0, parsedTambah);
  const stokSesudah = stokAwal + tambahAman;

  function resetFormFromBaris(target?: BarisProduk) {
    setForm({
      sku: target?.sku ?? "",
      nama: target?.nama ?? "",
      satuan: target?.satuan ?? "",
      hargaJual: target ? String(target.hargaJual) : "",
      stokMinimum: target ? String(target.stokMinimum) : "",
      tambahStok: "",
      aktif: target?.aktif ?? true,
    });
  }

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
      tambahStok: baris ? form.tambahStok : "0",
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
          if (o) resetFormFromBaris(baris);
        }}
        judul={baris ? "Ubah Produk" : "Tambah Produk"}
        deskripsi={
          baris
            ? "Ubah informasi produk dan isikan jumlah stok yang ingin ditambahkan jika ada penambahan stok."
            : "Isi data produk baru."
        }
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

          {baris && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stok Saat Ini: <strong className="text-foreground">{formatAngka(stokAwal)}</strong></span>
                <span>Total Setelah Tambah: <strong className="text-foreground">{formatAngka(stokSesudah)}</strong></span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tambahStok">Tambah Stok</Label>
                <Input
                  id="tambahStok"
                  type="text"
                  inputMode="decimal"
                  value={form.tambahStok}
                  onChange={(e) =>
                    setForm({ ...form, tambahStok: e.target.value.replace(/[^0-9.,]/g, "") })
                  }
                  placeholder="0 (ketik jumlah stok yang ingin ditambah)"
                />
              </div>
            </div>
          )}

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
"use client";

/* Form tambah/ubah Pengguna — wilayah M1, hanya Owner. */
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog, useFormDialog } from "@/components/shared/form-dialog";
import {
  simpanPengguna,
  ubahPengguna,
} from "../actions";
import type { AksiHasil } from "@/lib/aksi";

export interface BarisPengguna {
  id: number;
  nama: string;
  email: string;
  peran: string;
  aktif: boolean;
}

interface IProps {
  baris?: BarisPengguna;
  trigger: React.ReactNode;
}

export function PenggunaFormDialog({ baris, trigger }: IProps) {
  const { open, setOpen, proses, setProses, galat, setGalat } = useFormDialog();
  const [form, setForm] = useState({
    nama: baris?.nama ?? "",
    email: baris?.email ?? "",
    password: "",
    peran: baris?.peran ?? "sales",
    aktif: baris?.aktif ?? true,
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    let hasil: AksiHasil;
    if (baris) {
      hasil = await ubahPengguna({
        id: baris.id,
        nama: form.nama,
        email: form.email,
        password: form.password,
        peran: form.peran,
        aktif: form.aktif,
      });
    } else {
      hasil = await simpanPengguna({
        nama: form.nama,
        email: form.email,
        password: form.password,
        peran: form.peran,
        aktif: form.aktif,
      });
    }
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
        judul={baris ? "Ubah Pengguna" : "Tambah Pengguna"}
        deskripsi="Kata sandi disimpan sebagai hash bcrypt. Biarkan kolom sandi kosong untuk mempertahankan sandi lama."
        galat={galat}
        proses={proses}
        onSubmit={onSubmit}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="nama-pengguna">Nama</Label>
            <Input
              id="nama-pengguna"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-pengguna">Email</Label>
            <Input
              id="email-pengguna"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sand-pengguna">
                {baris ? "Kata Sandi Baru (opsional)" : "Kata Sandi"}
              </Label>
              <Input
                id="sand-pengguna"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!baris}
                minLength={baris ? undefined : 6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="peran-pengguna">Peran</Label>
              <select
                id="peran-pengguna"
                value={form.peran}
                onChange={(e) => setForm({ ...form, peran: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="owner">Owner</option>
                <option value="gudang">Staf Gudang</option>
                <option value="sales">Kasir / Sales</option>
                <option value="keuangan">Staf Keuangan</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              className="h-4 w-4"
            />
            Pengguna aktif
          </label>
        </div>
      </FormDialog>
    </>
  );
}

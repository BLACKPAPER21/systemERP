
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catatStokFisik } from "../actions";

type Produk = {
  id: number;
  sku: string;
  nama: string;
  satuan: string;
  stokSaatIni: string;
};

type Props = {
  opnameId: number;
  daftarProduk: Produk[];
};

export function CatatStokFisikForm({
  opnameId,
  daftarProduk,
}: Props) {
  const router = useRouter();

  const [productId, setProductId] = useState("");
  const [qtyFisik, setQtyFisik] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);

  const produkTerpilih = daftarProduk.find(
    (produk) => produk.id === Number(productId),
  );

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setPesan("");

    if (!productId) {
      setPesan("Silakan pilih produk terlebih dahulu.");
      return;
    }

    if (qtyFisik.trim() === "") {
      setPesan("Jumlah stok fisik wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const hasil = await catatStokFisik({
        opnameId,
        productId: Number(productId),
        qtyFisik,
        keterangan,
      });

      if (!hasil.ok) {
        setPesan(hasil.pesan ?? "Gagal mencatat stok fisik.");
        return;
      }

      setPesan(hasil.pesan ?? "Stok fisik berhasil dicatat.");
      setProductId("");
      setQtyFisik("");
      setKeterangan("");

      router.refresh();
    } catch {
      setPesan("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  }

  if (daftarProduk.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Tidak ada produk aktif yang tersedia atau semua produk sudah dicatat.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-background p-5"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">
          Pilih Produk
        </label>

        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          disabled={loading}
        >
          <option value="">-- Pilih Produk --</option>

          {daftarProduk.map((produk) => (
            <option key={produk.id} value={produk.id}>
              {produk.sku} - {produk.nama}
            </option>
          ))}
        </select>
      </div>

      {produkTerpilih && (
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            Stok Sistem Saat Ini
          </p>
          <p className="text-xl font-semibold">
            {produkTerpilih.stokSaatIni} {produkTerpilih.satuan}
          </p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">
          Jumlah Stok Fisik
        </label>

       <Input
  type="number"
  min="0"
  step={
    produkTerpilih?.satuan.toLowerCase() === "pcs"
      ? "1"
      : "0.01"
  }
  value={qtyFisik}
          onChange={(e) => setQtyFisik(e.target.value)}
          placeholder="Masukkan jumlah stok fisik"
          disabled={loading}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Keterangan (Opsional)
        </label>

        <Input
          type="text"
          maxLength={200}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Contoh: Hasil penghitungan gudang"
          disabled={loading}
        />
      </div>

      {pesan && (
        <p className="text-sm text-blue-600" role="status">
          {pesan}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Menyimpan..." : "Simpan Stok Fisik"}
      </Button>
    </form>
  );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buatStockOpname } from "../actions";

export function BuatStockOpnameButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");

  async function handleBuat() {
    setLoading(true);
    setPesan("");

    try {
      const hasil = await buatStockOpname();

      if (!hasil.ok) {
        setPesan(hasil.pesan ?? "Gagal membuat dokumen.");
        return;
      }

      router.push("/persediaan/stock-opname");
      router.refresh();
    } catch {
      setPesan("Terjadi kesalahan saat membuat dokumen Stock Opname.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleBuat}
        disabled={loading}
      >
        {loading ? "Membuat Dokumen..." : "Buat Dokumen Stock Opname"}
      </Button>

      {pesan && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {pesan}
        </p>
      )}
    </div>
  );
}

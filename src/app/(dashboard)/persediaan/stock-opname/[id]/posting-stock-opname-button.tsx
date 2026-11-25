
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { postingStockOpname } from "../actions";

export function PostingStockOpnameButton({
  opnameId,
}: {
  opnameId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");

  async function handlePosting() {
    const yakin = window.confirm(
      "Apakah Anda yakin ingin memposting Stock Opname? Saldo stok akan diperbarui.",
    );

    if (!yakin) return;

    setLoading(true);
    setPesan("");

    try {
      const hasil = await postingStockOpname(opnameId);

      setPesan(hasil.pesan ?? "");

      if (hasil.ok) {
        router.refresh();
      }
    } catch {
      setPesan("Terjadi kesalahan saat memposting Stock Opname.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handlePosting}
        disabled={loading}
      >
        {loading ? "Memposting..." : "Posting Stock Opname"}
      </Button>

      {pesan && (
        <p className="text-sm" role="status">
          {pesan}
        </p>
      )}
    </div>
  );
}

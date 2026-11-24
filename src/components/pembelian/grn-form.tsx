"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAngka, formatRupiah, hariIniIso } from "@/lib/format";
import { buatGRN, ubahGRN } from "@/app/(dashboard)/pembelian/actions";

type Item = { productId: number; sku: string; nama: string; satuan: string; sisa: string; hargaSatuan: string };
export function GRNForm({ poId, items, initial }: { poId: number; items: Item[]; initial?: { id: number; tanggal: string; qty: Record<number, string> } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? hariIniIso());
  const [qty, setQty] = useState<Record<number, string>>(initial?.qty ?? {});
  const [error, setError] = useState("");
  const total = items.reduce((sum, i) => sum + Math.round((Number(qty[i.productId]) || 0) * Number(i.hargaSatuan) * 100) / 100, 0);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const entries = items.filter((i) => qty[i.productId] && Number(qty[i.productId]) > 0).map((i) => ({ productId: i.productId, qtyDiterima: qty[i.productId] }));
    if (!entries.length) { setError("Isi jumlah diterima minimal satu produk."); return; }
    startTransition(async () => {
      const payload = { poId, tanggal, items: entries };
      const result = initial ? await ubahGRN(initial.id, payload) : await buatGRN(payload);
      if (result.ok) router.push(`/pembelian/grn/${result.id}`); else setError(result.pesan);
    });
  }
  return <form onSubmit={submit} className="space-y-5 rounded-lg border bg-background p-5">
    <p className="text-sm text-muted-foreground">Isi jumlah barang yang diterima. Kosongkan atau isi 0 untuk barang yang belum datang. Draft juga mencadangkan jumlah dari sisa PO.</p>
    <label className="block max-w-xs space-y-2 text-sm font-medium">Tanggal penerimaan <Input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></label>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Produk</th><th className="p-2">Sisa tersedia</th><th className="p-2">Harga satuan</th><th className="p-2">Jumlah diterima</th></tr></thead><tbody>{items.map((item) => <tr key={item.productId} className="border-b"><td className="p-2">{item.sku} — {item.nama}</td><td className="p-2">{formatAngka(item.sisa)} {item.satuan}</td><td className="p-2">{formatRupiah(item.hargaSatuan)}</td><td className="p-2"><Input aria-label={`Jumlah diterima ${item.nama}`} type="number" min="0" max={item.sisa} step="0.01" placeholder="0" value={qty[item.productId] ?? ""} onChange={(e) => setQty({ ...qty, [item.productId]: e.target.value })} /></td></tr>)}</tbody></table></div>
    <p className="text-right text-lg font-semibold">Total penerimaan: {formatRupiah(total)}</p>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={pending || !items.length}>{pending ? "Menyimpan..." : initial ? "Simpan perubahan" : "Simpan GRN (Draft)"}</Button><Link href="/pembelian/grn" className={buttonVariants({ variant: "outline" })}>Kembali</Link></div>
  </form>;
}

"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah, hariIniIso } from "@/lib/format";
import { buatPO, ubahPO } from "@/app/(dashboard)/pembelian/actions";

type Supplier = { id: number; nama: string; kode: string };
type Product = { id: number; nama: string; sku: string; satuan: string };
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
type Initial = { id: number; supplierId: number; tanggal: string; items: { productId: number; qty: string; hargaSatuan: string }[] };
export function POForm({ suppliers, products, initial }: { suppliers: Supplier[]; products: Product[]; initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [supplier, setSupplier] = useState(initial ? String(initial.supplierId) : "");
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? hariIniIso());
  const [items, setItems] = useState(initial?.items.map((i) => ({ ...i, productId: String(i.productId) })) ?? [{ productId: "", qty: "1", hargaSatuan: "" }]);
  const [error, setError] = useState("");
  const total = items.reduce((sum, i) => sum + Math.round((Number(i.qty) || 0) * (Number(i.hargaSatuan) || 0) * 100) / 100, 0);
  function change(index: number, key: "productId" | "qty" | "hargaSatuan", value: string) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const payload = { supplierId: Number(supplier), tanggal, items: items.map((i) => ({ ...i, productId: Number(i.productId) })) };
      const result = initial ? await ubahPO(initial.id, payload) : await buatPO(payload);
      if (result.ok) router.push(`/pembelian/po/${result.id}`);
      else setError(result.pesan);
    });
  }
  return <form onSubmit={submit} className="space-y-6 rounded-lg border bg-background p-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-medium block">Supplier <select required className={selectClass} value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">Pilih supplier</option>{suppliers.map((s) => <option value={s.id} key={s.id}>{s.kode} — {s.nama}</option>)}</select></label>
      <label className="space-y-2 text-sm font-medium block">Tanggal PO <Input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></label>
    </div>
    {(!suppliers.length || !products.length) && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Tambahkan supplier dan produk aktif di Master Data sebelum membuat PO.</p>}
    <div className="space-y-3">
      <h2 className="font-semibold">Barang yang dipesan</h2>
      {items.map((item, i) => <div key={i} className="grid gap-3 rounded-md border p-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <label className="space-y-1 text-sm">Produk <select aria-label={`Produk baris ${i+1}`} required className={selectClass} value={item.productId} onChange={(e) => change(i, "productId", e.target.value)}><option value="">Pilih produk</option>{products.map((p) => <option value={p.id} key={p.id}>{p.sku} — {p.nama} ({p.satuan})</option>)}</select></label>
        <label className="space-y-1 text-sm">Jumlah <Input required type="number" min="0.01" max="999999999999.99" step="0.01" value={item.qty} onChange={(e) => change(i, "qty", e.target.value)} /></label>
        <label className="space-y-1 text-sm">Harga beli / satuan <Input required type="number" min="0.01" max="999999999999.99" step="0.01" value={item.hargaSatuan} onChange={(e) => change(i, "hargaSatuan", e.target.value)} /></label>
        <Button type="button" variant="outline" disabled={items.length === 1} onClick={() => setItems(items.filter((_, index) => index !== i))}>Hapus</Button>
      </div>)}
      <Button type="button" variant="outline" disabled={items.length >= 100} onClick={() => setItems([...items, { productId: "", qty: "1", hargaSatuan: "" }])}>+ Tambah barang</Button>
      <p className="text-right text-lg font-semibold">Total: {formatRupiah(total)}</p>
    </div>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={pending || !suppliers.length || !products.length}>{pending ? "Menyimpan..." : initial ? "Simpan perubahan" : "Simpan PO (Draft)"}</Button><Link href="/pembelian/po" className={buttonVariants({ variant: "outline" })}>Kembali</Link></div>
  </form>;
}

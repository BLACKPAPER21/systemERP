"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { createSO } from "./actions";

interface MasterData {
  customers: { id: number; nama: string }[];
  products: { id: number; nama: string; hargaJual: number | string; stok: number | string }[];
}

export default function SOForm({ masterData }: { masterData: MasterData }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // State Master (Header)
  const [customerId, setCustomerId] = useState("");
  // Default tanggal hari ini (Format YYYY-MM-DD)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);

  // State Detail (Items)
  const [items, setItems] = useState([
    { productId: "", qty: 1, harga: 0, subtotal: 0, stokTersedia: 0 }
  ]);

  // Handle Perubahan Produk di Tabel
  const handleProductChange = (index: number, productId: string) => {
    const selectedProduct = masterData.products.find(p => p.id.toString() === productId);
    const newItems = [...items];
    
    if (selectedProduct) {
      const harga = Number(selectedProduct.hargaJual);
      newItems[index] = {
        ...newItems[index],
        productId,
        harga: harga,
        subtotal: harga * newItems[index].qty,
        stokTersedia: Number(selectedProduct.stok),
      };
    } else {
      newItems[index].productId = productId;
    }
    setItems(newItems);
  };

  // Handle Perubahan Qty di Tabel
  const handleQtyChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].qty = qty;
    newItems[index].subtotal = newItems[index].harga * qty;
    setItems(newItems);
  };

  const addRow = () => {
    setItems([...items, { productId: "", qty: 1, harga: 0, subtotal: 0, stokTersedia: 0 }]);
  };

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Kalkulasi Grand Total
  const grandTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  // Eksekusi Simpan Data
  const handleSubmit = async () => {
    if (!customerId) return alert("Pilih pelanggan terlebih dahulu!");
    if (items.some(i => !i.productId || i.qty <= 0)) {
      return alert("Pastikan semua baris produk terisi dengan benar!");
    }

    setIsLoading(true);
    const payload = {
      customerId,
      tanggal,
      total: grandTotal,
      items: items.map(i => ({
        productId: i.productId,
        qty: i.qty,
        harga: i.harga,
        subtotal: i.subtotal
      }))
    };

    const res = await createSO(payload);
    setIsLoading(false);

    if (res.success) {
      alert("Sales Order berhasil dibuat!");
      router.push("/penjualan/so");
    } else {
      alert(res.error || "Gagal menyimpan SO.");
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Form Pembuatan Sales Order</h2>
          <p className="text-sm text-gray-500">Status Awal: DRAFT (Stok belum terpotong)</p>
        </div>
        <Link href="/penjualan/so">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      </div>

      <div className="p-6 space-y-6">
        {/* HEADER: PELANGGAN & TANGGAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Pelanggan <span className="text-red-500">*</span></label>
            <select 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">-- Pilih Pelanggan --</option>
              {masterData.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Tanggal Transaksi <span className="text-red-500">*</span></label>
            <input 
              type="date"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
        </div>

        <hr />

        {/* DETAILS: TABEL ITEM BARANG */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Detail Pesanan Barang</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-sm text-gray-700">
                  <th className="p-3 border">Produk dari Inventory</th>
                  <th className="p-3 border w-32">Stok Gudang</th>
                  <th className="p-3 border w-40">Harga Satuan</th>
                  <th className="p-3 border w-32">Kuantitas (Qty)</th>
                  <th className="p-3 border w-48">Subtotal</th>
                  <th className="p-3 border w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 border">
                      <select 
                        className="w-full border rounded p-2 text-sm"
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                      >
                        <option value="">-- Pilih Produk --</option>
                        {masterData.products.map((p) => (
                          <option key={p.id} value={p.id}>{p.nama}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border text-center bg-gray-50 text-sm font-medium">
                      {item.stokTersedia}
                    </td>
                    <td className="p-2 border text-right bg-gray-50 font-mono text-sm">
                      {formatRupiah(item.harga)}
                    </td>
                    <td className="p-2 border">
                      <input 
                        type="number"
                        min="1"
                        className="w-full border rounded p-2 text-center text-sm"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 border text-right font-semibold font-mono text-sm">
                      {formatRupiah(item.subtotal)}
                    </td>
                    <td className="p-2 border text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeRow(index)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={addRow} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Tambah Baris
            </Button>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Tagihan:</p>
              <h2 className="text-3xl font-bold text-blue-600">{formatRupiah(grandTotal)}</h2>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-6 border-t flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="flex items-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Menyimpan..." : "Simpan SO (Draft)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
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

interface ItemRowState {
  productId: string;
  qtyInput: string;
  harga: number;
  subtotal: number;
  stokTersedia: number;
}

type MetodePembayaran = "cash" | "utang";

const createEmptyItem = (): ItemRowState => ({
  productId: "",
  qtyInput: "1",
  harga: 0,
  subtotal: 0,
  stokTersedia: 0,
});

const parseQtyValue = (qtyInput: string): number => {
  const parsed = parseInt(qtyInput, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
};

export default function SOForm({ masterData }: { masterData: MasterData }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // State Master (Header)
  const [customerId, setCustomerId] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split("T")[0]);

  // State Metode Pembayaran (Cash / Utang)
  const [metodePembayaran, setMetodePembayaran] = useState<MetodePembayaran>("utang");
  const [jumlahCicilanInput, setJumlahCicilanInput] = useState<string>("3");
  const [tenggat, setTenggat] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [bayarAwalInput, setBayarAwalInput] = useState<string>("0");

  // State Detail (Items)
  const [items, setItems] = useState<ItemRowState[]>([createEmptyItem()]);

  const handleProductChange = (index: number, productId: string) => {
    const selectedProduct = masterData.products.find((p) => p.id.toString() === productId);
    const newItems = [...items];
    const currentQty = parseQtyValue(newItems[index].qtyInput);

    if (selectedProduct) {
      const harga = Number(selectedProduct.hargaJual);
      newItems[index] = {
        ...newItems[index],
        productId,
        harga,
        subtotal: harga * currentQty,
        stokTersedia: Number(selectedProduct.stok),
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        productId,
        harga: 0,
        subtotal: 0,
        stokTersedia: 0,
      };
    }
    setItems(newItems);
  };

  const handleQtyChange = (index: number, rawQty: string) => {
    const digitsOnly = rawQty.replace(/[^\d]/g, "");
    const qtyAman = parseQtyValue(digitsOnly);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      qtyInput: digitsOnly,
      subtotal: newItems[index].harga * qtyAman,
    };
    setItems(newItems);
  };

  const handleQtyBlur = (index: number) => {
    const qtyAman = parseQtyValue(items[index].qtyInput);
    const finalInput = qtyAman > 0 ? String(qtyAman) : "1";
    const finalQty = parseQtyValue(finalInput);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      qtyInput: finalInput,
      subtotal: newItems[index].harga * finalQty,
    };
    setItems(newItems);
  };

  const handleMetodeChange = (metode: MetodePembayaran) => {
    setMetodePembayaran(metode);
    if (metode === "cash") {
      setJumlahCicilanInput("1");
      setBayarAwalInput("0");
    } else if (!jumlahCicilanInput) {
      setJumlahCicilanInput("1");
    }
  };

  const handleCicilanChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    setJumlahCicilanInput(digitsOnly);
  };

  const handleBayarAwalChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    setBayarAwalInput(digitsOnly);
  };

  const addRow = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const totalQtyByProduct = items.reduce<Record<string, number>>((acc, item) => {
    if (item.productId) {
      acc[item.productId] = (acc[item.productId] || 0) + parseQtyValue(item.qtyInput);
    }
    return acc;
  }, {});

  const grandTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

  const parsedCicilan = Math.max(1, parseInt(jumlahCicilanInput || "1", 10) || 1);
  const rawBayarAwal = Number(bayarAwalInput || 0);

  // Pada saat SO dibuat (Draft), Cash belum terbayar sebelum dikonfirmasi & invoice diterbitkan
  const nominalBayarAwal =
    metodePembayaran === "utang"
      ? Math.max(0, Math.min(rawBayarAwal, grandTotal))
      : 0;

  const sisaPiutang = Math.max(0, grandTotal - nominalBayarAwal);

  const cicilanPerTermin =
    metodePembayaran === "utang" && parsedCicilan > 0
      ? Math.ceil(sisaPiutang / parsedCicilan)
      : 0;

  const handleSubmit = async () => {
    if (!customerId) return alert("Pilih pelanggan terlebih dahulu!");

    const normalizedItems = items.map((i) => {
      const qty = parseQtyValue(i.qtyInput);
      return {
        productId: i.productId,
        qty,
        harga: i.harga,
        subtotal: i.harga * qty,
      };
    });

    if (normalizedItems.some((i) => !i.productId || i.qty <= 0)) {
      return alert("Pastikan semua baris produk terisi dan kuantitas minimal 1!");
    }

    const totalQtyPerProduk = new Map<string, number>();
    for (const item of normalizedItems) {
      const currentTotal = totalQtyPerProduk.get(item.productId) || 0;
      totalQtyPerProduk.set(item.productId, currentTotal + item.qty);
    }

    for (const [prodId, totalQtyDiminta] of totalQtyPerProduk.entries()) {
      const produkMaster = masterData.products.find((p) => p.id.toString() === prodId);
      if (produkMaster) {
        const stokTersedia = Number(produkMaster.stok);
        if (totalQtyDiminta > stokTersedia) {
          return alert(
            `Jumlah stok tidak mencukupi untuk produk "${produkMaster.nama}"!\n` +
              `Stok tersedia: ${stokTersedia}, Kuantitas diminta: ${totalQtyDiminta}.`
          );
        }
      }
    }

    if (metodePembayaran === "utang") {
      if (!jumlahCicilanInput || parsedCicilan < 1) {
        return alert("Isi jumlah bayar berapa kali (minimal 1 kali)!");
      }
      if (!tenggat) {
        return alert("Isi tanggal tenggat pembayaran!");
      }
      if (rawBayarAwal < 0) {
        return alert("Bayar awal tidak boleh bernilai negatif!");
      }
      if (rawBayarAwal > grandTotal) {
        return alert("Bayar awal tidak boleh melebihi total tagihan!");
      }
    }

    setIsLoading(true);
    const payload = {
      customerId,
      tanggal,
      total: grandTotal,
      metodePembayaran,
      jumlahCicilan: metodePembayaran === "utang" ? parsedCicilan : 1,
      tenggat: metodePembayaran === "utang" ? tenggat : null,
      bayarAwal: nominalBayarAwal,
      sisaPiutang,
      statusPelunasan: "Belum Lunas" as const,
      items: normalizedItems,
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
            <label className="text-sm font-semibold text-gray-700">
              Pelanggan <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">-- Pilih Pelanggan --</option>
              {masterData.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Tanggal Transaksi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
        </div>

        <hr />

        {/* PILIHAN PEMBAYARAN: CASH / UTANG */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Skema Pembayaran Pelanggan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => handleMetodeChange("cash")}
                className={`p-3 rounded-lg border text-left transition ${
                  metodePembayaran === "cash"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm">Cash</div>
                <div className="text-xs font-normal text-gray-500">
                  Lunas otomatis setelah SO dikonfirmasi &amp; Invoice terbit
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMetodeChange("utang")}
                className={`p-3 rounded-lg border text-left transition ${
                  metodePembayaran === "utang"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm">Utang</div>
                <div className="text-xs font-normal text-gray-500">
                  Atur jumlah cicilan, tenggat, &amp; bayar awal
                </div>
              </button>
            </div>
          </div>

          {metodePembayaran === "utang" && (
            <div className="p-4 rounded-xl border bg-amber-50/40 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Bayar Berapa Kali <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 3"
                    className="w-full border rounded-lg p-2 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    value={jumlahCicilanInput}
                    onChange={(e) => handleCicilanChange(e.target.value)}
                    onBlur={() => {
                      if (!jumlahCicilanInput) setJumlahCicilanInput("1");
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Estimasi per termin: {formatRupiah(cicilanPerTermin)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Tenggat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    value={tenggat}
                    onChange={(e) => setTenggat(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Batas jatuh tempo pelunasan</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Bayar Awal (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full border rounded-lg p-2 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    value={bayarAwalInput}
                    onChange={(e) => handleBayarAwalChange(e.target.value)}
                    onBlur={() => {
                      if (!bayarAwalInput) setBayarAwalInput("0");
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Sisa piutang awal: {formatRupiah(sisaPiutang)}
                  </p>
                </div>
              </div>
            </div>
          )}
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
                  <th className="p-3 border w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const totalQtyProduk = item.productId
                    ? totalQtyByProduct[item.productId] || 0
                    : 0;
                  const melebihiStok =
                    Boolean(item.productId) && totalQtyProduk > item.stokTersedia;

                  return (
                    <tr key={index} className="border-b">
                      <td className="p-2 border">
                        <select
                          className="w-full border rounded p-2 text-sm"
                          value={item.productId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                        >
                          <option value="">-- Pilih Produk --</option>
                          {masterData.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama}
                            </option>
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
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          className={`w-full border rounded p-2 text-center text-sm ${
                            melebihiStok
                              ? "border-red-500 bg-red-50 text-red-700 font-semibold"
                              : ""
                          }`}
                          value={item.qtyInput}
                          onChange={(e) => handleQtyChange(index, e.target.value)}
                          onBlur={() => handleQtyBlur(index)}
                        />
                        {melebihiStok && (
                          <p className="text-[11px] text-red-600 text-center mt-1 font-medium">
                            Melebihi stok!
                          </p>
                        )}
                      </td>
                      <td className="p-2 border text-right font-semibold font-mono text-sm">
                        {formatRupiah(item.subtotal)}
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          type="button"
                          title="Hapus baris barang"
                          aria-label={`Hapus baris ${index + 1}`}
                          onClick={() => removeRow(index)}
                          disabled={items.length === 1}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mt-4">
            <Button type="button" variant="outline" onClick={addRow} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Tambah Baris
            </Button>
            <div className="text-left sm:text-right space-y-1">
              <p className="text-xs text-gray-500">
                Skema:{" "}
                <span className="font-semibold text-gray-700 uppercase">
                  {metodePembayaran}
                </span>
                {metodePembayaran === "utang" && (
                  <>
                    {" "}
                    &bull; {parsedCicilan}x bayar &bull; Tenggat {tenggat || "-"}
                  </>
                )}
              </p>
              <p className="text-sm text-gray-500">Total Tagihan:</p>
              <h2 className="text-3xl font-bold text-blue-600">{formatRupiah(grandTotal)}</h2>
              {metodePembayaran === "cash" ? (
                <p className="text-xs text-amber-700">
                  Status awal: <span className="font-semibold">Belum Lunas</span> (otomatis Lunas setelah dikonfirmasi &amp; Invoice diterbitkan)
                </p>
              ) : (
                <p className="text-xs text-gray-600">
                  Bayar Awal: <span className="font-semibold">{formatRupiah(nominalBayarAwal)}</span>{" "}
                  &bull; Sisa Piutang:{" "}
                  <span className="font-semibold text-rose-600">{formatRupiah(sisaPiutang)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-6 border-t flex justify-end">
          <Button
            type="button"
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
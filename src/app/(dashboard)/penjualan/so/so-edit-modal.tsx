"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  updatePesananPenjualan,
  type OpsiPelangganSO,
  type OpsiProdukSO,
  type PesananPenjualanItem,
} from "./actions";

interface SOEditModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  row: PesananPenjualanItem;
  customers: OpsiPelangganSO[];
  products: OpsiProdukSO[];
}

interface EditItemRow {
  productId: string;
  qtyInput: string;
  hargaSatuan: number;
}

function toInputDate(value: Date | string): string {
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return dateObj.toISOString().split("T")[0];
}

function parseQtyValue(qtyInput: string): number {
  const parsed = parseInt(qtyInput, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

const createEmptyEditRow = (): EditItemRow => ({
  productId: "",
  qtyInput: "1",
  hargaSatuan: 0,
});

export function SOEditModal({
  open,
  onClose,
  onSuccess,
  row,
  customers,
  products,
}: SOEditModalProps) {
  const [customerId, setCustomerId] = useState<string>(
    row.customerId ? String(row.customerId) : ""
  );
  const [tanggal, setTanggal] = useState<string>(() => toInputDate(row.tanggal));
  const [items, setItems] = useState<EditItemRow[]>([createEmptyEditRow()]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerId(row.customerId ? String(row.customerId) : "");
      setTanggal(toInputDate(row.tanggal));

      if (row.items && row.items.length > 0) {
        setItems(
          row.items.map((item) => {
            const produkMaster = products.find((p) => p.id === item.productId);
            return {
              productId: String(item.productId),
              qtyInput: String(Math.max(1, Number(item.qty || 1))),
              hargaSatuan:
                Number(item.hargaSatuan) > 0
                  ? Number(item.hargaSatuan)
                  : Number(produkMaster?.hargaJual || 0),
            };
          })
        );
      } else {
        setItems([createEmptyEditRow()]);
      }
    }
  }, [open, row, products]);

  if (!open) return null;

  const getStokProduk = (productId: string): number => {
    const produkMaster = products.find((p) => String(p.id) === productId);
    return produkMaster ? Number(produkMaster.stok || 0) : 0;
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProduct = products.find((p) => String(p.id) === newProductId);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (!selectedProduct) {
          return {
            ...item,
            productId: "",
            hargaSatuan: 0,
          };
        }
        return {
          ...item,
          productId: newProductId,
          hargaSatuan: Number(selectedProduct.hargaJual || 0),
        };
      })
    );
  };

  const handleQtyChange = (index: number, rawQty: string) => {
    const digitsOnly = rawQty.replace(/[^\d]/g, "");
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qtyInput: digitsOnly } : item))
    );
  };

  const handleQtyBlur = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const qtyAman = parseQtyValue(item.qtyInput);
        return {
          ...item,
          qtyInput: qtyAman > 0 ? String(qtyAman) : "1",
        };
      })
    );
  };

  const handleAddRow = () => {
    setItems((prev) => [...prev, createEmptyEditRow()]);
  };

  const handleRemoveRow = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  // Akumulasi qty diminta per produk di seluruh baris
  const totalQtyByProduct = items.reduce<Record<string, number>>((acc, item) => {
    if (item.productId) {
      acc[item.productId] = (acc[item.productId] || 0) + parseQtyValue(item.qtyInput);
    }
    return acc;
  }, {});

  // Preview harga total real-time
  const previewTotal = items.reduce((sum, item) => {
    const qty = parseQtyValue(item.qtyInput);
    return sum + item.hargaSatuan * qty;
  }, 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      alert("Pilih pelanggan terlebih dahulu.");
      return;
    }
    if (!tanggal) {
      alert("Tanggal transaksi wajib diisi.");
      return;
    }

    const normalizedItems = items.map((item) => {
      const qty = parseQtyValue(item.qtyInput);
      return {
        productId: Number(item.productId),
        productIdStr: item.productId,
        qty,
        hargaSatuan: item.hargaSatuan,
        subtotal: item.hargaSatuan * qty,
      };
    });

    if (normalizedItems.some((i) => !i.productIdStr || i.qty <= 0)) {
      alert("Pastikan semua baris produk terisi dan kuantitas minimal 1!");
      return;
    }

    // Validasi total kuantitas per produk terhadap stok di tabel produk
    for (const [prodIdStr, totalDiminta] of Object.entries(totalQtyByProduct)) {
      const produkMaster = products.find((p) => String(p.id) === prodIdStr);
      const stokTersedia = getStokProduk(prodIdStr);
      if (produkMaster && totalDiminta > stokTersedia) {
        alert(
          `Jumlah stok tidak mencukupi untuk produk "${produkMaster.nama}"!\n` +
            `Stok tersedia: ${stokTersedia}, Kuantitas diminta: ${totalDiminta}.`
        );
        return;
      }
    }

    setIsSaving(true);
    const res = await updatePesananPenjualan({
      id: row.id,
      customerId: Number(customerId),
      tanggal,
      total: previewTotal,
      items: normalizedItems.map(({ productId, qty, hargaSatuan, subtotal }) => ({
        productId,
        qty,
        hargaSatuan,
        subtotal,
      })),
    });
    setIsSaving(false);

    if (res.success) {
      onClose();
      onSuccess();
    } else {
      alert(res.error || "Gagal menyimpan perubahan Sales Order.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-so-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4 shrink-0">
          <div>
            <h3 id="edit-so-modal-title" className="text-lg font-bold text-gray-900">
              Edit Sales Order
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Nomor: <span className="font-semibold text-blue-600">{row.nomor}</span>{" "}
              &bull; Status:{" "}
              <span className="font-semibold uppercase text-gray-700">{row.status}</span>{" "}
              &bull; Stok dipotong saat Invoice diterbitkan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Tutup pop-up edit"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* DATA PELANGGAN & TANGGAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Pelanggan <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Tanggal Transaksi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <hr />

            {/* TABEL ITEM BARANG */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">
                  Detail Pesanan Barang
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Barang
                </Button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-700 border-b">
                      <th className="p-2.5">Produk</th>
                      <th className="p-2.5 w-28 text-center">Stok Produk</th>
                      <th className="p-2.5 w-36 text-right">Harga Satuan</th>
                      <th className="p-2.5 w-28 text-center">Kuantitas</th>
                      <th className="p-2.5 w-40 text-right">Subtotal</th>
                      <th className="p-2.5 w-14 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const qty = parseQtyValue(item.qtyInput);
                      const subtotal = item.hargaSatuan * qty;
                      const stokTersedia = item.productId
                        ? getStokProduk(item.productId)
                        : 0;
                      const totalDimintaProdukIni = item.productId
                        ? totalQtyByProduct[item.productId] || 0
                        : 0;
                      const melebihiStok =
                        Boolean(item.productId) && totalDimintaProdukIni > stokTersedia;

                      return (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="p-2">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                handleProductChange(index, e.target.value)
                              }
                              className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Pilih Produk --</option>
                              {products.map((p) => (
                                <option key={p.id} value={String(p.id)}>
                                  {p.nama}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-2 text-center bg-gray-50 font-medium text-gray-700">
                            {item.productId ? stokTersedia : "-"}
                          </td>

                          <td className="p-2 text-right bg-gray-50 font-mono text-gray-700">
                            {formatRupiah(item.hargaSatuan)}
                          </td>

                          <td className="p-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="1"
                              value={item.qtyInput}
                              onChange={(e) => handleQtyChange(index, e.target.value)}
                              onBlur={() => handleQtyBlur(index)}
                              className={`w-full rounded border p-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                melebihiStok
                                  ? "border-red-500 bg-red-50 text-red-700 font-semibold"
                                  : ""
                              }`}
                            />
                            {melebihiStok && (
                              <p className="text-[11px] text-red-600 text-center mt-1 font-medium">
                                Maks: {stokTersedia}
                              </p>
                            )}
                          </td>

                          <td className="p-2 text-right font-mono font-semibold text-gray-900">
                            {formatRupiah(subtotal)}
                          </td>

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              title="Hapus baris barang"
                              aria-label={`Hapus baris ${index + 1}`}
                              onClick={() => handleRemoveRow(index)}
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
            </div>

            {/* PREVIEW HARGA TOTAL */}
            <div className="p-4 rounded-xl border bg-blue-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-xs text-gray-600">
                Jumlah Baris Produk:{" "}
                <span className="font-semibold text-gray-800">{items.length} item</span>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-gray-500">Preview Harga Total</p>
                <p className="text-2xl font-bold text-blue-600 font-mono">
                  {formatRupiah(previewTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* FOOTER TOMBOL AKSI */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
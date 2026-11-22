"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  updatePesananPenjualan,
  type OpsiPelangganSO,
  type PesananPenjualanItem,
} from "./actions";

interface SOEditModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  row: PesananPenjualanItem;
  customers: OpsiPelangganSO[];
}

function toInputDate(value: Date | string): string {
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return dateObj.toISOString().split("T")[0];
}

export function SOEditModal({
  open,
  onClose,
  onSuccess,
  row,
  customers,
}: SOEditModalProps) {
  const [customerId, setCustomerId] = useState<string>(
    row.customerId ? String(row.customerId) : ""
  );
  const [tanggal, setTanggal] = useState<string>(() => toInputDate(row.tanggal));
  const [totalInput, setTotalInput] = useState<string>(String(Number(row.total || 0)));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerId(row.customerId ? String(row.customerId) : "");
      setTanggal(toInputDate(row.tanggal));
      setTotalInput(String(Number(row.total || 0)));
    }
  }, [open, row]);

  if (!open) return null;

  const parsedTotal = Number(totalInput.replace(/[^\d]/g, "") || 0);

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
    if (parsedTotal <= 0) {
      alert("Total nilai SO harus lebih dari 0.");
      return;
    }

    setIsSaving(true);
    const res = await updatePesananPenjualan({
      id: row.id,
      customerId: Number(customerId),
      tanggal,
      total: parsedTotal,
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
      <div className="w-full max-w-md rounded-xl border bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
          <div>
            <h3 id="edit-so-modal-title" className="text-base font-bold text-gray-900">
              Edit Sales Order
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Nomor: <span className="font-semibold text-blue-600">{row.nomor}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Tutup pop-up edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
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

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              Total Nilai (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => {
                if (!totalInput) setTotalInput("0");
              }}
              className="w-full rounded-lg border p-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">
              Pratinjau: <span className="font-semibold text-gray-800">{formatRupiah(parsedTotal)}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
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
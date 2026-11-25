"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Pencil, Ban } from "lucide-react";
import {
  deletePesananPenjualan,
  type OpsiPelangganSO,
  type OpsiProdukSO,
  type PesananPenjualanItem,
} from "./actions";
import { SOEditModal } from "./so-edit-modal";

interface SOActionMenuProps {
  row: PesananPenjualanItem;
  customers: OpsiPelangganSO[];
  products: OpsiProdukSO[];
}

const STATUS_DIIZINKAN = ["draft", "confirmed", "dikonfirmasi"];

export function SOActionMenu({ row, customers, products }: SOActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batalOpen, setBatalOpen] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const statusLower = (row.status || "").toLowerCase();
  const bisaEditAtauHapus = STATUS_DIIZINKAN.includes(statusLower);

  const handleOpenEdit = () => {
    setOpen(false);
    if (!bisaEditAtauHapus) {
      alert(
        `Dokumen ${row.nomor} berstatus "${row.status}" dan tidak dapat diedit melalui pop-up. Hanya SO berstatus Draft atau Dikonfirmasi yang bisa diedit.`
      );
      return;
    }
    setEditOpen(true);
  };

  const handleBatal = async () => {
    setIsDeleting(true);
    setGalat(null);
    const res = await deletePesananPenjualan(row.id);
    setIsDeleting(false);

    if (res.success) {
      setBatalOpen(false);
      router.refresh();
    } else {
      setGalat(res.error || "Gagal membatalkan Sales Order.");
    }
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        <Button
          type="button"
          size="icon"
          title="Opsi Lainnya"
          variant="ghost"
          disabled={isDeleting}
          onClick={() => setOpen((prev) => !prev)}
        >
          <MoreHorizontal className="h-4 w-4 text-gray-600" />
        </Button>

        {open && (
          <div className="absolute right-0 mt-1 w-40 origin-top-right rounded-lg border bg-white shadow-lg ring-1 ring-black/5 z-50 py-1">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4 text-blue-600" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              disabled={!bisaEditAtauHapus}
              title={
                bisaEditAtauHapus
                  ? undefined
                  : `SO berstatus "${row.status}" tidak dapat dibatalkan.`
              }
              onClick={() => {
                setOpen(false);
                setGalat(null);
                setBatalOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              <Ban className="h-4 w-4" />
              <span>Batalkan</span>
            </button>
          </div>
        )}
      </div>

      {/* NF-18: dialog bersama, bukan window.confirm/alert. */}
      <Dialog open={batalOpen} onOpenChange={setBatalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Sales Order?</DialogTitle>
            <DialogDescription>
              Dokumen{" "}
              <span className="font-medium">{row.nomor}</span> akan ditandai{" "}
              <span className="font-medium">cancelled</span>, bukan dihapus —
              riwayatnya tetap tersimpan agar dapat diaudit. SO yang sudah
              memiliki invoice tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {galat ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {galat}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setBatalOpen(false)}
              disabled={isDeleting}
            >
              Tutup
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleBatal}
              disabled={isDeleting}
            >
              {isDeleting ? "Membatalkan…" : "Batalkan SO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SOEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => router.refresh()}
        row={row}
        customers={customers}
        products={products}
      />
    </>
  );
}
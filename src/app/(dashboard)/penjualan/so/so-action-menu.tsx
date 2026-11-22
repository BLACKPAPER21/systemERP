"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  deletePesananPenjualan,
  type OpsiPelangganSO,
  type PesananPenjualanItem,
} from "./actions";
import { SOEditModal } from "./so-edit-modal";

interface SOActionMenuProps {
  row: PesananPenjualanItem;
  customers: OpsiPelangganSO[];
}

export function SOActionMenu({ row, customers }: SOActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleOpenEdit = () => {
    setOpen(false);
    if (row.status !== "draft") {
      alert(
        `Dokumen ${row.nomor} berstatus "${row.status}" dan tidak dapat diedit melalui pop-up. Hanya SO berstatus Draft yang bisa diedit.`
      );
      return;
    }
    setEditOpen(true);
  };

  const handleDelete = async () => {
    setOpen(false);

    if (row.status !== "draft") {
      alert(
        `Dokumen ${row.nomor} berstatus "${row.status}" dan tidak dapat dihapus. Hanya SO berstatus Draft yang bisa dihapus.`
      );
      return;
    }

    const konfirmasi = window.confirm(
      `Apakah Anda yakin ingin menghapus Sales Order ${row.nomor}? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!konfirmasi) return;

    setIsDeleting(true);
    const res = await deletePesananPenjualan(row.id);
    setIsDeleting(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Gagal menghapus Sales Order.");
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
              onClick={handleDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Hapus</span>
            </button>
          </div>
        )}
      </div>

      <SOEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => router.refresh()}
        row={row}
        customers={customers}
      />
    </>
  );
}
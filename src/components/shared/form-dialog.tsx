"use client";

/* Dialog form master generik (wilayah M1, komponen bersama NF-18).
 * Renders sebagai <Dialog> berisi <form>; onsubmit memanggil action setter.
 */
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FormDialog({
  open,
  onOpenChange,
  judul,
  deskripsi,
  galat,
  proses,
  children,
  onSubmit,
  labelSimpan = "Simpan",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  judul: string;
  deskripsi?: string;
  galat?: string | null;
  proses?: boolean;
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  labelSimpan?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          {deskripsi ? (
            <DialogDescription>{deskripsi}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          {galat ? <p className="text-sm text-destructive">{galat}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={proses}>
              {proses ? "Menyimpan..." : labelSimpan}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Hook kecil untuk mengatur open/close + galat aksi. */
export function useFormDialog() {
  const [open, setOpen] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setGalat(null);
  }, [open]);

  return { open, setOpen, proses, setProses, galat, setGalat };
}

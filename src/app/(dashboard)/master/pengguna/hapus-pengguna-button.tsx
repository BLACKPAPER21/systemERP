"use client";

/* Tombol hapus pengguna — wilayah M1, hanya tampil bagi Owner.
 * Memakai Dialog bersama (NF-18), bukan window.confirm/alert.
 * Penjaga sebenarnya ada di server (hapusPengguna); dialog ini hanya
 * mencegah salah klik — menyembunyikan tombol bukan pengamanan (NF-3).
 */
import { useState } from "react";
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
import { hapusPengguna } from "./actions";

export function HapusPenggunaButton({
  id,
  nama,
  diriSendiri,
}: {
  id: number;
  nama: string;
  diriSendiri: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function onHapus() {
    setProses(true);
    setGalat(null);
    const hasil = await hapusPengguna(id);
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan ?? "Gagal menghapus pengguna.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (diriSendiri) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Anda tidak dapat menghapus akun Anda sendiri"
      >
        Hapus
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700"
        onClick={() => {
          setGalat(null);
          setOpen(true);
        }}
      >
        Hapus
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus pengguna?</DialogTitle>
            <DialogDescription>
              Akun <span className="font-medium">{nama}</span> akan dihapus
              permanen. Akun yang sudah pernah membuat dokumen atau tercatat di
              log audit tidak dapat dihapus — nonaktifkan saja lewat tombol Ubah.
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
              onClick={() => setOpen(false)}
              disabled={proses}
            >
              Batal
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={onHapus}
              disabled={proses}
            >
              {proses ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

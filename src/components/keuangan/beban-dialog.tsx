"use client";
/* MILIK M5 — Form Catat Beban Operasional (J6) */
import { useRouter } from "next/navigation";

import { FormDialog, useFormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hariIniIso } from "@/lib/format";
import { actionCatatBeban } from "@/app/(dashboard)/keuangan/actions";

export function BebanDialog() {
  const router = useRouter();
  const { open, setOpen, proses, setProses, galat, setGalat } = useFormDialog();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    const fd = new FormData(e.currentTarget);
    const hasil = await actionCatatBeban(null, fd);
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Catat Beban</Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        judul="Catat Beban Operasional"
        deskripsi="Jurnal J6 akan terbentuk otomatis: D Beban Operasional / K Kas & Bank"
        galat={galat}
        proses={proses}
        onSubmit={onSubmit}
        labelSimpan="Simpan Beban"
      >
        <div className="space-y-2">
          <Label htmlFor="beban-tanggal">Tanggal</Label>
          <Input
            id="beban-tanggal"
            name="tanggal"
            type="date"
            defaultValue={hariIniIso()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="beban-keterangan">Keterangan</Label>
          <Input
            id="beban-keterangan"
            name="keterangan"
            placeholder="cth: Beban listrik bulan November"
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="beban-jumlah">Jumlah (Rp)</Label>
          <Input
            id="beban-jumlah"
            name="jumlah"
            type="number"
            step="1000"
            min="1"
            placeholder="cth: 500000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="beban-metode">Metode Bayar</Label>
          <select
            id="beban-metode"
            name="metode"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            defaultValue="kas"
          >
            <option value="kas">Kas</option>
            <option value="transfer">Transfer Bank</option>
          </select>
        </div>
      </FormDialog>
    </>
  );
}

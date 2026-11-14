"use client";
/* MILIK M5 — Form Pembayaran ke Supplier (melunasi hutang GRN) */
import { useRouter } from "next/navigation";

import { FormDialog, useFormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hariIniIso, formatRupiah } from "@/lib/format";
import { actionBayarKeSuplier } from "@/app/(dashboard)/keuangan/actions";

interface GrnItem {
  id: number;
  nomor: string;
  total: string;
  namaSupplier: string;
}

export function PembayaranKeluarDialog({ grn }: { grn: GrnItem }) {
  const router = useRouter();
  const { open, setOpen, proses, setProses, galat, setGalat } = useFormDialog();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    const fd = new FormData(e.currentTarget);
    const hasil = await actionBayarKeSuplier(null, fd);
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
      <Button size="sm" onClick={() => setOpen(true)}>
        Bayar
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        judul="Bayar ke Supplier"
        deskripsi={`Melunasi hutang untuk ${grn.nomor} — ${grn.namaSupplier}`}
        galat={galat}
        proses={proses}
        onSubmit={onSubmit}
        labelSimpan="Konfirmasi Pembayaran"
      >
        <input type="hidden" name="grnId" value={grn.id} />
        <div className="space-y-2">
          <Label>Jumlah (Rp)</Label>
          <Input
            name="jumlah"
            type="number"
            step="0.01"
            defaultValue={grn.total}
            readOnly
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Total: <strong>{formatRupiah(grn.total)}</strong> — pelunasan penuh
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tanggal-keluar">Tanggal</Label>
          <Input
            id="tanggal-keluar"
            name="tanggal"
            type="date"
            defaultValue={hariIniIso()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metode-keluar">Metode</Label>
          <select
            id="metode-keluar"
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

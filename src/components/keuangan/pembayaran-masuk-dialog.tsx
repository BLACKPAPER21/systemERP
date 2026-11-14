"use client";
/* MILIK M5 — Form Penerimaan dari Pelanggan (melunasi piutang Invoice) */
import { useRouter } from "next/navigation";

import { FormDialog, useFormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hariIniIso, formatRupiah } from "@/lib/format";
import { actionTerimaFromPelanggan } from "@/app/(dashboard)/keuangan/actions";

interface InvoiceItem {
  id: number;
  nomor: string;
  total: string;
  namaPelanggan: string;
}

export function PembayaranMasukDialog({ invoice }: { invoice: InvoiceItem }) {
  const router = useRouter();
  const { open, setOpen, proses, setProses, galat, setGalat } = useFormDialog();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    const fd = new FormData(e.currentTarget);
    const hasil = await actionTerimaFromPelanggan(null, fd);
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
      <Button size="sm" variant="default" onClick={() => setOpen(true)}>
        Terima Bayar
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        judul="Terima Pembayaran Pelanggan"
        deskripsi={`Melunasi piutang invoice ${invoice.nomor} — ${invoice.namaPelanggan}`}
        galat={galat}
        proses={proses}
        onSubmit={onSubmit}
        labelSimpan="Konfirmasi Penerimaan"
      >
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <div className="space-y-2">
          <Label>Jumlah (Rp)</Label>
          <Input
            name="jumlah"
            type="number"
            step="0.01"
            defaultValue={invoice.total}
            readOnly
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Total tagihan: <strong>{formatRupiah(invoice.total)}</strong> — pelunasan penuh
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tanggal-masuk">Tanggal</Label>
          <Input
            id="tanggal-masuk"
            name="tanggal"
            type="date"
            defaultValue={hariIniIso()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metode-masuk">Metode</Label>
          <select
            id="metode-masuk"
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

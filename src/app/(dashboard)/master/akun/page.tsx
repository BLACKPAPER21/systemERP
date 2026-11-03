/* Halaman Bagan Akun — wilayah M1. Read-only — bagan akun terkunci 8 akun
 * diisi lewat seed (PRD §9.5, §5.1). Baca: owner & keuangan (§4.2).
 */
import { asc } from "drizzle-orm";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { pageAccess } from "@/lib/auth-guard";
import { AksesDitolak } from "@/components/shared/akses-ditolak";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LABEL_TIPE: Record<string, string> = {
  aset: "Aset",
  liabilitas: "Liabilitas",
  ekuitas: "Ekuitas",
  pendapatan: "Pendapatan",
  beban: "Beban",
};

export default async function AkunPage() {
  const akses = await pageAccess(["owner", "keuangan"]);
  if (!akses.ok) return <AksesDitolak pesan={akses.pesan} />;

  const baris = await db.select().from(accounts).orderBy(asc(accounts.kode));

  return (
    <div>
      <PageHeader
        judul="Bagan Akun"
        deskripsi="Bagan akun terkunci pada 8 akun standar dan diisi melalui data seed; tidak dapat ditambah atau diubah."
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Saldo Normal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.kode}</TableCell>
                <TableCell>{a.nama}</TableCell>
                <TableCell>{LABEL_TIPE[a.tipe] ?? a.tipe}</TableCell>
                <TableCell className="capitalize">{a.saldoNormal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

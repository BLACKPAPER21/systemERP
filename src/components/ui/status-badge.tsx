/* Komponen bersama (M1) — Lencana status seragam NF-21.
 *
 * Warna yang sama di seluruh modul: draft abu-abu, approved/confirmed biru,
 * posted/lunas hijau, cancelled merah (peta warna di src/lib/format.ts).
 */
import { cn } from "@/lib/utils";
import {
  STATUS_KELAS,
  STATUS_LABEL,
} from "@/lib/format";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const kelas = STATUS_KELAS[status] ?? "bg-secondary text-secondary-foreground border";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        kelas,
        className,
      )}
    >
      {label}
    </span>
  );
}

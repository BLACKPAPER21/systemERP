/* Penomoran halaman seragam (NF-15, NF-19) — server component berbasis Link. */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  basePath,
  halaman,
  perHalaman,
  total,
  filters,
}: {
  basePath: string;
  halaman: number;
  perHalaman: number;
  total: number;
  filters: Record<string, string>;
}) {
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman));

  function href(ke: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
    if (ke > 1) params.set("halaman", String(ke));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const klasDisable = "pointer-events-none opacity-40";

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        {total === 0
          ? "Tidak ada data."
          : `Halaman ${halaman} dari ${totalHalaman} — ${total} data`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={href(halaman - 1)}
          aria-disabled={halaman <= 1}
          aria-label="Halaman sebelumnya"
          className={
            "inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-muted-foreground hover:bg-accent " +
            (halaman <= 1 ? klasDisable : "")
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={href(halaman + 1)}
          aria-disabled={halaman >= totalHalaman}
          aria-label="Halaman berikutnya"
          className={
            "inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-muted-foreground hover:bg-accent " +
            (halaman >= totalHalaman ? klasDisable : "")
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

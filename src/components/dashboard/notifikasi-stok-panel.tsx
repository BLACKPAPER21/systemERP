"use client";

/* MILIK M6 — Panel popover notifikasi stok kritis.
 *
 * Memakai Popover API bawaan browser (popover="auto" + popoverTarget):
 * otomatis tampil di top layer, tertutup saat klik di luar / tombol Esc.
 * Posisi menempel ke tombol lonceng memakai CSS Anchor Positioning bila
 * didukung; selain itu jatuh ke posisi tetap di pojok kanan atas.
 */
import { useId, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Bell, PackageCheck } from "lucide-react";

import { formatAngka } from "@/lib/format";

import styles from "./notifikasi-stok.module.css";

type ProdukKritis = {
  sku: string;
  nama: string;
  satuan: string;
  stok: number;
  minimum: number;
};

export function NotifikasiStokPanel({
  jumlah,
  daftar,
}: {
  jumlah: number;
  daftar: ProdukKritis[];
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const label =
    jumlah > 0
      ? `Notifikasi stok kritis: ${jumlah} produk`
      : "Notifikasi stok: tidak ada stok kritis";

  /* Link di dalam popover melakukan navigasi klien, jadi tutup popover manual. */
  function tutupBilaLink(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a")) {
      panelRef.current?.hidePopover?.();
    }
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {jumlah > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
            aria-hidden="true"
          >
            {jumlah > 99 ? "99+" : jumlah}
          </span>
        ) : null}
      </button>

      <div
        ref={panelRef}
        id={id}
        popover="auto"
        onClick={tutupBilaLink}
        className={`${styles.panel} w-80 overflow-hidden rounded-lg border bg-popover p-0 text-popover-foreground shadow-lg`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Stok Kritis</p>
          <span className="text-xs text-muted-foreground">
            {formatAngka(jumlah)} produk
          </span>
        </div>

        {daftar.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <PackageCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Semua stok produk aktif di atas batas minimum.
          </p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {daftar.map((p) => (
              <li key={p.sku}>
                <Link
                  href={`/persediaan/kartu-stok?produk=${encodeURIComponent(p.sku)}`}
                  className="block px-4 py-2.5 transition-colors hover:bg-accent"
                >
                  <p className="truncate text-sm font-medium">{p.nama}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.sku} · Stok{" "}
                    <span
                      className={
                        p.stok <= 0
                          ? "font-semibold text-red-700"
                          : "font-semibold text-amber-700"
                      }
                    >
                      {formatAngka(p.stok)} {p.satuan}
                    </span>{" "}
                    / min. {formatAngka(p.minimum)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {jumlah > daftar.length ? (
          <div className="border-t px-4 py-2.5">
            <Link
              href="/persediaan/kartu-stok"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Lihat semua ({formatAngka(jumlah)}){" "}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

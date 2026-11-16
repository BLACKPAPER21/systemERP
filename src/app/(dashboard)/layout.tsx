/* (dashboard) layout — milik M1 (PRD §11.3).
 *
 * - Melindungi semua halaman di dalam grup ini dengan sesi (NF-2).
 * - Daftar menu ditulis sebagai SATU BARIS PER MODUL (dengan penanda komentar)
 *   agar tiap kelompok hanya menyunting baris miliknya — PRD §11.3 catatan.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  Building2,
  BookOpen,
  BookMarked,
  Landmark,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
  Wallet,
  LayoutDashboard,
  ScrollText,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { signOut } from "@/auth";
import { getSesi } from "@/lib/auth-guard";
import type { Peran } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";

interface MenuItem {
  href: string;
  label: string;
  roles: Peran[];
  icon: LucideIcon;
}

/* Daftar menu — satu baris per modul. */
const MENU: MenuItem[] = [
  // ---- M6 — Dashboard (baris milik M6) ----
  {
    href: "/",
    label: "Dashboard",
    roles: ["owner", "keuangan"],
    icon: LayoutDashboard,
  },
  // ---- M1 — Master Data (baris milik M1) ----
  {
    href: "/master/produk",
    label: "Produk",
    roles: ["owner", "gudang", "sales", "keuangan"],
    icon: Boxes,
  },
  {
    href: "/master/supplier",
    label: "Supplier",
    roles: ["owner", "gudang", "keuangan"],
    icon: Building2,
  },
  {
    href: "/master/pelanggan",
    label: "Pelanggan",
    roles: ["owner", "sales", "keuangan"],
    icon: Store,
  },
  {
    href: "/master/akun",
    label: "Bagan Akun",
    roles: ["owner", "keuangan"],
    icon: Landmark,
  },
  {
    href: "/master/pengguna",
    label: "Pengguna",
    roles: ["owner"],
    icon: Users,
  },
  {
    href: "/audit",
    label: "Log Audit",
    roles: ["owner"],
    icon: ScrollText,
  },
  // ---- M2 — Pembelian (baris milik M2) ----
  {
    href: "/pembelian/po",
    label: "Pesanan Pembelian",
    roles: ["owner", "gudang", "keuangan"],
    icon: ShoppingCart,
  },
  // ---- M3 — Persediaan (baris milik M3) ----
  {
    href: "/persediaan/kartu-stok",
    label: "Kartu Stok",
    roles: ["owner", "gudang", "sales", "keuangan"],
    icon: Boxes,
  },
  // ---- M4 — Penjualan (baris milik M4) ----
  {
    href: "/penjualan/so",
    label: "Pesanan Penjualan",
    roles: ["owner", "gudang", "sales", "keuangan"],
    icon: Receipt,
  },
  // ---- M5 — Keuangan (baris milik M5) ----
  {
    href: "/keuangan/pembayaran",
    label: "Pembayaran",
    roles: ["owner", "keuangan"],
    icon: Wallet,
  },
  {
    href: "/keuangan/jurnal",
    label: "Jurnal Umum",
    roles: ["owner", "keuangan"],
    icon: BookOpen,
  },
  {
    href: "/keuangan/buku-besar",
    label: "Buku Besar",
    roles: ["owner", "keuangan"],
    icon: BookMarked,
  },
  {
    href: "/keuangan/beban",
    label: "Beban Operasional",
    roles: ["owner", "keuangan"],
    icon: Receipt,
  },
  {
    href: "/keuangan/laporan",
    label: "Laporan Keuangan",
    roles: ["owner", "keuangan"],
    icon: TrendingUp,
  },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesi = await getSesi();
  if (!sesi) {
    redirect("/login"); // NF-2 — semua halaman di grup ini wajib sesi
  }
  const peran = sesi.peran;
  const menu = MENU.filter((m) => m.roles.includes(peran));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="border-b px-5 py-4">
          <p className="text-base font-semibold tracking-tight">SystemERP</p>
          <p className="text-xs text-muted-foreground">UMKM Retail/Distribusi</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="border-t px-3 py-3"
        >
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-6 py-3">
          <p className="text-sm font-medium md:hidden">SystemERP</p>
          <p className="hidden text-sm md:block">
            Daftar menu di sidebar menampilkan modul yang dapat Anda akses
            sesuai peran.
            <ShieldCheck className="ml-2 inline h-4 w-4 align-text-bottom text-muted-foreground" />
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">{sesi!.nama}</span>
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {peran}
            </span>
          </p>
        </header>
        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}

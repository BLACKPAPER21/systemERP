import Link from "next/link";
import {
  Boxes,
  Building2,
  Landmark,
  ScrollText,
  Store,
  Users,
  ArrowRight,
} from "lucide-react";

import { getSesi } from "@/lib/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const sesi = await getSesi();

  const modulAktif = [
    {
      title: "Master Produk",
      desc: "Katalog produk, satuan, harga jual, dan stok minimum.",
      href: "/master/produk",
      icon: Boxes,
      color: "text-blue-500",
    },
    {
      title: "Master Supplier",
      desc: "Data pemasok barang dan riwayat kontak.",
      href: "/master/supplier",
      icon: Building2,
      color: "text-amber-500",
    },
    {
      title: "Master Pelanggan",
      desc: "Data pelanggan, kontak, dan alamat.",
      href: "/master/pelanggan",
      icon: Store,
      color: "text-emerald-500",
    },
    {
      title: "Bagan Akun (CoA)",
      desc: "Daftar 8 akun terkunci dan bagan akun keuangan.",
      href: "/master/akun",
      icon: Landmark,
      color: "text-purple-500",
    },
    {
      title: "Manajemen Pengguna",
      desc: "Kelola staf pengguna dan penetapan peran (RBAC).",
      href: "/master/pengguna",
      icon: Users,
      color: "text-indigo-500",
      roles: ["owner"],
    },
    {
      title: "Log Audit",
      desc: "Rekaman histori perubahan data oleh pengguna.",
      href: "/audit",
      icon: ScrollText,
      color: "text-slate-500",
      roles: ["owner"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Selamat Datang di SystemERP</h1>
        <p className="text-muted-foreground">
          Masuk sebagai <strong className="text-foreground">{sesi?.nama}</strong> ({sesi?.peran}).
          Sistem ERP terintegrasi untuk UMKM Retail dan Distribusi.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulAktif
          .filter((m) => !m.roles || (sesi?.peran && m.roles.includes(sesi.peran)))
          .map((item) => (
            <Link key={item.href} href={item.href} className="group transition-transform hover:-translate-y-0.5">
              <Card className="h-full border transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{item.desc}</CardDescription>
                  <span className="inline-flex items-center text-xs font-medium text-primary group-hover:underline">
                    Buka modul <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}


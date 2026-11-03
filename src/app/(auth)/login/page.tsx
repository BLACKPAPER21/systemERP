/* Halaman masuk — milik M1 (PRD §5.1, NF-2).
 * Menampilkan daftar kredensial demo (seed) agar dosen/pengguna bisa masuk.
 */
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

// Kredensial demo dibuat oleh seed (PRD §9.6) — ditampilkan di halaman masuk.
const DEMO = [
  { peran: "Owner", email: "owner@demo.id" },
  { peran: "Staf Gudang", email: "gudang@demo.id" },
  { peran: "Kasir / Sales", email: "sales@demo.id" },
  { peran: "Staf Keuangan", email: "keuangan@demo.id" },
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/master/produk");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">SystemERP</h1>
          <p className="text-sm text-muted-foreground">
            Sistem ERP Terintegrasi untuk UMKM Retail/Distribusi
          </p>
        </div>

        <LoginForm />

        <div className="rounded-lg border bg-card p-4 text-sm">
          <p className="mb-2 font-medium">Akun demo (kata sandi: demo123)</p>
          <ul className="space-y-1 text-muted-foreground">
            {DEMO.map((d) => (
              <li key={d.email} className="flex justify-between gap-4">
                <span>{d.peran}</span>
                <code className="text-xs">{d.email}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

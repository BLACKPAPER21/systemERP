import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystemERP",
  description:
    "SystemERP — Sistem ERP Terintegrasi untuk UMKM Retail/Distribusi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* suppressHydrationWarning: ekstensi browser menyuntik class (mis. vc-init)
          ke <body> sebelum hidrasi — jangan biarkan React protes di dev (NF-18). */}
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Fase 0 — kerangka bersama SystemERP (PRD §11) */

  /* Dev server diakses dari jaringan lokal lewat IP (169.254.3.46:3000).
   * Tanpa ini Next 16 memblokir aset dev /_next/* dari Origin LAN
   * → JS klien gagal termuat → form disubmit native. (NF-2) */
  allowedDevOrigins: ["169.254.3.46"],
};

export default nextConfig;

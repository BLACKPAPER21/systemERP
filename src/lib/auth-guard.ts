/* MILIK M1 — Penjaga sesi & peran (PRD §7.4, NF-2, NF-3)
 *
 * Dipanggil di BARIS PERTAMA setiap Server Action di seluruh modul,
 * dan saat memuat halaman yang butuh peran tertentu.
 * Melempar galat bila: sesi tidak ada (NF-2) atau peran tidak diizinkan (NF-3).
 * Pesan galat tidak membocorkan detail internal (NF-7).
 */
import { auth } from "@/auth";

export type Peran = "owner" | "gudang" | "sales" | "keuangan";

export interface SesiPengguna {
  userId: number;
  nama: string;
  peran: Peran;
}

export class AuthError extends Error {
  status: "unauthorized" | "forbidden";

  constructor(message: string, status: "unauthorized" | "forbidden") {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Dipakai di server (Server Component / Server Action). */
export async function requireRole(
  roles: Peran[],
): Promise<SesiPengguna> {
  const session = await auth();

  if (!session?.user) {
    throw new AuthError(
      "Anda belum masuk. Silakan masuk terlebih dahulu.",
      "unauthorized",
    );
  }

  const peran = session.user.peran as Peran | undefined;
  const nama = session.user.nama ?? "";
  const userId = session.user.id as number | undefined;

  if (typeof userId !== "number" || !peran) {
    throw new AuthError("Sesi tidak sah. Silakan masuk kembali.", "unauthorized");
  }

  if (!roles.includes(peran)) {
    throw new AuthError(
      "Peran Anda tidak memiliki akses untuk aksi ini.",
      "forbidden",
    );
  }

  return { userId, nama, peran };
}

/** Versi ringan untuk halaman: mengembalikan sesi atau null (tanpa galat). */
export async function getSesi(): Promise<SesiPengguna | null> {
  try {
    return await requireRole(
      ["owner", "gudang", "sales", "keuangan"],
    );
  } catch {
    return null;
  }
}

/**
 * Penjaga untuk halaman (Server Component): setelah layout memastikan sesi
 * (NF-2), halaman memeriksa peran server-side (NF-3). Bila peran tidak
 * diizinkan dikembalikan hasil `ok: false` — halaman menampilkan panel
 * "Akses ditolak", bukan hanya menyembunyikan tombol.
 */
export async function pageAccess(
  roles: Peran[],
): Promise<{ ok: true; sesi: SesiPengguna } | { ok: false; pesan: string }> {
  const sesi = await getSesi();
  if (!sesi) {
    return { ok: false, pesan: "Anda belum masuk." };
  }
  if (!roles.includes(sesi.peran)) {
    return {
      ok: false,
      pesan: "Peran Anda tidak memiliki akses ke halaman ini.",
    };
  }
  return { ok: true, sesi };
}

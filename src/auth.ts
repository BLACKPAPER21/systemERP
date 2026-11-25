/* MILIK M1 — Konfigurasi Auth.js (credentials) — PRD §11.1, NF-1, NF-2
 *
 * Email + kata sandi (bcrypt), sesi JWT.
 * Kombinasi stabil dipilih: next-auth@5.0.0-beta.32 + Next.js 16 (lihat README).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";

const skemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Galat sesi tidak perlu menumpahkan jejak tumpukan ke konsol (NF-7).
  // JWTSessionError sudah ditangani sesiSaatIni() di bawah.
  logger: {
    error(galat) {
      if (galat?.name === "JWTSessionError") return;
      console.error("[auth]", galat?.message ?? galat);
    },
    warn() {},
    debug() {},
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // setengah hari
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Kredensial",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = skemaLogin.safeParse(raw);
        if (!parsed.success) return null; // NF-4 — validasi sisi server

        const rows = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);
        const user = rows[0];

        if (!user || !user.aktif) return null;
        const cocok = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!cocok) return null;

        return {
          id: String(user.id),
          nama: user.nama,
          email: user.email,
          peran: user.peran,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.peran = (user as { peran?: string }).peran;
        token.nama = (user as { nama?: string }).nama;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id: number }).id = token.id as number;
        session.user.peran = token.peran as string;
        session.user.nama = token.nama as string;
      }
      return session;
    },
  },
});

/* ======================================================================
 * sesiSaatIni — membaca sesi tanpa membuat halaman jebol.
 *
 * Cookie sesi terenkripsi dengan AUTH_SECRET. Bila nilainya berubah
 * (rotasi kunci, pindah lingkungan, .env.local baru), cookie lama di
 * peramban tidak lagi dapat didekripsi dan Auth.js melempar
 * JWTSessionError. Tanpa penanganan, galat itu bahkan menjatuhkan
 * halaman /login — satu-satunya tempat pengguna bisa memulihkan diri.
 *
 * Cookie yang tidak terbaca diperlakukan sama seperti tidak ada cookie:
 * pengguna dianggap belum masuk. Begitu ia masuk lagi, cookie lama
 * tertimpa yang baru, jadi keadaannya pulih sendiri.
 * ====================================================================== */
export async function sesiSaatIni() {
  try {
    return await auth();
  } catch (galat) {
    const nama = (galat as { name?: string })?.name;
    if (nama === "JWTSessionError" || nama === "JWEDecryptionFailed") {
      return null;
    }
    throw galat;
  }
}

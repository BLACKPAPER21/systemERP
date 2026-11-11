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

/* Augmentasi tipe next-auth — milik M1 (kolom `peran` & `id` numerik). */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      peran?: string;
      nama?: string;
    } & Omit<DefaultSession["user"], "id">;
  }

  interface User {
    id?: string;
    peran?: string;
    nama?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: number;
    peran?: string;
    nama?: string;
  }
}

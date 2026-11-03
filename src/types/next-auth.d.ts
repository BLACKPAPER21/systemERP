/* Augmentasi tipe next-auth — milik M1 (kolom `peran` & `id` numerik). */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      peran?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    peran?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: number;
    peran?: string;
  }
}

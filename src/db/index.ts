/* Koneksi DB untuk Next.js (baca DATABASE_URL dari .env.local secara otomatis)
 * serta untuk skrip (seed) melalui dotenv.
 * Pool tunggal dipakai ulang pada hot-reload Next.js.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

/* Semua fungsi layanan lintas modul menerima `tx` sebagai parameter pertama
 * dan TIDAK membuka transaksi sendiri (K-3). Batas transaksi ditentukan
 * pemanggil lewat db.transaction() — syarat AB-12.
 */
export type Transaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

/** Helper: membungkus pekerjaan dalam satu transaksi atomik (NF-8 / AB-12). */
export function withTransaction<T>(
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => work(tx));
}

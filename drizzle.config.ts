/* drizzle-kit config — MIGRASI HANYA DIJALANKAN M1 (PRD §12.3) */
import { config } from "dotenv";

config({ path: ".env.local" });
config(); // fallback .env

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL tidak ditemukan. Isi .env.local (jangan pernah di-commit).",
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: false,
  verbose: true,
});

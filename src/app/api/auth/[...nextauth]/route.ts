/* Route handler NextAuth — milik M1 (PRD §11.1).
 * Endpoint /api/auth/* (csrf, callback/credentials, session, signout).
 * Tanpa file ini signIn() klien akan menerima 404.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

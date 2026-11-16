"use server";

import { db } from "@/db";
import { salesOrders } from "@/db/schema/sales";
import { customers, users } from "@/db/schema/master";
import { desc, eq, sql } from "drizzle-orm";

export async function getPesananPenjualan() {
  try {
    const data = await db
      .select({
        id: salesOrders.id,
        nomor: salesOrders.nomor,
        tanggal: salesOrders.tanggal,
        status: salesOrders.status,
        total: salesOrders.total,
        namaCustomer: customers.nama, 
        dibuatOleh: users.nama,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .leftJoin(users, eq(salesOrders.dibuatOleh, users.id))
      .orderBy(desc(salesOrders.id));

    const ringkasan = await db
      .select({
        totalPendapatan: sql<number>`COALESCE(SUM(CASE WHEN ${salesOrders.status} IN ('confirmed', 'invoiced') THEN ${salesOrders.total} ELSE 0 END), 0)`,
        pesananDraft: sql<number>`COUNT(CASE WHEN ${salesOrders.status} = 'draft' THEN 1 END)`,
        pesananConfirmed: sql<number>`COUNT(CASE WHEN ${salesOrders.status} = 'confirmed' THEN 1 END)`,
        totalPesanan: sql<number>`COUNT(${salesOrders.id})`,
      })
      .from(salesOrders);

    return {
      success: true,
      data: data,
      ringkasan: ringkasan[0],
    };
  } catch (error) {
    console.error("Gagal mengambil data pesanan penjualan:", error);
    return {
      success: false,
      data: [],
      ringkasan: { totalPendapatan: 0, pesananDraft: 0, pesananConfirmed: 0, totalPesanan: 0 },
      error: "Terjadi kesalahan pada server saat memuat data.",
    };
  }
}
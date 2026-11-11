"use server";

import { db } from "@/db";
import { invoices, salesOrders } from "@/db/schema/sales";
import { customers } from "@/db/schema/master";
import { desc, eq, sql } from "drizzle-orm";

export async function getInvoices() {
  try {
    // Mengambil daftar Invoice, join dengan SO untuk dapat ID Customer, lalu join ke Customer
    const data = await db
      .select({
        id: invoices.id,
        nomorInvoice: invoices.nomor,
        nomorSO: salesOrders.nomor,
        tanggal: invoices.tanggal,
        jatuhTempo: invoices.jatuhTempo,
        total: invoices.total,
        status: invoices.status,
        statusBayar: invoices.statusBayar,
        namaCustomer: customers.nama,
      })
      .from(invoices)
      .leftJoin(salesOrders, eq(invoices.soId, salesOrders.id))
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .orderBy(desc(invoices.id));

    // Menghitung metrik ringkasan untuk Widget Dashboard Piutang
    const ringkasan = await db
      .select({
        totalTagihan: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
        totalLunas: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.statusBayar} = 'lunas' THEN ${invoices.total} ELSE 0 END), 0)`,
        totalPiutang: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.statusBayar} = 'belum' THEN ${invoices.total} ELSE 0 END), 0)`,
        jumlahUnpaid: sql<number>`COUNT(CASE WHEN ${invoices.statusBayar} = 'belum' THEN 1 END)`,
      })
      .from(invoices);

    return {
      success: true,
      data: data,
      ringkasan: ringkasan[0],
    };
  } catch (error) {
    console.error("Gagal mengambil data invoice:", error);
    return {
      success: false,
      data: [],
      ringkasan: { totalTagihan: 0, totalLunas: 0, totalPiutang: 0, jumlahUnpaid: 0 },
      error: "Terjadi kesalahan pada server saat memuat data tagihan.",
    };
  }
}
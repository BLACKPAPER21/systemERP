"use server";

import { db } from "@/db";
import { salesOrders, salesOrderItems, invoices } from "@/db/schema/sales";
import { customers, products, users } from "@/db/schema/master";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 1. Mengambil Detail Data Master & Item
export async function getDetailSO(id: number) {
  try {
    const [so] = await db
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
      .where(eq(salesOrders.id, id));

    if (!so) {
      return { success: false, error: "Dokumen Sales Order tidak ditemukan di database." };
    }

    const items = await db
      .select({
        id: salesOrderItems.id,
        productId: salesOrderItems.productId,
        namaProduk: products.nama,
        qty: salesOrderItems.qty,
        hargaSatuan: salesOrderItems.hargaSatuan,
        subtotal: salesOrderItems.subtotal,
      })
      .from(salesOrderItems)
      .leftJoin(products, eq(salesOrderItems.productId, products.id))
      .where(eq(salesOrderItems.soId, id));

    return {
      success: true,
      data: { ...so, items },
    };
  } catch (error) {
    console.error("Gagal mengambil detail SO:", error);
    return { success: false, error: "Terjadi kesalahan server saat mengambil detail data." };
  }
}

// 2. Fungsi Konfirmasi Pesanan (Update Status)
export async function confirmSO(id: number) {
  try {
    await db.update(salesOrders)
      .set({ status: "confirmed" })
      .where(eq(salesOrders.id, id));
      
    revalidatePath(`/penjualan/so/${id}`);
    revalidatePath(`/penjualan/so`);
    
    return { success: true };
  } catch (error) {
    console.error("Gagal update status SO:", error);
    return { success: false, error: "Gagal mengkonfirmasi Sales Order." };
  }
}

// 3. Fungsi Transaksional: Buat Invoice & Potong Stok Inventory
export async function generateInvoiceAndCutStock(soId: number) {
  try {
    // Memulai Database Transaction (Jika 1 gagal, semua di-rollback)
    await db.transaction(async (tx) => {
      // A. Ambil & Validasi Data SO
      const [so] = await tx.select().from(salesOrders).where(eq(salesOrders.id, soId));
      if (!so) throw new Error("Sales Order tidak ditemukan.");
      if (so.status !== "confirmed") throw new Error("Hanya SO berstatus CONFIRMED yang dapat di-invoice.");

      // B. Ambil Detail Item
      const items = await tx.select().from(salesOrderItems).where(eq(salesOrderItems.soId, soId));
      if (items.length === 0) throw new Error("Tidak ada item barang dalam pesanan ini.");

      let totalHpp = 0;

      // C. Loop Item untuk Potong Stok & Hitung HPP
      for (const item of items) {
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!prod) throw new Error(`Data produk dengan ID ${item.productId} tidak ditemukan.`);

        // Validasi ketersediaan stok fisik di gudang
        if (Number(prod.stokSaatIni) < Number(item.qty)) {
          throw new Error(`Stok produk "${prod.nama}" tidak mencukupi! Sisa: ${prod.stokSaatIni}, Diminta: ${item.qty}`);
        }

        // Kalkulasi HPP (Asumsi: Menggunakan hargaBeli jika ada, atau 70% dari hargaJual sebagai estimasi jika kolom hargaBeli kosong)
        // @ts-ignore - Toleransi jika kolom hargaBeli belum didefinisikan secara strict di schema
        const hppSatuan = prod.hargaBeli ? Number(prod.hargaBeli) : Number(prod.hargaJual) * 0.7;
        const subtotalHpp = Number(item.qty) * hppSatuan;
        totalHpp += subtotalHpp;

        // Eksekusi Potong Stok (Inventory Out)
        await tx.update(products)
          .set({ stokSaatIni: sql`${products.stokSaatIni} - ${item.qty}` })
          .where(eq(products.id, item.productId));
      }

      // D. Generate Dokumen Invoice
      const date = new Date();
      const randomStr = Math.floor(1000 + Math.random() * 9000);
      const nomorInvoice = `INV/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${randomStr}`;

      // Jatuh tempo diset otomatis 30 hari dari sekarang
      const jatuhTempo = new Date(date);
      jatuhTempo.setDate(jatuhTempo.getDate() + 30);

      await tx.insert(invoices).values({
        nomor: nomorInvoice,
        soId: so.id,
        tanggal: date.toISOString().split("T")[0],
        jatuhTempo: jatuhTempo.toISOString().split("T")[0],
        total: so.total,
        totalHpp: String(totalHpp), // Direkam untuk modul Keuangan (Jurnal 4) nantinya
        status: "posted", 
        statusBayar: "belum",
      });

      // E. Update Status SO
      await tx.update(salesOrders)
        .set({ status: "invoiced" })
        .where(eq(salesOrders.id, so.id));
    });

    // Refresh Cache UI
    revalidatePath(`/penjualan/so/${soId}`);
    revalidatePath(`/penjualan/so`);
    return { success: true };

  } catch (error: any) {
    console.error("Gagal Generate Invoice:", error);
    // Mengembalikan pesan error spesifik (misal: stok tidak cukup) ke Frontend
    return { success: false, error: error.message || "Gagal memproses Invoice dan memotong stok." };
  }
}
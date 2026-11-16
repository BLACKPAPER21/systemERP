"use server";

import { db } from "@/db";
import { salesOrders, salesOrderItems } from "@/db/schema/sales";
import { customers, products } from "@/db/schema/master";
import { revalidatePath } from "next/cache";

// 1. Mengambil data dari Modul Master & Inventory
export async function getFormOptions() {
  try {
    const listCustomer = await db
      .select({ id: customers.id, nama: customers.nama })
      .from(customers);

    // Menarik produk dari inventory beserta harga dan stoknya
    const listProduct = await db
      .select({ 
        id: products.id, 
        nama: products.nama, 
        hargaJual: products.hargaJual,
        stok: products.stokSaatIni 
      })
      .from(products);

    return {
      success: true,
      customers: listCustomer,
      products: listProduct,
    };
  } catch (error) {
    console.error("Gagal mengambil master data:", error);
    return { success: false, customers: [], products: [] };
  }
}

// 2. Menyimpan Transaksi SO dan Detail Itemnya (Database Transaction)
export async function createSO(data: any) {
  try {
    // Membungkus dalam transaksi agar jika detail gagal, master ikut dibatalkan
    await db.transaction(async (tx) => {
      // Generate Nomor SO sederhana (Format: SO/YYYY/MM/RND)
      // Jika Anda memiliki services/numbering.ts, Anda bisa menggantinya nanti.
      const date = new Date();
      const random = Math.floor(1000 + Math.random() * 9000);
      const nomorSO = `SO/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${random}`;

      // Insert ke tabel Master (sales_orders)
      const [newSo] = await tx.insert(salesOrders).values({
        nomor: nomorSO,
        customerId: Number(data.customerId),
        tanggal: data.tanggal,
        status: "draft",
        total: String(data.total),
        dibuatOleh: 1, // HARDCODE SEMENTARA: Ganti dengan ID User (Auth Session) nanti
      }).returning({ id: salesOrders.id });

      // Siapkan array data untuk tabel Detail (sales_order_items)
      const itemsToInsert = data.items.map((item: any) => ({
        soId: newSo.id,
        productId: Number(item.productId),
        qty: String(item.qty),
        hargaSatuan: String(item.harga),
        subtotal: String(item.subtotal),
      }));

      // Insert ke tabel Detail
      await tx.insert(salesOrderItems).values(itemsToInsert);
    });

    // Refresh cache agar tabel di halaman depan langsung terupdate
    revalidatePath("/penjualan/so");
    return { success: true };

  } catch (error) {
    console.error("Gagal menyimpan Sales Order:", error);
    return { success: false, error: "Terjadi kesalahan sistem saat menyimpan data." };
  }
}
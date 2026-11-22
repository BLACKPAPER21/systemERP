"use server";

import { db } from "@/db";
import { salesOrders, salesOrderItems } from "@/db/schema/sales";
import { customers, products } from "@/db/schema/master";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";

export interface CreateSOItemInput {
  productId: string | number;
  qty: number;
  harga: number;
  subtotal: number;
}

export interface CreateSOPayload {
  customerId: string | number;
  tanggal: string;
  total: number;
  metodePembayaran?: "cash" | "utang";
  jumlahCicilan?: number;
  tenggat?: string | null;
  bayarAwal?: number;
  sisaPiutang?: number;
  statusPelunasan?: "Lunas" | "Belum Lunas";
  items: CreateSOItemInput[];
}

// 1. Mengambil data dari Modul Master & Inventory
export async function getFormOptions() {
  try {
    const listCustomer = await db
      .select({ id: customers.id, nama: customers.nama })
      .from(customers);

    const listProduct = await db
      .select({
        id: products.id,
        nama: products.nama,
        hargaJual: products.hargaJual,
        stok: products.stokSaatIni,
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
export async function createSO(data: CreateSOPayload) {
  try {
    await requireRole(["owner", "sales"]);

    const metode = data.metodePembayaran === "utang" ? "utang" : "cash";
    const totalNilai = Math.max(0, Number(data.total || 0));
    const jumlahCicilan =
      metode === "utang" ? Math.max(1, Number(data.jumlahCicilan || 1)) : 1;
    const tenggat = metode === "utang" ? data.tenggat || null : null;
    const bayarAwal =
      metode === "cash"
        ? totalNilai
        : Math.max(0, Math.min(Number(data.bayarAwal || 0), totalNilai));
    const sisaPiutang =
      metode === "cash" ? 0 : Math.max(0, totalNilai - bayarAwal);

    await db.transaction(async (tx) => {
      const date = new Date();
      const random = Math.floor(1000 + Math.random() * 9000);
      const nomorSO = `SO/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${random}`;

      // TODO: Jika kolom metodePembayaran, jumlahCicilan, tenggat, bayarAwal, sisaPiutang
      // sudah ditambahkan ke tabel `salesOrders` di `src/db/schema/sales.ts`, petakan di sini.
      const [newSo] = await tx
        .insert(salesOrders)
        .values({
          nomor: nomorSO,
          customerId: Number(data.customerId),
          tanggal: data.tanggal,
          status: "draft",
          total: String(totalNilai),
          dibuatOleh: 1,
        })
        .returning({ id: salesOrders.id });

      const itemsToInsert = data.items.map((item) => ({
        soId: newSo.id,
        productId: Number(item.productId),
        qty: String(item.qty),
        hargaSatuan: String(item.harga),
        subtotal: String(item.subtotal),
      }));

      await tx.insert(salesOrderItems).values(itemsToInsert);
    });

    revalidatePath("/penjualan/so");
    return {
      success: true,
      pembayaran: {
        metodePembayaran: metode,
        jumlahCicilan,
        tenggat,
        bayarAwal,
        sisaPiutang,
      },
    };
  } catch (error) {
    console.error("Gagal menyimpan Sales Order:", error);
    return { success: false, error: "Terjadi kesalahan sistem saat menyimpan data." };
  }
}
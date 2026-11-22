"use server";

import { db } from "@/db";
import { salesOrders, salesOrderItems } from "@/db/schema/sales";
import { customers, users } from "@/db/schema/master";
import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";

export type ItemDaftarBayar = {
  id: string | number;
  tanggal: string | Date | null;
  nominal: number;
  metode?: string | null;
  keterangan?: string | null;
};

export type PesananPenjualanItem = {
  id: number;
  nomor: string;
  tanggal: Date | string;
  status: string;
  total: number;
  customerId: number | null;
  namaCustomer: string | null;
  dibuatOleh: string | null;
  daftarBayar: ItemDaftarBayar[];
  totalBayar: number;
  sisaPiutang: number;
  statusPelunasan: "Lunas" | "Belum Lunas";
};

export type OpsiPelangganSO = {
  id: number;
  nama: string;
};

export type UpdateSOPopupPayload = {
  id: number;
  customerId: number;
  tanggal: string;
  total: number;
};

function hitungPelunasan(totalNilai: number, daftarBayar: ItemDaftarBayar[]) {
  const totalAman = Math.max(0, Number(totalNilai || 0));
  const totalBayar = daftarBayar.reduce(
    (acc, item) => acc + Math.max(0, Number(item.nominal || 0)),
    0
  );
  const sisaPiutang = Math.max(0, totalAman - totalBayar);
  const statusPelunasan: "Lunas" | "Belum Lunas" =
    totalAman > 0 && sisaPiutang === 0 ? "Lunas" : "Belum Lunas";

  return {
    totalBayar,
    sisaPiutang,
    statusPelunasan,
  };
}

export async function getPesananPenjualan() {
  try {
    const [rows, listCustomer, ringkasan] = await Promise.all([
      db
        .select({
          id: salesOrders.id,
          nomor: salesOrders.nomor,
          tanggal: salesOrders.tanggal,
          status: salesOrders.status,
          total: salesOrders.total,
          customerId: salesOrders.customerId,
          namaCustomer: customers.nama,
          dibuatOleh: users.nama,
        })
        .from(salesOrders)
        .leftJoin(customers, eq(salesOrders.customerId, customers.id))
        .leftJoin(users, eq(salesOrders.dibuatOleh, users.id))
        .orderBy(desc(salesOrders.id)),
      db
        .select({
          id: customers.id,
          nama: customers.nama,
        })
        .from(customers),
      db
        .select({
          totalPendapatan: sql<number>`COALESCE(SUM(CASE WHEN ${salesOrders.status} IN ('confirmed', 'invoiced') THEN ${salesOrders.total} ELSE 0 END), 0)`,
          pesananDraft: sql<number>`COUNT(CASE WHEN ${salesOrders.status} = 'draft' THEN 1 END)`,
          pesananConfirmed: sql<number>`COUNT(CASE WHEN ${salesOrders.status} = 'confirmed' THEN 1 END)`,
          totalPesanan: sql<number>`COUNT(${salesOrders.id})`,
        })
        .from(salesOrders),
    ]);

    const data: PesananPenjualanItem[] = rows.map((row) => {
      const daftarBayar: ItemDaftarBayar[] = [];
      const totalNilai = Number(row.total || 0);
      const { totalBayar, sisaPiutang, statusPelunasan } = hitungPelunasan(
        totalNilai,
        daftarBayar
      );

      return {
        id: row.id,
        nomor: row.nomor,
        tanggal: row.tanggal,
        status: row.status,
        total: totalNilai,
        customerId: row.customerId,
        namaCustomer: row.namaCustomer,
        dibuatOleh: row.dibuatOleh,
        daftarBayar,
        totalBayar,
        sisaPiutang,
        statusPelunasan,
      };
    });

    return {
      success: true,
      data,
      customers: listCustomer as OpsiPelangganSO[],
      ringkasan: ringkasan[0],
    };
  } catch (error) {
    console.error("Gagal mengambil data pesanan penjualan:", error);
    return {
      success: false,
      data: [] as PesananPenjualanItem[],
      customers: [] as OpsiPelangganSO[],
      ringkasan: {
        totalPendapatan: 0,
        pesananDraft: 0,
        pesananConfirmed: 0,
        totalPesanan: 0,
      },
      error: "Terjadi kesalahan pada server saat memuat data.",
    };
  }
}

export async function updatePesananPenjualan(payload: UpdateSOPopupPayload) {
  try {
    await requireRole(["owner", "sales"]);

    const id = Number(payload.id);
    const customerId = Number(payload.customerId);
    const totalNilai = Number(payload.total);

    if (!id || !customerId) {
      return { success: false, error: "Pelanggan wajib dipilih." };
    }
    if (!payload.tanggal) {
      return { success: false, error: "Tanggal transaksi wajib diisi." };
    }
    if (Number.isNaN(totalNilai) || totalNilai <= 0) {
      return { success: false, error: "Total nilai SO harus lebih dari 0." };
    }

    const [existing] = await db
      .select({ id: salesOrders.id, status: salesOrders.status })
      .from(salesOrders)
      .where(eq(salesOrders.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Dokumen Sales Order tidak ditemukan." };
    }

    if (existing.status !== "draft") {
      return {
        success: false,
        error: `Dokumen berstatus "${existing.status}" tidak dapat diubah melalui pop-up edit.`,
      };
    }

    await db
      .update(salesOrders)
      .set({
        customerId,
        tanggal: payload.tanggal,
        total: String(totalNilai),
      })
      .where(eq(salesOrders.id, id));

    revalidatePath("/penjualan/so");
    revalidatePath(`/penjualan/so/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Gagal memperbarui Sales Order:", error);
    return {
      success: false,
      error: "Terjadi kesalahan pada server saat memperbarui data.",
    };
  }
}

export async function deletePesananPenjualan(id: number) {
  try {
    await requireRole(["owner", "sales"]);

    const [existing] = await db
      .select({ id: salesOrders.id, status: salesOrders.status })
      .from(salesOrders)
      .where(eq(salesOrders.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Dokumen Sales Order tidak ditemukan." };
    }

    if (existing.status !== "draft") {
      return {
        success: false,
        error: "Hanya Sales Order berstatus Draft yang dapat dihapus.",
      };
    }

    await db.transaction(async (tx) => {
      await tx.delete(salesOrderItems).where(eq(salesOrderItems.soId, id));
      await tx.delete(salesOrders).where(eq(salesOrders.id, id));
    });

    revalidatePath("/penjualan/so");
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus Sales Order:", error);
    return {
      success: false,
      error: "Terjadi kesalahan pada server saat menghapus data.",
    };
  }
}
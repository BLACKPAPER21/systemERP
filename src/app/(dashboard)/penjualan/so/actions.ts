"use server";

import { db } from "@/db";
import { salesOrders, salesOrderItems, invoices } from "@/db/schema/sales";
import { customers, products, users } from "@/db/schema/master";
import { payments } from "@/db/schema/finance";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";

export type ItemDaftarBayar = {
  id: string | number;
  tanggal: string | Date | null;
  nominal: number;
  metode?: string | null;
  keterangan?: string | null;
};

export type SOItemDetail = {
  productId: number;
  namaProduk: string | null;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
};

export type PesananPenjualanItem = {
  id: number;
  nomor: string;
  tanggal: Date | string;
  status: string;
  total: number;
  metodePembayaran: string;
  customerId: number | null;
  namaCustomer: string | null;
  dibuatOleh: string | null;
  items: SOItemDetail[];
  daftarBayar: ItemDaftarBayar[];
  totalBayar: number;
  sisaPiutang: number;
  statusPelunasan: "Lunas" | "Belum Lunas";
};

export type OpsiPelangganSO = {
  id: number;
  nama: string;
};

export type OpsiProdukSO = {
  id: number;
  nama: string;
  hargaJual: number;
  stok: number;
};

export type UpdateSOItemInput = {
  productId: number;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
};

export type UpdateSOPopupPayload = {
  id: number;
  customerId: number;
  tanggal: string;
  total: number;
  items: UpdateSOItemInput[];
};

const STATUS_DIIZINKAN = ["draft", "confirmed", "dikonfirmasi"];

function hitungPelunasan(totalNilai: number, daftarBayar: ItemDaftarBayar[]) {
  const totalAman = Math.max(0, Number(totalNilai || 0));
  const totalBayarRaw = daftarBayar.reduce(
    (acc, item) => acc + Math.max(0, Number(item.nominal || 0)),
    0
  );
  const totalBayar = Math.min(totalAman, totalBayarRaw);
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
    const [
      rows,
      allItems,
      allInvoices,
      allPayments,
      listCustomer,
      listProduct,
      ringkasan,
    ] = await Promise.all([
      db
        .select({
          id: salesOrders.id,
          nomor: salesOrders.nomor,
          tanggal: salesOrders.tanggal,
          status: salesOrders.status,
          total: salesOrders.total,
          metodePembayaran: salesOrders.metodePembayaran,
          bayarAwal: salesOrders.bayarAwal,
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
          soId: salesOrderItems.soId,
          productId: salesOrderItems.productId,
          namaProduk: products.nama,
          qty: salesOrderItems.qty,
          hargaSatuan: salesOrderItems.hargaSatuan,
          subtotal: salesOrderItems.subtotal,
        })
        .from(salesOrderItems)
        .leftJoin(products, eq(salesOrderItems.productId, products.id)),
      db
        .select({
          id: invoices.id,
          soId: invoices.soId,
          nomor: invoices.nomor,
          tanggal: invoices.tanggal,
          total: invoices.total,
          status: invoices.status,
          statusBayar: invoices.statusBayar,
        })
        .from(invoices)
        .orderBy(desc(invoices.id)),
      db
        .select({
          id: payments.id,
          refId: payments.refId,
          tanggal: payments.tanggal,
          jumlah: payments.jumlah,
          metode: payments.metode,
          nomor: payments.nomor,
        })
        .from(payments)
        .where(and(eq(payments.refType, "invoice"), eq(payments.tipe, "in"))),
      db
        .select({
          id: customers.id,
          nama: customers.nama,
        })
        .from(customers),
      db
        .select({
          id: products.id,
          nama: products.nama,
          hargaJual: products.hargaJual,
          stok: products.stokSaatIni,
        })
        .from(products),
      db
        .select({
          totalPendapatan: sql<number>`COALESCE(SUM(CASE WHEN ${salesOrders.status} IN ('confirmed', 'invoiced') THEN ${salesOrders.total} ELSE 0 END), 0)`,
          pesananDraft: sql<number>`COUNT(CASE WHEN ${salesOrders.status} = 'draft' THEN 1 END)`,
          pesananConfirmed: sql<number>`COUNT(CASE WHEN ${salesOrders.status} = 'confirmed' THEN 1 END)`,
          totalPesanan: sql<number>`COUNT(${salesOrders.id})`,
        })
        .from(salesOrders),
    ]);

    const itemsBySoId = new Map<number, SOItemDetail[]>();
    for (const item of allItems) {
      const list = itemsBySoId.get(item.soId) || [];
      list.push({
        productId: Number(item.productId),
        namaProduk: item.namaProduk,
        qty: Number(item.qty || 0),
        hargaSatuan: Number(item.hargaSatuan || 0),
        subtotal: Number(item.subtotal || 0),
      });
      itemsBySoId.set(item.soId, list);
    }

    const invoiceBySoId = new Map<number, (typeof allInvoices)[number]>();
    for (const inv of allInvoices) {
      if (!invoiceBySoId.has(inv.soId)) {
        invoiceBySoId.set(inv.soId, inv);
      }
    }

    const paymentsByInvoiceId = new Map<number, ItemDaftarBayar[]>();
    for (const pay of allPayments) {
      const list = paymentsByInvoiceId.get(pay.refId) || [];
      list.push({
        id: pay.id,
        tanggal: pay.tanggal,
        nominal: Number(pay.jumlah || 0),
        metode: pay.metode,
        keterangan: pay.nomor,
      });
      paymentsByInvoiceId.set(pay.refId, list);
    }

    const data: PesananPenjualanItem[] = rows.map((row) => {
      const totalNilai = Number(row.total || 0);
      const metodeLower = (row.metodePembayaran || "cash").toLowerCase();
      const statusLower = (row.status || "draft").toLowerCase();
      const inv = invoiceBySoId.get(row.id);

      let daftarBayar: ItemDaftarBayar[] = [];

      // Selama SO belum berstatus invoiced (masih draft / confirmed),
      // baik metode Cash maupun Utang tetap Belum Lunas dengan Daftar Bayar = 0
      if (statusLower === "invoiced" && inv) {
        const pembayaranInvoice = paymentsByInvoiceId.get(inv.id) || [];

        if (metodeLower === "cash" || inv.statusBayar === "lunas") {
          if (pembayaranInvoice.length > 0) {
            daftarBayar = pembayaranInvoice;
          } else {
            daftarBayar = [
              {
                id: `inv-cash-${inv.id}`,
                tanggal: inv.tanggal,
                nominal: totalNilai,
                metode: "Cash",
                keterangan: inv.nomor,
              },
            ];
          }
        } else {
          // Metode Utang setelah invoiced: tampilkan pembayaran dari tabel payments (dan bayarAwal jika ada)
          const bayarAwalNum = Number(row.bayarAwal || 0);
          if (bayarAwalNum > 0) {
            daftarBayar.push({
              id: `dp-${row.id}`,
              tanggal: row.tanggal,
              nominal: bayarAwalNum,
              metode: "Bayar Awal",
            });
          }
          daftarBayar.push(...pembayaranInvoice);
        }
      }

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
        metodePembayaran: row.metodePembayaran || "cash",
        customerId: row.customerId,
        namaCustomer: row.namaCustomer,
        dibuatOleh: row.dibuatOleh,
        items: itemsBySoId.get(row.id) || [],
        daftarBayar,
        totalBayar,
        sisaPiutang,
        statusPelunasan,
      };
    });

    const formattedProducts: OpsiProdukSO[] = listProduct.map((p) => ({
      id: Number(p.id),
      nama: p.nama,
      hargaJual: Number(p.hargaJual || 0),
      stok: Number(p.stok || 0),
    }));

    return {
      success: true,
      data,
      customers: listCustomer as OpsiPelangganSO[],
      products: formattedProducts,
      ringkasan: ringkasan[0],
    };
  } catch (error) {
    console.error("Gagal mengambil data pesanan penjualan:", error);
    return {
      success: false,
      data: [] as PesananPenjualanItem[],
      customers: [] as OpsiPelangganSO[],
      products: [] as OpsiProdukSO[],
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
    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    if (!id || !customerId) {
      return { success: false, error: "Pelanggan wajib dipilih." };
    }
    if (!payload.tanggal) {
      return { success: false, error: "Tanggal transaksi wajib diisi." };
    }
    if (rawItems.length === 0) {
      return { success: false, error: "Minimal harus ada 1 baris barang dalam Sales Order." };
    }

    const normalizedItems = rawItems.map((item) => {
      const productId = Number(item.productId);
      const qty = Math.floor(Number(item.qty || 0));
      const hargaSatuan = Math.max(0, Number(item.hargaSatuan || 0));
      return {
        productId,
        qty,
        hargaSatuan,
        subtotal: hargaSatuan * qty,
      };
    });

    if (normalizedItems.some((i) => !i.productId || i.qty <= 0)) {
      return {
        success: false,
        error: "Pastikan semua baris produk terisi dan kuantitas minimal 1.",
      };
    }

    const [existing] = await db
      .select({ id: salesOrders.id, status: salesOrders.status })
      .from(salesOrders)
      .where(eq(salesOrders.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Dokumen Sales Order tidak ditemukan." };
    }

    const statusLower = (existing.status || "").toLowerCase();
    if (!STATUS_DIIZINKAN.includes(statusLower)) {
      return {
        success: false,
        error: `Dokumen berstatus "${existing.status}" tidak dapat diubah melalui pop-up edit.`,
      };
    }

    const hasil = await db.transaction(async (tx) => {
      const newQtyMap = new Map<number, number>();
      for (const newItem of normalizedItems) {
        newQtyMap.set(newItem.productId, (newQtyMap.get(newItem.productId) || 0) + newItem.qty);
      }

      const productIds = Array.from(newQtyMap.keys());
      const dbProducts = await tx
        .select({
          id: products.id,
          nama: products.nama,
          stok: products.stokSaatIni,
        })
        .from(products)
        .where(inArray(products.id, productIds));

      const productMap = new Map(dbProducts.map((p) => [Number(p.id), p]));

      for (const [prodId, qtyDiminta] of newQtyMap.entries()) {
        const prodDb = productMap.get(prodId);
        if (!prodDb) {
          return {
            success: false as const,
            error: "Salah satu produk tidak ditemukan di database.",
          };
        }

        const stokTersedia = Number(prodDb.stok || 0);
        if (qtyDiminta > stokTersedia) {
          return {
            success: false as const,
            error: `Jumlah stok tidak mencukupi untuk produk "${prodDb.nama}" (Stok tersedia: ${stokTersedia}, Diminta: ${qtyDiminta}).`,
          };
        }
      }

      const totalNilai = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);

      await tx
        .update(salesOrders)
        .set({
          customerId,
          tanggal: payload.tanggal,
          total: String(totalNilai),
        })
        .where(eq(salesOrders.id, id));

      await tx.delete(salesOrderItems).where(eq(salesOrderItems.soId, id));

      await tx.insert(salesOrderItems).values(
        normalizedItems.map((item) => ({
          soId: id,
          productId: item.productId,
          qty: String(item.qty),
          hargaSatuan: String(item.hargaSatuan),
          subtotal: String(item.subtotal),
        }))
      );

      return { success: true as const };
    });

    if (!hasil.success) {
      return hasil;
    }

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

/* Membatalkan SO — bukan menghapusnya.
 * PRD §8.5 no. 4: dokumen transaksi yang salah dibatalkan lewat status
 * `cancelled`, tidak pernah dihapus, agar riwayatnya tetap dapat diaudit
 * (NF-10). AB-6: SO yang sudah punya invoice tidak dapat dibatalkan.
 */
export async function deletePesananPenjualan(id: number) {
  try {
    const sesi = await requireRole(["owner", "sales"]);

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: salesOrders.id, status: salesOrders.status })
        .from(salesOrders)
        .where(eq(salesOrders.id, id))
        .for("update");

      if (!existing) throw new Error("Dokumen Sales Order tidak ditemukan.");

      const statusLower = (existing.status || "").toLowerCase();
      if (!STATUS_DIIZINKAN.includes(statusLower)) {
        throw new Error(
          "Hanya Sales Order berstatus Draft atau Dikonfirmasi yang dapat dibatalkan.",
        );
      }

      const [invoiceTerkait] = await tx
        .select({ nomor: invoices.nomor })
        .from(invoices)
        .where(eq(invoices.soId, id))
        .limit(1);
      if (invoiceTerkait) {
        throw new Error(
          `Pesanan ini sudah memiliki invoice ${invoiceTerkait.nomor} sehingga tidak dapat dibatalkan (AB-6).`,
        );
      }

      await tx
        .update(salesOrders)
        .set({ status: "cancelled" })
        .where(eq(salesOrders.id, id));

      await logAudit(tx, {
        userId: sesi.userId,
        aksi: "cancel",
        entitas: "sales_orders",
        entitasId: id,
        detail: { statusSebelumnya: existing.status },
      });
    });

    revalidatePath("/penjualan/so");
    revalidatePath(`/penjualan/so/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Gagal membatalkan Sales Order:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal membatalkan Sales Order.",
    };
  }
}
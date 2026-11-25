"use server";

import { db } from "@/db";
import { salesOrders, salesOrderItems, invoices } from "@/db/schema/sales";
import { customers, products, users } from "@/db/schema/master";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { recordStockOut } from "@/services/stock";
import { createJournalEntry } from "@/services/journal";
import { generateDocNumber } from "@/services/numbering";
import { logAudit } from "@/services/audit";

// 1. Mengambil Detail Data Master, Item, & Invoice Terkait
export async function getDetailSO(id: number) {
  try {
    const [so] = await db
      .select({
        id: salesOrders.id,
        nomor: salesOrders.nomor,
        tanggal: salesOrders.tanggal,
        status: salesOrders.status,
        total: salesOrders.total,
        metodePembayaran: salesOrders.metodePembayaran,
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

    const [invoice] = await db
      .select({
        id: invoices.id,
        nomor: invoices.nomor,
        tanggal: invoices.tanggal,
        jatuhTempo: invoices.jatuhTempo,
        total: invoices.total,
        status: invoices.status,
        statusBayar: invoices.statusBayar,
      })
      .from(invoices)
      .where(eq(invoices.soId, id))
      .orderBy(desc(invoices.id))
      .limit(1);

    return {
      success: true,
      data: { ...so, items, invoice: invoice ?? null },
    };
  } catch (error) {
    console.error("Gagal mengambil detail SO:", error);
    return { success: false, error: "Terjadi kesalahan server saat mengambil detail data." };
  }
}

// 2. Fungsi Konfirmasi Pesanan (Update Status)
export async function confirmSO(id: number) {
  try {
    const sesi = await requireRole(["owner", "sales"]);

    await db.transaction(async (tx) => {
      // Baris dikunci agar dua klik bersamaan tidak sama-sama lolos (NF-9).
      const [so] = await tx
        .select({ id: salesOrders.id, status: salesOrders.status })
        .from(salesOrders)
        .where(eq(salesOrders.id, id))
        .for("update");

      if (!so) throw new Error("Sales Order tidak ditemukan.");
      if (so.status !== "draft") {
        throw new Error(
          `Hanya SO berstatus DRAFT yang dapat dikonfirmasi. Status sekarang: ${so.status}.`,
        );
      }

      await tx
        .update(salesOrders)
        .set({ status: "confirmed" })
        .where(eq(salesOrders.id, id));

      await logAudit(tx, {
        userId: sesi.userId,
        aksi: "update",
        entitas: "sales_orders",
        entitasId: id,
        detail: { status: "confirmed" },
      });
    });

    revalidatePath(`/penjualan/so/${id}`);
    revalidatePath(`/penjualan/so`);

    return { success: true };
  } catch (error) {
    console.error("Gagal update status SO:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengkonfirmasi Sales Order.",
    };
  }
}

/* 3. Posting invoice — satu transaksi, tiga modul (PRD §6.2, §9.6, AB-12).
 *
 * M4 tidak menulis stok maupun jurnal sendiri. Ia memanggil kontrak:
 *   recordStockOut (M3)     → memotong stok DAN mengembalikan hppTotal
 *   createJournalEntry (M5) → J3 pendapatan, J4 harga pokok
 *   generateDocNumber (M1)  → nomor invoice berurut, bukan acak
 *   logAudit (M1)           → jejak audit (NF-10)
 *
 * Semuanya berada dalam satu db.transaction: bila jurnal gagal, pemotongan
 * stok ikut dibatalkan — tidak ada stok berkurang tanpa jurnal (§9.6 catatan).
 */
export async function generateInvoiceAndCutStock(soId: number) {
  try {
    const sesi = await requireRole(["owner", "sales"]);

    await db.transaction(async (tx) => {
      // A. Kunci baris SO lalu validasi statusnya (NF-9 — cegah dobel posting).
      const [so] = await tx
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, soId))
        .for("update");
      if (!so) throw new Error("Sales Order tidak ditemukan.");
      if (so.status !== "confirmed") {
        throw new Error(
          `Hanya SO berstatus CONFIRMED yang dapat di-invoice. Status sekarang: ${so.status}.`,
        );
      }

      const [invoiceLama] = await tx
        .select({ nomor: invoices.nomor })
        .from(invoices)
        .where(eq(invoices.soId, soId))
        .limit(1);
      if (invoiceLama) {
        throw new Error(
          `Pesanan ini sudah memiliki invoice ${invoiceLama.nomor}.`,
        );
      }

      // B. Ambil detail item.
      const items = await tx
        .select()
        .from(salesOrderItems)
        .where(eq(salesOrderItems.soId, soId));
      if (items.length === 0)
        throw new Error("Tidak ada item barang dalam pesanan ini.");

      // C. Terbitkan baris invoice lebih dulu agar id-nya dapat dipakai
      //    sebagai refId pergerakan stok maupun jurnal.
      const tanggal = new Date();
      const jatuhTempo = new Date(tanggal);
      jatuhTempo.setDate(jatuhTempo.getDate() + 30);

      const nomorInvoice = await generateDocNumber(tx, "INV");

      const [invoice] = await tx
        .insert(invoices)
        .values({
          nomor: nomorInvoice,
          soId: so.id,
          tanggal: tanggal.toISOString().split("T")[0],
          jatuhTempo: jatuhTempo.toISOString().split("T")[0],
          total: so.total,
          totalHpp: "0", // diisi di langkah E dari hasil recordStockOut
          status: "posted",
          // statusBayar tetap "belum" — hanya M5 yang melunasi lewat
          // markInvoicePaid() setelah pembayaran tercatat (§7.5).
        })
        .returning({ id: invoices.id });

      const invoiceId = invoice!.id;

      // D. Potong stok lewat kontrak M3. HPP datang dari harga pokok
      //    rata-rata yang sesungguhnya, bukan ditaksir dari harga jual.
      let totalHpp = 0;
      for (const item of items) {
        const [prod] = await tx
          .select({ nama: products.nama })
          .from(products)
          .where(eq(products.id, item.productId));
        if (!prod)
          throw new Error(`Data produk dengan ID ${item.productId} tidak ditemukan.`);

        try {
          const { hppTotal } = await recordStockOut(tx, {
            productId: item.productId,
            qty: Number(item.qty),
            refType: "invoice",
            refId: invoiceId,
            keterangan: `Invoice ${nomorInvoice}`,
          });
          totalHpp += hppTotal;
        } catch (galat) {
          // Sebutkan nama produknya agar pesan stok kurang tetap bisa dibaca kasir.
          const pesan = galat instanceof Error ? galat.message : String(galat);
          throw new Error(`Produk "${prod.nama}": ${pesan}`);
        }
      }

      // E. Jurnal J3 & J4 lewat kontrak M5 — selalu berpasangan (§9.6).
      const totalJual = Number(so.total);

      const j3 = await createJournalEntry(tx, {
        tanggal,
        keterangan: `Penjualan ${nomorInvoice}`,
        refType: "invoice",
        refId: invoiceId,
        userId: sesi.userId,
        lines: [
          { accountCode: "1-200", debit: totalJual, kredit: 0 },
          { accountCode: "4-100", debit: 0, kredit: totalJual },
        ],
      });

      const j4 = await createJournalEntry(tx, {
        tanggal,
        keterangan: `Harga pokok penjualan ${nomorInvoice}`,
        refType: "invoice_hpp",
        refId: invoiceId,
        userId: sesi.userId,
        lines: [
          { accountCode: "5-100", debit: totalHpp, kredit: 0 },
          { accountCode: "1-300", debit: 0, kredit: totalHpp },
        ],
      });

      await tx
        .update(invoices)
        .set({
          totalHpp: totalHpp.toFixed(2),
          journalEntryId: j3.journalEntryId,
          journalEntryHppId: j4.journalEntryId,
        })
        .where(eq(invoices.id, invoiceId));

      // F. Tutup SO dan catat jejaknya.
      await tx
        .update(salesOrders)
        .set({ status: "invoiced" })
        .where(eq(salesOrders.id, so.id));

      await logAudit(tx, {
        userId: sesi.userId,
        aksi: "post",
        entitas: "invoices",
        entitasId: invoiceId,
        detail: {
          nomor: nomorInvoice,
          soId: so.id,
          total: totalJual,
          totalHpp,
          jurnalPendapatan: j3.nomor,
          jurnalHpp: j4.nomor,
        },
      });
    });

    revalidatePath(`/penjualan/so/${soId}`);
    revalidatePath(`/penjualan/so`);
    revalidatePath(`/penjualan/so/invoice`);
    return { success: true };
  } catch (error) {
    console.error("Gagal Generate Invoice:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memproses Invoice dan memotong stok.",
    };
  }
}

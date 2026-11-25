/* Uji integrasi posting invoice: recordStockOut (M3) + createJournalEntry (M5)
 * + generateDocNumber (M1), persis urutan yang dipakai generateInvoiceAndCutStock.
 * Seluruhnya dalam satu transaksi yang SELALU di-rollback — data tim tidak berubah.
 */
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { recordStockOut } from "@/services/stock";
import { createJournalEntry } from "@/services/journal";
import { generateDocNumber } from "@/services/numbering";

const BATAL = new Error("__rollback__");

async function main() {
  try {
    await db.transaction(async (tx) => {
      // Produk uji dengan stok & harga pokok yang diketahui.
      const p = await tx.execute(sql`
        INSERT INTO products (sku, nama, satuan, harga_jual, stok_saat_ini, harga_pokok_rata_rata, stok_minimum, aktif)
        VALUES ('UJI-POST', 'Produk Uji Posting', 'pcs', 16000, 50, 10000, 0, true)
        RETURNING id
      `);
      const productId = Number((p.rows[0] as { id: number }).id);

      const u = await tx.execute(sql`SELECT id FROM users LIMIT 1`);
      const userId = Number((u.rows[0] as { id: number }).id);

      const nomor = await generateDocNumber(tx, "INV");
      console.log("nomor invoice :", nomor);
      if (!/^INV\/\d{4}\/\d{2}\/\d{4}$/.test(nomor)) {
        throw new Error(`format nomor salah: ${nomor}`);
      }

      const { hppTotal, saldoSetelah } = await recordStockOut(tx, {
        productId,
        qty: 20,
        refType: "invoice",
        refId: 1,
        keterangan: `Invoice ${nomor}`,
      });
      console.log("hppTotal      :", hppTotal, "(harap 200000)");
      console.log("sisa stok     :", saldoSetelah, "(harap 30)");
      if (hppTotal !== 200000) throw new Error(`hppTotal salah: ${hppTotal}`);
      if (saldoSetelah !== 30) throw new Error(`saldo salah: ${saldoSetelah}`);

      const mv = await tx.execute(sql`
        SELECT tipe, qty, ref_type FROM stock_movements WHERE product_id = ${productId}
      `);
      console.log("stock_movement:", JSON.stringify(mv.rows));
      if (mv.rows.length !== 1) throw new Error("pergerakan stok tidak tercatat");

      const totalJual = 320000;
      const j3 = await createJournalEntry(tx, {
        tanggal: new Date(),
        keterangan: `Penjualan ${nomor}`,
        refType: "invoice",
        refId: 1,
        userId,
        lines: [
          { accountCode: "1-200", debit: totalJual, kredit: 0 },
          { accountCode: "4-100", debit: 0, kredit: totalJual },
        ],
      });
      const j4 = await createJournalEntry(tx, {
        tanggal: new Date(),
        keterangan: `Harga pokok penjualan ${nomor}`,
        refType: "invoice_hpp",
        refId: 1,
        userId,
        lines: [
          { accountCode: "5-100", debit: hppTotal, kredit: 0 },
          { accountCode: "1-300", debit: 0, kredit: hppTotal },
        ],
      });
      console.log("J3            :", j3.nomor, "| J4:", j4.nomor);

      const saldo = await tx.execute(sql`
        SELECT SUM(debit) AS d, SUM(kredit) AS k FROM journal_lines
        WHERE journal_entry_id IN (${j3.journalEntryId}, ${j4.journalEntryId})
      `);
      const { d, k } = saldo.rows[0] as { d: string; k: string };
      console.log("debit/kredit  :", d, "/", k, "(harap 520000 / 520000)");
      if (Number(d) !== 520000 || Number(k) !== 520000) {
        throw new Error("jurnal tidak seimbang");
      }

      console.log("\nLULUS — semua kontrak tersambung. Membatalkan transaksi…");
      throw BATAL;
    });
  } catch (e) {
    if (e !== BATAL) {
      const err = e as { message?: string; cause?: { message?: string }; stack?: string };
      console.error("\nGAGAL:", err?.message || "(tanpa pesan)");
      if (err?.cause?.message) console.error("sebab :", err.cause.message);
      if (err?.stack) console.error(err.stack.split("\n").slice(0, 5).join("\n"));
      process.exit(1);
    }
    console.log("Transaksi dibatalkan, database tidak berubah.");
  }
  process.exit(0);
}

main();

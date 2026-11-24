
"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withTransaction } from "@/db";
import { products } from "@/db/schema/master";
import {
  stockMovements,
  stockOpnames,
  stockOpnameItems,
} from "@/db/schema/inventory";

import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/services/audit";
import { generateDocNumber } from "@/services/numbering";
import type { AksiHasil } from "@/lib/aksi";

import {
  skemaIdOpname,
  skemaCatatStokFisik,
} from "@/lib/validations/inventory";

// Mengubah nilai rupiah atau stok menjadi satuan terkecil (dua desimal).
function toCents(value: string | number): bigint {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);

  if (!match) {
    throw new Error("Format angka tidak valid.");
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const whole = BigInt(match[2]);
  const decimal = BigInt((match[3] ?? "").padEnd(2, "0"));

  return sign * (whole * 100n + decimal);
}

function formatCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;

  const whole = absolute / 100n;
  const decimal = String(absolute % 100n).padStart(2, "0");

  return `${sign}${whole}.${decimal}`;
}

function hasilGagal(error: unknown, pesanDefault: string): AksiHasil {
  return {
    ok: false,
    pesan: error instanceof Error ? error.message : pesanDefault,
  };
}

// ======================================================
// 1. MEMBUAT DOKUMEN STOCK OPNAME
// ======================================================

export async function buatStockOpname(): Promise<AksiHasil> {
  const sesi = await requireRole(["owner", "gudang"]);

  try {
    await withTransaction(async (tx) => {
      const nomor = await generateDocNumber(tx, "OPN");
      const tanggal = new Date().toISOString().slice(0, 10);

      const [opname] = await tx
        .insert(stockOpnames)
        .values({
          nomor,
          tanggal,
          status: "draft",
          dicatatOleh: sesi.userId,
        })
        .returning({ id: stockOpnames.id });

      await logAudit(tx, {
        userId: sesi.userId,
        aksi: "create",
        entitas: "stock_opnames",
        entitasId: opname.id,
        detail: { nomor },
      });
    });

    revalidatePath("/persediaan/stock-opname");

    return {
      ok: true,
      pesan: "Dokumen Stock Opname berhasil dibuat.",
    };
  } catch (error) {
    return hasilGagal(error, "Gagal membuat dokumen Stock Opname.");
  }
}

// ======================================================
// 2. MENCATAT HASIL PENGHITUNGAN STOK FISIK
// ======================================================

export async function catatStokFisik(
  input: unknown,
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner", "gudang"]);

  const validasi = skemaCatatStokFisik.safeParse(input);

  if (!validasi.success) {
    return {
      ok: false,
      pesan: validasi.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const data = validasi.data;

  try {
    await withTransaction(async (tx) => {
      // Kunci dokumen agar tidak dicatat bersamaan dengan proses posting.
      const [opname] = await tx
        .select()
        .from(stockOpnames)
        .where(eq(stockOpnames.id, data.opnameId))
        .for("update");

      if (!opname) {
        throw new Error("Dokumen Stock Opname tidak ditemukan.");
      }

      if (opname.status !== "draft") {
        throw new Error("Dokumen sudah diposting dan tidak dapat diubah.");
      }

      // Kunci produk sebelum mengambil stok sistem.
      const [produk] = await tx
        .select({
          id: products.id,
          nama: products.nama,
          stokSaatIni: products.stokSaatIni,
          aktif: products.aktif,
        })
        .from(products)
        .where(eq(products.id, data.productId))
        .for("update");

      if (!produk || !produk.aktif) {
        throw new Error("Produk tidak ditemukan atau tidak aktif.");
      }

      // Cegah produk yang sama dicatat dua kali dalam satu opname.
      const [sudahDicatat] = await tx
        .select({ id: stockOpnameItems.id })
        .from(stockOpnameItems)
        .where(
          and(
            eq(stockOpnameItems.opnameId, data.opnameId),
            eq(stockOpnameItems.productId, data.productId),
          ),
        )
        .limit(1);

      if (sudahDicatat) {
        throw new Error("Produk ini sudah dicatat dalam Stock Opname.");
      }

      const stokSistem = toCents(produk.stokSaatIni);
      const stokFisik = toCents(data.qtyFisik);
      const selisih = stokFisik - stokSistem;

      await tx.insert(stockOpnameItems).values({
        opnameId: data.opnameId,
        productId: data.productId,
        qtySistem: formatCents(stokSistem),
        qtyFisik: formatCents(stokFisik),
        selisih: formatCents(selisih),
      });

      await logAudit(tx, {
        userId: sesi.userId,
        aksi: "update",
        entitas: "stock_opname_items",
        entitasId: data.opnameId,
        detail: {
          produk: produk.nama,
          productId: data.productId,
          qtySistem: formatCents(stokSistem),
          qtyFisik: formatCents(stokFisik),
          selisih: formatCents(selisih),
          keterangan: data.keterangan ?? "",
        },
      });
    });

    revalidatePath("/persediaan/stock-opname");
    revalidatePath(`/persediaan/stock-opname/${data.opnameId}`);

    return {
      ok: true,
      pesan: "Hasil penghitungan stok fisik berhasil dicatat.",
    };
  } catch (error) {
    return hasilGagal(error, "Gagal mencatat stok fisik.");
  }
}

// ======================================================
// 3. POSTING STOCK OPNAME
// ======================================================

export async function postingStockOpname(
  input: unknown,
): Promise<AksiHasil> {
  const sesi = await requireRole(["owner", "gudang"]);

  const validasi = skemaIdOpname.safeParse({ id: input });

  if (!validasi.success) {
    return {
      ok: false,
      pesan: "ID Stock Opname tidak valid.",
    };
  }

  const opnameId = validasi.data.id;

  try {
    await withTransaction(async (tx) => {
      // Kunci dokumen agar tidak diposting dua kali.
      const [opname] = await tx
        .select()
        .from(stockOpnames)
        .where(eq(stockOpnames.id, opnameId))
        .for("update");

      if (!opname) {
        throw new Error("Dokumen Stock Opname tidak ditemukan.");
      }

      if (opname.status !== "draft") {
        throw new Error("Dokumen Stock Opname sudah diposting.");
      }

      const items = await tx
        .select()
        .from(stockOpnameItems)
        .where(eq(stockOpnameItems.opnameId, opnameId))
        .orderBy(asc(stockOpnameItems.productId));

      if (items.length === 0) {
        throw new Error("Belum ada produk yang dihitung.");
      }

      // Kunci setiap produk dalam urutan ID untuk mengurangi risiko deadlock.
      for (const item of items) {
        const [produk] = await tx
          .select({
            id: products.id,
            stokSaatIni: products.stokSaatIni,
            hargaPokokRataRata: products.hargaPokokRataRata,
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .for("update");

        if (!produk) {
          throw new Error(`Produk ID ${item.productId} tidak ditemukan.`);
        }

        const stokSekarang = toCents(produk.stokSaatIni);
        const stokSistem = toCents(item.qtySistem);
        const stokFisik = toCents(item.qtyFisik);

        // Cegah hasil opname menimpa transaksi stok yang terjadi setelah pencatatan.
        if (stokSekarang !== stokSistem) {
          throw new Error(
            `Stok produk ID ${item.productId} berubah sejak penghitungan. Silakan hitung ulang produk tersebut.`,
          );
        }

        const selisih = stokFisik - stokSistem;

        // Pergerakan stok hanya dibuat jika terdapat selisih.
        if (selisih !== 0n) {
          await tx.insert(stockMovements).values({
            productId: item.productId,
            tanggal: new Date(),
            tipe: "adjustment",
            qty: formatCents(selisih),
            hargaSatuan: produk.hargaPokokRataRata,
            saldoSetelah: formatCents(stokFisik),
            refType: "stock_opname",
            refId: opnameId,
            keterangan: `Penyesuaian hasil Stock Opname ${opname.nomor}`,
          });

          // Perbarui saldo stok, tanpa mengubah harga pokok rata-rata.
          await tx
            .update(products)
            .set({
              stokSaatIni: formatCents(stokFisik),
            })
            .where(eq(products.id, item.productId));
        }
      }

      // Ubah status dokumen setelah semua penyesuaian berhasil.
      await tx
        .update(stockOpnames)
        .set({ status: "posted" })
        .where(eq(stockOpnames.id, opnameId));

      await logAudit(tx, {
        userId: sesi.userId,
        aksi: "post",
        entitas: "stock_opnames",
        entitasId: opnameId,
        detail: {
          nomor: opname.nomor,
          jumlahProduk: items.length,
        },
      });
    });

    revalidatePath("/persediaan/stock-opname");
    revalidatePath(`/persediaan/stock-opname/${opnameId}`);
    revalidatePath("/persediaan/saldo-stok");
    revalidatePath("/persediaan/kartu-stok");
    revalidatePath("/persediaan/peringatan-stok");

    return {
      ok: true,
      pesan: "Stock Opname berhasil diposting. Saldo stok telah diperbarui.",
    };
  } catch (error) {
    return hasilGagal(error, "Gagal memposting Stock Opname.");
  }
}

/* MILIK M6 — Utilitas periode dashboard.
 *
 * Folder `_m6` diawali garis bawah sehingga tidak menjadi route (private folder).
 * Semua tanggal memakai string "YYYY-MM-DD" waktu lokal server, sama seperti
 * kolom `date` di database.
 */

export const PILIHAN_PERIODE = [
  { kode: "7h", label: "7 Hari" },
  { kode: "30h", label: "30 Hari" },
  { kode: "3b", label: "3 Bulan Terakhir" },
  { kode: "tahun", label: "Tahun Ini" },
] as const;

export type KodePeriode = (typeof PILIHAN_PERIODE)[number]["kode"];

export const PERIODE_BAWAAN: KodePeriode = "30h";

export type RentangPeriode = {
  kode: KodePeriode;
  label: string;
  /** Rentang periode berjalan (inklusif). */
  awal: string;
  akhir: string;
  /** Rentang pembanding dengan panjang setara, tepat sebelumnya. */
  awalLalu: string;
  akhirLalu: string;
  /** Grafik dikelompokkan per hari atau per bulan. */
  kelompok: "hari" | "bulan";
};

export function tanggalIso(tanggal: Date) {
  const tahun = tanggal.getFullYear();
  const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
  const hari = String(tanggal.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

function geserHari(tanggal: Date, jumlahHari: number) {
  const hasil = new Date(tanggal);
  hasil.setDate(hasil.getDate() + jumlahHari);
  return hasil;
}

/** Tanggal yang sama pada bulan/tahun lain; dijepit ke hari terakhir bulan. */
function tanggalAman(tahun: number, bulan: number, hari: number) {
  const hariTerakhir = new Date(tahun, bulan + 1, 0).getDate();
  return new Date(tahun, bulan, Math.min(hari, hariTerakhir));
}

export function parsePeriode(nilai: unknown): KodePeriode {
  return PILIHAN_PERIODE.some((p) => p.kode === nilai)
    ? (nilai as KodePeriode)
    : PERIODE_BAWAAN;
}

export function hitungRentang(
  kode: KodePeriode,
  sekarang = new Date(),
): RentangPeriode {
  const hariIni = new Date(
    sekarang.getFullYear(),
    sekarang.getMonth(),
    sekarang.getDate(),
  );
  const label = PILIHAN_PERIODE.find((p) => p.kode === kode)!.label;

  if (kode === "7h" || kode === "30h") {
    const panjang = kode === "7h" ? 7 : 30;
    return {
      kode,
      label,
      awal: tanggalIso(geserHari(hariIni, -(panjang - 1))),
      akhir: tanggalIso(hariIni),
      awalLalu: tanggalIso(geserHari(hariIni, -(panjang * 2 - 1))),
      akhirLalu: tanggalIso(geserHari(hariIni, -panjang)),
      kelompok: "hari",
    };
  }

  const tahun = hariIni.getFullYear();
  const bulan = hariIni.getMonth();
  const hari = hariIni.getDate();

  if (kode === "3b") {
    const batas3BulanLalu = tanggalAman(tahun, bulan - 3, hari);
    const batas6BulanLalu = tanggalAman(tahun, bulan - 6, hari);
    return {
      kode,
      label,
      awal: tanggalIso(geserHari(batas3BulanLalu, 1)),
      akhir: tanggalIso(hariIni),
      awalLalu: tanggalIso(geserHari(batas6BulanLalu, 1)),
      akhirLalu: tanggalIso(batas3BulanLalu),
      kelompok: "bulan",
    };
  }

  return {
    kode,
    label,
    awal: tanggalIso(new Date(tahun, 0, 1)),
    akhir: tanggalIso(hariIni),
    awalLalu: tanggalIso(new Date(tahun - 1, 0, 1)),
    akhirLalu: tanggalIso(tanggalAman(tahun - 1, bulan, hari)),
    kelompok: "bulan",
  };
}

/** Selisih hari kalender `a - b` untuk string "YYYY-MM-DD". */
export function selisihHari(a: string, b: string) {
  const keUtc = (s: string) => {
    const [t, bl, h] = s.split("-").map(Number);
    return Date.UTC(t, bl - 1, h);
  };
  return Math.round((keUtc(a) - keUtc(b)) / 86_400_000);
}

const NAMA_BULAN = new Intl.DateTimeFormat("id-ID", { month: "short" });

/** Daftar "ember" grafik dari awal sampai akhir periode. */
export function daftarEmberGrafik(rentang: RentangPeriode) {
  const ember: { kunci: string; label: string }[] = [];
  const [tA, bA, hA] = rentang.awal.split("-").map(Number);
  const [tZ, bZ, hZ] = rentang.akhir.split("-").map(Number);

  if (rentang.kelompok === "bulan") {
    const lintasTahun = tZ !== tA;
    for (let b = bA - 1; b <= bZ - 1 + (tZ - tA) * 12; b++) {
      const tgl = new Date(tA, b, 1);
      const namaBulan = NAMA_BULAN.format(tgl);
      ember.push({
        kunci: tanggalIso(tgl).slice(0, 7),
        label: lintasTahun
          ? `${namaBulan} '${String(tgl.getFullYear()).slice(-2)}`
          : namaBulan,
      });
    }
    return ember;
  }

  const akhir = new Date(tZ, bZ - 1, hZ);
  for (let tgl = new Date(tA, bA - 1, hA); tgl <= akhir; tgl = geserHari(tgl, 1)) {
    const iso = tanggalIso(tgl);
    ember.push({ kunci: iso, label: `${iso.slice(8, 10)}/${iso.slice(5, 7)}` });
  }
  return ember;
}

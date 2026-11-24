/* MILIK M6 — Generator berkas Excel (.xlsx / OpenXML) tanpa dependensi eksternal.
 *
 * Menghasilkan workbook asli (.xlsx) lengkap dengan:
 * - Lebar kolom proporsional (tidak terpotong / menumpuk di satu kolom)
 * - Garis tabel (border), warna header, baris selang-seling (zebra), dan baris Total
 * - Format mata uang Rupiah asli Excel ("Rp" #,##0)
 * - AutoFilter pada sheet rincian agar mudah difilter/diurutkan di Excel
 */

export type GayaSel =
  | "kosong"
  | "bannerJudul"
  | "bannerSub"
  | "judulSeksi"
  | "thKiri"
  | "thTengah"
  | "thKanan"
  | "tdKiri"
  | "tdTengah"
  | "tdAngka"
  | "tdKiriZebra"
  | "tdTengahZebra"
  | "tdAngkaZebra"
  | "totalKiri"
  | "totalKanan"
  | "totalAngka";

const INDEKS_GAYA: Record<GayaSel, number> = {
  kosong: 0,
  bannerJudul: 1,
  bannerSub: 2,
  judulSeksi: 3,
  thKiri: 4,
  thTengah: 5,
  thKanan: 6,
  tdKiri: 7,
  tdTengah: 8,
  tdAngka: 9,
  tdKiriZebra: 10,
  tdTengahZebra: 11,
  tdAngkaZebra: 12,
  totalKiri: 13,
  totalKanan: 14,
  totalAngka: 15,
};

export type SelExcel = {
  nilai: string | number | null;
  gaya: GayaSel;
};

export type BarisExcel = {
  tinggi?: number;
  sel: (SelExcel | null)[];
};

export type DefinisiSheet = {
  nama: string;
  lebarKolom: number[];
  baris: BarisExcel[];
  gabung?: string[];
  autoFilter?: string;
};

function escapeXml(teks: string): string {
  return teks
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ubah indeks kolom berbasis 0 menjadi huruf kolom Excel (0 -> A, 25 -> Z, 26 -> AA). */
export function hurufKolom(indeks: number): string {
  let n = indeks + 1;
  let hasil = "";
  while (n > 0) {
    const sisa = (n - 1) % 26;
    hasil = String.fromCharCode(65 + sisa) + hasil;
    n = Math.floor((n - 1) / 26);
  }
  return hasil;
}

function buatStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;Rp&quot;\ #,##0;(&quot;Rp&quot;\ #,##0);&quot;-&quot;"/>
  </numFmts>
  <fonts count="5">
    <font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="9.5"/><color rgb="FF334155"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left/><right/><top/>
      <bottom style="medium"><color rgb="FF94A3B8"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="medium"><color rgb="FF1E3A8A"/></top>
      <bottom style="medium"><color rgb="FF1E3A8A"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="16">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" indent="1"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" indent="1"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
}

function buatSheetXml(sheet: DefinisiSheet, aktif: boolean): string {
  const colsXml = sheet.lebarKolom
    .map(
      (lebar, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${lebar}" customWidth="1"/>`,
    )
    .join("");

  const rowsXml = sheet.baris
    .map((baris, idxBaris) => {
      const nomorBaris = idxBaris + 1;
      const selXml = baris.sel
        .map((sel, idxKol) => {
          if (!sel) return "";
          const ref = `${hurufKolom(idxKol)}${nomorBaris}`;
          const s = INDEKS_GAYA[sel.gaya];
          if (sel.nilai === null || sel.nilai === "") {
            return `<c r="${ref}" s="${s}"/>`;
          }
          if (typeof sel.nilai === "number") {
            const angkaAman = Number.isFinite(sel.nilai) ? sel.nilai : 0;
            return `<c r="${ref}" s="${s}"><v>${angkaAman}</v></c>`;
          }
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(sel.nilai)}</t></is></c>`;
        })
        .join("");

      const atributTinggi = baris.tinggi
        ? ` ht="${baris.tinggi}" customHeight="1"`
        : "";
      return `<row r="${nomorBaris}"${atributTinggi}>${selXml}</row>`;
    })
    .join("");

  const autoFilterXml = sheet.autoFilter
    ? `<autoFilter ref="${sheet.autoFilter}"/>`
    : "";

  const mergeXml =
    sheet.gabung && sheet.gabung.length > 0
      ? `<mergeCells count="${sheet.gabung.length}">${sheet.gabung
          .map((ref) => `<mergeCell ref="${ref}"/>`)
          .join("")}</mergeCells>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView${aktif ? ' tabSelected="1"' : ""} workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
  ${autoFilterXml}
  ${mergeXml}
</worksheet>`;
}

/* ------------------------------------------------------------------ */
/* Pembungkus ZIP (STORE / tanpa kompresi, murni Uint8Array)           */
/* ------------------------------------------------------------------ */

const TABEL_CRC = (() => {
  const tabel = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabel[i] = c >>> 0;
  }
  return tabel;
})();

function hitungCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = TABEL_CRC[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function kemasZip(berkas: { nama: string; isi: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const entri = berkas.map((b) => {
    const namaBytes = encoder.encode(b.nama);
    const dataBytes = encoder.encode(b.isi);
    return {
      namaBytes,
      dataBytes,
      crc: hitungCrc32(dataBytes),
      offset: 0,
    };
  });

  let ukuranLokal = 0;
  let ukuranSentral = 0;
  for (const e of entri) {
    e.offset = ukuranLokal;
    ukuranLokal += 30 + e.namaBytes.length + e.dataBytes.length;
    ukuranSentral += 46 + e.namaBytes.length;
  }

  const total = ukuranLokal + ukuranSentral + 22;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let pos = 0;

  for (const e of entri) {
    view.setUint32(pos, 0x04034b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 0, true);
    view.setUint16(pos + 8, 0, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0x21, true);
    view.setUint32(pos + 14, e.crc, true);
    view.setUint32(pos + 18, e.dataBytes.length, true);
    view.setUint32(pos + 22, e.dataBytes.length, true);
    view.setUint16(pos + 26, e.namaBytes.length, true);
    view.setUint16(pos + 28, 0, true);
    out.set(e.namaBytes, pos + 30);
    out.set(e.dataBytes, pos + 30 + e.namaBytes.length);
    pos += 30 + e.namaBytes.length + e.dataBytes.length;
  }

  const awalSentral = pos;
  for (const e of entri) {
    view.setUint32(pos, 0x02014b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 20, true);
    view.setUint16(pos + 8, 0, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0, true);
    view.setUint16(pos + 14, 0x21, true);
    view.setUint32(pos + 16, e.crc, true);
    view.setUint32(pos + 20, e.dataBytes.length, true);
    view.setUint32(pos + 24, e.dataBytes.length, true);
    view.setUint16(pos + 28, e.namaBytes.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, e.offset, true);
    out.set(e.namaBytes, pos + 46);
    pos += 46 + e.namaBytes.length;
  }

  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entri.length, true);
  view.setUint16(pos + 10, entri.length, true);
  view.setUint32(pos + 12, ukuranSentral, true);
  view.setUint32(pos + 16, awalSentral, true);
  view.setUint16(pos + 20, 0, true);

  return out;
}

export function bangunWorkbookXlsx(daftarSheet: DefinisiSheet[]): Uint8Array {
  const overridesSheet = daftarSheet
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overridesSheet}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const sheetsTag = daftarSheet
    .map(
      (s, i) =>
        `<sheet name="${escapeXml(s.nama.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("");

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsTag}</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${daftarSheet
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("")}
  <Relationship Id="rId${daftarSheet.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return kemasZip([
    { nama: "[Content_Types].xml", isi: contentTypes },
    { nama: "_rels/.rels", isi: rootRels },
    { nama: "xl/workbook.xml", isi: workbookXml },
    { nama: "xl/_rels/workbook.xml.rels", isi: workbookRels },
    { nama: "xl/styles.xml", isi: buatStylesXml() },
    ...daftarSheet.map((s, i) => ({
      nama: `xl/worksheets/sheet${i + 1}.xml`,
      isi: buatSheetXml(s, i === 0),
    })),
  ]);
}

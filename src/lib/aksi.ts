/* Tipe hasil aksi server bersama — dipakai komponen form client (M1). */

export interface AksiHasil {
  ok: boolean;
  pesan?: string;
}

export interface BarisMitra {
  id: number;
  kode: string;
  nama: string;
  telepon: string;
  alamat: string;
  aktif: boolean;
}

export interface RawMitra {
  kode: string;
  nama: string;
  telepon: string;
  alamat: string;
  aktif: boolean;
}

/* Halaman root: selalu lempar ke halaman masuk (NF-2).
 * Dashboard utama (M6) nanti berdiri di (dashboard)/page.tsx;
 * root tetap sebagai penganti alamat awal.
 */
import { redirect } from "next/navigation";

export default function HalamanRoot() {
  redirect("/login");
}

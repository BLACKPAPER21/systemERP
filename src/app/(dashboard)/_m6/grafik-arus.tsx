"use client";

/* MILIK M6 — Grafik Penjualan vs Pembelian (Recharts).
 * Data sudah dihitung di server; komponen ini hanya merender.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRupiah } from "@/lib/format";

export type TitikGrafik = {
  label: string;
  penjualan: number;
  pembelian: number;
};

const FORMAT_RINGKAS = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function GrafikArus({ data }: { data: TitikGrafik[] }) {
  const kosong = data.every((d) => d.penjualan === 0 && d.pembelian === 0);

  if (kosong) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Belum ada penjualan atau pembelian tercatat pada periode ini.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            fontSize={12}
            tickFormatter={(v: number) => FORMAT_RINGKAS.format(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            formatter={(nilai) => formatRupiah(Number(nilai))}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="penjualan"
            name="Penjualan"
            fill="var(--chart-2)"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="pembelian"
            name="Pembelian"
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

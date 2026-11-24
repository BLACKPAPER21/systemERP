"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setujuiPO, batalPO, postingGRN, hapusDraftGRN } from "@/app/(dashboard)/pembelian/actions";

type Action = "approve" | "cancel" | "post" | "delete";
export function ActionButtons({ id, actions }: { id: number; actions: Action[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const handlers = { approve: setujuiPO, cancel: batalPO, post: postingGRN, delete: hapusDraftGRN };
  const labels = { approve: "Setujui PO", cancel: "Batalkan PO", post: "Posting GRN", delete: "Hapus draft" };
  const confirmations = { approve: "Setujui PO ini?", cancel: "Batalkan PO ini?", post: "Posting GRN? Stok dan jurnal akan langsung dicatat.", delete: "Hapus draft penerimaan ini? Kuantitas akan tersedia kembali untuk diterima." };
  function run(action: Action) {
    if (!window.confirm(confirmations[action])) return;
    setMessage("");
    startTransition(async () => {
      const result = await handlers[action](id);
      if (!result.ok) { setMessage(result.pesan); return; }
      if (action === "delete") router.push("/pembelian/grn");
      else { setMessage(result.pesan); router.refresh(); }
    });
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{actions.map((action) => <Button key={action} variant={action === "cancel" || action === "delete" ? "outline" : "default"} disabled={pending} onClick={() => run(action)}>{pending ? "Memproses..." : labels[action]}</Button>)}</div>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}

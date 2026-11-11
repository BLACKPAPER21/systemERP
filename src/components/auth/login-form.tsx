"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@demo.id");
  const [password, setPassword] = useState("demo123");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalat(null);
    setProses(true);
    try {
      const hasil = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (hasil?.error) {
        setGalat("Email atau kata sandi salah.");
        return;
      }
      router.push("/master/produk");
      router.refresh();
    } catch {
      setGalat("Gagal masuk — coba lagi.");
    } finally {
      setProses(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Kata Sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {galat ? <p className="text-sm text-destructive">{galat}</p> : null}
      <Button type="submit" className="w-full" disabled={proses}>
        {proses ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}

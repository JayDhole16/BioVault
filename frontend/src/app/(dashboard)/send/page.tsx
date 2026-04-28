"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Activity, BadgePercent, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { getToken, getWallet } from "@/lib/session";

export default function SendTransaction() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [balanceHint, setBalanceHint] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    setHasSession(!!getToken());
  }, []);

  useEffect(() => {
    const w = getWallet();
    if (!w?.address) return;
    api
      .balance(w.address)
      .then((b) => setBalanceHint(`${b.balance.toFixed(4)} ETH`))
      .catch(() => setBalanceHint("—"));
  }, []);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !amount) return;
    if (!getToken()) {
      return;
    }
    const w = getWallet();
    const from = w?.address ?? "";
    const q = new URLSearchParams({
      to: address,
      amount,
    });
    if (from) q.set("from", from);
    router.push(`/simulate?${q.toString()}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-2xl mx-auto">
      <header className="mb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <SendHorizontal className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-white">Send Assets</h1>
        <p className="text-zinc-400">Transfer tokens securely via BioVault.</p>
        {!hasSession && (
          <p className="text-sm text-amber-400 mt-3">
            Simulation requires login — <Link href="/login" className="underline text-primary">Sign in</Link>
          </p>
        )}
      </header>

      <GlassCard className="p-8">
        <form onSubmit={handleSimulate} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-zinc-300">Recipient Address (ENS or 0x)</Label>
            <Input
              id="address"
              placeholder="0x... or name.eth"
              className="bg-white/5 border-white/10 h-14 font-mono text-lg"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="amount" className="text-zinc-300">Amount</Label>
              <span className="text-sm text-zinc-500">
                Balance: {balanceHint ?? "—"}
              </span>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.00"
                className="bg-white/5 border-white/10 h-16 text-2xl pl-4 pr-20"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                <span className="font-bold text-primary mr-2">ETH</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center gap-3">
              <Zap className="text-amber-400 w-5 h-5" />
              <div>
                <div className="text-xs text-zinc-400">Estimated Gas</div>
                <div className="text-sm font-bold text-white tracking-wide">From API sim</div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center gap-3">
              <Activity className="text-emerald-400 w-5 h-5" />
              <div>
                <div className="text-xs text-zinc-400">AI Risk Check</div>
                <div className="text-sm font-bold text-white">On simulate page</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              disabled={!address || !amount || !hasSession}
            >
              Simulate Transaction <Activity className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-center text-xs text-zinc-500 mt-4 flex items-center justify-center">
              <BadgePercent className="w-4 h-4 mr-1 text-primary" />
              Transactions are simulated via the FastAPI backend before execution.
            </p>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

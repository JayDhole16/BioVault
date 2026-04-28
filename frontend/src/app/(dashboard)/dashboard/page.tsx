"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Copy, ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { getToken, getWallet } from "@/lib/session";

function shortAddr(a: string) {
  if (!a || a.length < 12) return a || "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

type TxRow = {
  id: number;
  from: string;
  to: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function Dashboard() {
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<number | null>(null);
  const [securityScore, setSecurityScore] = useState<number | null>(null);
  const [guardianCount, setGuardianCount] = useState<number | null>(null);
  const [recentTx, setRecentTx] = useState<TxRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      const w = getWallet();
      let addr = w?.address ?? "";

      if (token) {
        try {
          const info = await api.walletInfo(token);
          if (cancelled) return;
          addr = info.address;
          setAddress(info.address);
          setBalance(info.balance);
        } catch {
          if (w?.address) {
            addr = w.address;
            setAddress(w.address);
            try {
              const b = await api.balance(w.address);
              if (!cancelled) setBalance(b.balance);
            } catch {
              if (!cancelled) setBalance(null);
            }
          }
        }

        if (addr && !cancelled) {
          try {
            const f = await api.fraudCheck(token, {
              wallet_address: addr,
              to_address: addr,
              amount: 0.01,
            });
            if (!cancelled) setSecurityScore(Math.max(0, 100 - f.risk_score));
          } catch {
            if (!cancelled) setSecurityScore(null);
          }
        }

        if (!cancelled) {
          try {
            const hist = await api.transactionHistory(token, 8);
            if (!cancelled) setRecentTx(hist.transactions);
          } catch {
            if (!cancelled) setRecentTx([]);
          }
        }

        if (!cancelled) {
          try {
            const g = await api.guardianList(token);
            if (!cancelled) setGuardianCount(g.length);
          } catch {
            if (!cancelled) setGuardianCount(null);
          }
        }
      } else if (w?.address) {
        setAddress(w.address);
        try {
          const b = await api.balance(w.address);
          if (!cancelled) setBalance(b.balance);
        } catch {
          if (!cancelled) setBalance(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayBalance =
    balance != null
      ? `$${(balance * 2500).toLocaleString(undefined, { maximumFractionDigits: 2 })} (est.)`
      : "—";

  const score = securityScore ?? 98;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Welcome back to your secure vault.</p>
        </div>
        <div className="flex gap-3 object-right">
          <Link href="/send">
            <Button className="bg-primary text-black font-semibold hover:bg-primary/90">
              <Upload className="mr-2 h-4 w-4" /> Send
            </Button>
          </Link>
          <Button variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">
            <Download className="mr-2 h-4 w-4" /> Receive
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 md:col-span-2 relative overflow-hidden ring-1 ring-primary/20 bg-gradient-to-br from-[#0a0e17] to-primary/5">
          <div className="mb-2 text-zinc-400 text-sm font-medium">Total Balance (API)</div>
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">{displayBalance}</div>
          <div className="text-emerald-400 text-sm font-medium flex items-center mb-6">
            <ArrowUpRight className="h-4 w-4 mr-1" /> ETH from Hardhat when RPC is up
          </div>

          <div className="flex items-center p-3 rounded-lg bg-black/40 border border-white/5 w-fit max-w-full">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 shrink-0">
              <span className="text-primary font-bold">ETH</span>
            </div>
            <span className="font-mono text-zinc-300 text-sm tracking-wide mr-4 truncate">
              {address ? shortAddr(address) : "No wallet — complete registration"}
            </span>
            {address && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 shrink-0"
                type="button"
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(address).catch(err => console.error("Failed to copy:", err));
                  } else {
                    // Fallback for non-https or older browsers
                    const input = document.createElement('input');
                    input.value = address;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          {balance != null && (
            <p className="text-xs text-zinc-500 mt-2 font-mono">{balance.toFixed(6)} ETH</p>
          )}
        </GlassCard>

        <GlassCard className="p-6 ring-1 ring-emerald-500/20 bg-gradient-to-br from-[#0a0e17] to-emerald-500/5">
          <div className="flex justify-between items-start mb-4">
            <div className="text-zinc-400 text-sm font-medium">AI Security Score</div>
            <Activity className="text-emerald-400 h-5 w-5" />
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{score}</span>
            <span className="text-emerald-400 font-medium">/ 100</span>
          </div>

          <Progress value={score} className="h-2 bg-white/10 mb-4 [&>div]:bg-emerald-400" />
          <p className="text-xs text-zinc-400">
            <code className="text-zinc-500">/fraud/check</code>: 100 − risk (0–100). Sign in to load.
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center mb-4">
            <ShieldCheck className="h-6 w-6 text-accent mr-3" />
            <h2 className="text-xl font-semibold text-white">Guardian Network</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-sm text-zinc-400">Active Guardians</div>
                <div className="text-2xl font-bold text-white">
                  {guardianCount ?? "—"}{" "}
                  <span className="text-zinc-500 text-sm font-normal">/ 5 Slots</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/30">
                Optimal Security
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center text-sm text-zinc-300">
                <div className="w-2 h-2 rounded-full bg-accent mr-2"></div>
                Recovery Threshold: <strong className="text-white ml-1">3 Approvals</strong>
              </div>
            </div>

            <Link href="/guardians">
              <Button variant="ghost" className="w-full text-accent hover:text-accent hover:bg-accent/10 mt-2">
                Manage Guardians
              </Button>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {recentTx.length === 0 && (
              <p className="text-sm text-zinc-500">No transactions yet. Use Send → Simulate.</p>
            )}
            {recentTx.map((tx) => {
              const outgoing = address && tx.from?.toLowerCase() === address.toLowerCase();
              return (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-white/5 transition border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        outgoing ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {outgoing ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {outgoing ? "Out" : "In"} · {tx.status}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {tx.created_at} · to {shortAddr(tx.to)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${outgoing ? "text-white" : "text-emerald-400"}`}>
                      {outgoing ? "-" : "+"}
                      {tx.amount} ETH
                    </div>
                    <div className="text-xs text-zinc-500">#{tx.id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

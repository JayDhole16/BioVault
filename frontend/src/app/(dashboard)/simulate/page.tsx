"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Fingerprint,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { api, type TransactionSimulateCombined } from "@/lib/api";
import { getToken, getWallet } from "@/lib/session";

function shortAddr(a: string) {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function SimulateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "result" | "signing" | "error">("loading");
  const [combined, setCombined] = useState<TransactionSimulateCombined | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [execLoading, setExecLoading] = useState(false);

  const to = searchParams.get("to") ?? "";
  const amountStr = searchParams.get("amount") ?? "";
  const fromParam = searchParams.get("from") ?? "";

  useEffect(() => {
    const amount = parseFloat(amountStr);
    const authToken = getToken();
    if (!authToken) {
      setStatus("error");
      setErr("Sign in required. Open Login, then try again.");
      return;
    }
    const token: string = authToken;
    if (!to || Number.isNaN(amount) || amount <= 0) {
      setStatus("error");
      setErr("Missing recipient or amount. Go back to Send.");
      return;
    }

    const w = getWallet();
    const from = fromParam || w?.address || "";
    if (!from) {
      setStatus("error");
      setErr("No wallet address. Complete registration first.");
      return;
    }

    let cancelled = false;
    async function run() {
      setStatus("loading");
      setErr(null);
      try {
        const res = await api.simulateTransaction(token, {
          from_address: from,
          to_address: to,
          amount,
        });
        if (cancelled) return;
        setCombined(res);
        setStatus("result");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErr(e instanceof Error ? e.message : "Simulation failed");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [to, amountStr, fromParam]);

  const handleSign = () => {
    setStatus("signing");
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  const handleExecuteDemo = async () => {
    const token = getToken();
    if (!token || !combined) return;
    const p = combined.preview;
    setExecLoading(true);
    try {
      await api.transactionExecute(token, {
        from_address: p.from_address,
        to_address: p.to_address,
        amount: p.amount,
        gas_fee: p.gas_fee,
      });
      router.push("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setExecLoading(false);
    }
  };

  const fraud = combined?.fraud_analysis;
  const preview = combined?.preview;

  const riskPct = fraud ? Math.round(fraud.risk_score * 100) : 0;
  const riskColor =
    fraud?.risk_level === "HIGH"
      ? "text-red-400 border-red-500/30 bg-red-500/10"
      : fraud?.risk_level === "MEDIUM"
        ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
        : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";

  const totalEth =
    preview?.total != null
      ? preview.total
      : preview
        ? preview.amount + preview.gas_fee
        : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-2xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-white px-0">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-white">Simulation</h1>
        </div>
      </header>

      <GlassCard className="p-8">
        {status === "loading" && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <Activity className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white">Simulating…</h2>
            <p className="text-sm text-zinc-400 mt-2">POST /transaction/simulate (gas + fraud analysis)</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-12 text-center space-y-4">
            <p className="text-destructive">{err}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Login
              </Button>
              <Button variant="outline" onClick={() => router.push("/send")}>
                Go to Send
              </Button>
            </div>
          </div>
        )}

        {status === "result" && combined && preview && fraud && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ring-1 shadow-[0_0_20px_rgba(16,185,129,0.15)] ${riskColor}`}
              >
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Simulation Result</h2>
              <div
                className={`inline-flex items-center px-3 py-1 mt-2 rounded-full border text-xs font-semibold tracking-widest ${riskColor}`}
              >
                RISK: {riskPct}/100 · {fraud.risk_level}
              </div>
              <p className="text-xs text-zinc-500 mt-2 max-w-sm">
                Recommendation: <span className="text-white font-medium">{fraud.recommendation}</span>
              </p>
              <p className="text-xs text-zinc-600 mt-1">Tx id: {combined.transaction_id}</p>
            </div>

            {combined.warnings?.length ? (
              <ul className="text-sm text-amber-400 border border-amber-500/20 rounded-lg p-3 bg-amber-500/5 space-y-1 text-left">
                {combined.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}

            {preview.warning && (
              <p className="text-sm text-amber-400 text-center border border-amber-500/20 rounded-lg p-3 bg-amber-500/5">
                {preview.warning}
              </p>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Transfer preview</h3>
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary flex items-center h-fit">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium text-white">Amount</span>
                    <span className="font-bold text-white">{preview.amount} ETH</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>To: {shortAddr(preview.to_address)}</span>
                    <span>{preview.network ?? "hardhat"}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">From: {shortAddr(preview.from_address)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-black/40 text-sm space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>Gas (estimate)</span>
                <span className="text-white font-medium">{preview.gas_fee} ETH</span>
              </div>
              {preview.gas_units != null && (
                <div className="flex justify-between text-zinc-500 text-xs">
                  <span>Gas units</span>
                  <span>{String(preview.gas_units)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-white/10 pt-3 text-lg">
                <span className="text-white">Total (amount + gas)</span>
                <span className="text-primary">{totalEth} ETH</span>
              </div>
              {preview.estimated_time && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>ETA</span>
                  <span>{preview.estimated_time}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-left text-sm space-y-2">
              <div className="font-semibold text-zinc-300">Fraud factors</div>
              <ul className="text-xs text-zinc-400 space-y-1">
                {Object.entries(fraud.factors).map(([k, v]) => (
                  <li key={k}>
                    {k}: <span className="text-white">{String(v)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className="w-full h-14 text-lg font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                onClick={handleSign}
              >
                Approve via Biometrics <Fingerprint className="ml-2 w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white"
                disabled={execLoading || fraud.recommendation === "BLOCK"}
                onClick={handleExecuteDemo}
              >
                {execLoading ? "Submitting…" : "Execute (demo) — POST /transaction/execute"}
              </Button>
            </div>
          </motion.div>
        )}

        {status === "signing" && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75"></div>
              <Fingerprint className="w-10 h-10 text-primary relative z-10" />
            </div>
            <h2 className="text-xl font-bold text-white">Awaiting Signature…</h2>
            <p className="text-sm text-zinc-400 mt-2">Prototype: returning to dashboard.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default function SimulateTransaction() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh] text-zinc-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading simulation…
        </div>
      }
    >
      <SimulateInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/session";

export default function Settings() {
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof api.fraudMetrics>> | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.fraudUserProfile>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasToken(!!getToken());
    (async () => {
      try {
        const m = await api.fraudMetrics();
        if (!cancelled) setMetrics(m);
      } catch {
        if (!cancelled) setMetrics(null);
      }
      const token = getToken();
      if (token) {
        try {
          const p = await api.fraudUserProfile(token);
          if (!cancelled) setProfile(p);
        } catch {
          if (!cancelled) setProfile(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Security Settings</h1>
        <p className="text-zinc-400">GET /fraud/metrics · GET /fraud/user-profile (authenticated)</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-2">Fraud model (API)</h2>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          ) : metrics ? (
            <ul className="text-sm text-zinc-400 space-y-1 font-mono">
              <li>model: {metrics.model_type}</li>
              <li>version: {metrics.model_version}</li>
              <li>accuracy: {metrics.model_accuracy}</li>
              <li>analyzed: {metrics.total_transactions_analyzed}</li>
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Could not load metrics.</p>
          )}
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-2">Your fraud profile</h2>
          {!hasToken && <p className="text-sm text-zinc-500">Sign in to load profile.</p>}
          {hasToken && loading && <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />}
          {hasToken && !loading && profile && (
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>Total txs: {profile.total_transactions}</li>
              <li>Avg amount: {profile.average_transaction_amount}</li>
              <li>High-risk flagged: {profile.high_risk_transactions}</li>
            </ul>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 h-fit">
          <div className="flex items-center mb-6 border-b border-white/10 pb-4">
            <Fingerprint className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-xl font-bold">Biometric Authentication</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/5">
              <div>
                <div className="font-semibold">MacBook Pro (TouchID)</div>
                <div className="text-xs text-emerald-400 flex items-center mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span> Active
                </div>
              </div>
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Remove</Button>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/5">
              <div>
                <div className="font-semibold">iPhone 14 Pro (FaceID)</div>
                <div className="text-xs text-zinc-500 mt-1">Last used: 2 days ago</div>
              </div>
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Remove</Button>
            </div>
            
            <Button className="w-full mt-4 bg-white/10 text-white hover:bg-white/20">
              + Register New Biometric Device
            </Button>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center mb-6 border-b border-white/10 pb-4">
              <ShieldCheck className="w-6 h-6 text-accent mr-3" />
              <h2 className="text-xl font-bold">Guardian Recovery System</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Your wallet is protected by a social recovery contract. If you lose access to all your devices, your guardians can vote to restore your access.
            </p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5 text-sm font-mono mb-4">
              Account Abstraction (ERC-4337) Module Active
            </div>
            <Button className="w-full bg-accent text-white hover:bg-accent/90" onClick={() => window.location.href='/guardians'}>
              Manage Guardians
            </Button>
          </GlassCard>

          <GlassCard className="p-6 border-destructive/20 ring-1 ring-destructive/10">
            <h2 className="text-xl font-bold text-destructive mb-2">Danger Zone</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Irreversible actions related to your wallet contract.
            </p>
            <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-white transition-colors">
              Initiate Self-Destruct
            </Button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { UserSearch, LifeBuoy, Fingerprint, Clock, Search } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/session";

export default function WalletRecovery() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryId, setRecoveryId] = useState<number | null>(null);

  const handleCheckWallet = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleRequestRecovery = async () => {
    setError(null);
    const token = getToken();
    if (!token) {
      setError("Sign in first (Dashboard), then return here to call POST /recovery/request.");
      return;
    }
    setLoading(true);
    try {
      const r = await api.recoveryRequest(token);
      setRecoveryId(r.recovery_id);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNewBiometrics = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-destructive/10 blur-[150px]" />
      <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[150px]" />

      <div className="w-full max-w-lg relative z-10">
        {error && <p className="text-sm text-destructive text-center mb-4">{error}</p>}
        <GlassCard className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <LifeBuoy className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h2 className="text-2xl font-bold">Lost Access?</h2>
                  <p className="text-sm text-zinc-400 mt-2">Enter your email or wallet address to start the social recovery process.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Identifier</Label>
                    <Input 
                      id="identifier" 
                      type="text" 
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@email.com or 0x..."
                      className="bg-white/5 border-white/10 h-12"
                    />
                  </div>
                  <Button 
                    className="w-full h-14 bg-destructive text-white font-bold text-lg hover:bg-destructive/90"
                    onClick={handleCheckWallet}
                    disabled={identifier.length < 5 || loading}
                  >
                    {loading ? <Search className="animate-spin mr-2" /> : <Search className="mr-2 h-5 w-5" />}
                     Find Wallet
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                 <UserSearch className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                 <h2 className="text-xl font-bold">Wallet Found!</h2>
                 <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-left space-y-2">
                    <div className="flex justify-between">
                       <span className="text-sm text-zinc-400">Account:</span>
                       <span className="font-mono text-white text-sm">0x7F5...3b9A</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-sm text-zinc-400">Guardians Found:</span>
                       <span className="font-bold text-accent">5 Active</span>
                    </div>
                 </div>
                 
                 <Button 
                    className="w-full h-14 bg-accent text-white font-bold hover:bg-accent/90 mt-4"
                    onClick={handleRequestRecovery}
                    disabled={loading}
                  >
                    {loading ? "Sending Requests..." : "Send Recovery Requests to Guardians"}
                  </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold">Recovery Initiated</h2>
                  <p className="text-sm text-zinc-500 mt-2 font-mono">
                    Recovery ID: {recoveryId ?? "—"} (GET /recovery/status/:id)
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">Waiting for guardian approvals.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Approval Progress</span>
                    <span className="text-emerald-400">2 / 3 Required</span>
                  </div>
                  <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                     <div className="h-full bg-emerald-500 w-[66%] transition-all duration-1000 ease-out" />
                  </div>
                   <div className="space-y-2 mt-4 text-sm">
                      <div className="flex justify-between items-center p-3 rounded-md bg-white/5 border border-white/5">
                        <span className="text-emerald-400 flex items-center">✓ Alice Doe</span>
                        <span className="text-xs text-zinc-500">Approved</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-md bg-white/5 border border-white/5">
                        <span className="text-emerald-400 flex items-center">✓ Dave Evans</span>
                        <span className="text-xs text-zinc-500">Approved</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-md bg-white/5 border border-white/5">
                        <span className="text-amber-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Bob Smith</span>
                        <span className="text-xs text-zinc-500">Pending</span>
                      </div>
                  </div>
                </div>

                <Button 
                   className="w-full h-14 bg-primary text-black font-bold text-lg hover:bg-primary/90 mt-6"
                   onClick={handleRegisterNewBiometrics}
                   disabled={loading} // In real app, disabled until threshold met
                >
                   {loading ? "Setting Up..." : "Register New Wallet Key"} <Fingerprint className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  );
}

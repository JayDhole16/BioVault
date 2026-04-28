"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { ShieldCheck, UserX, Fingerprint, Lock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function GuardianApproval() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recoveryRequestId, setRecoveryRequestId] = useState("");
  const [guardianId, setGuardianId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    if (!recoveryRequestId.trim() || !guardianId.trim()) {
      setError("Enter recovery request ID and guardian ID (from email/link).");
      return;
    }
    setError(null);
    setStep(2);
  };
  const handleReject = () => router.push("/");

  const handleSignBiometric = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.recoveryApprove({
        recovery_request_id: parseInt(recoveryRequestId, 10),
        guardian_id: parseInt(guardianId, 10),
      });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[20%] right-[30%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[120px]" />
      
      <div className="w-full max-w-md relative z-10">
        {error && <p className="text-sm text-destructive text-center mb-3">{error}</p>}
        <GlassCard className="p-8 relative overflow-hidden ring-1 ring-accent/30 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-accent/20 mx-auto flex items-center justify-center mb-4 ring-1 ring-accent/50">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold">Recovery Request</h2>
                <div className="bg-white/5 border border-accent/20 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium">Wallet Owner:</p>
                  <p className="text-lg font-bold text-white">Alice Doe</p>
                  <p className="text-xs text-zinc-400 font-mono mt-1">0x7F5...3b9A</p>
                </div>
                <p className="text-sm text-zinc-400 bg-destructive/10 text-destructive p-3 rounded border border-destructive/20 text-left">
                  Warning: Only approve if the wallet owner confirmed out-of-band. POST /recovery/approve
                </p>

                <div className="space-y-3 text-left">
                  <div className="space-y-1">
                    <Label htmlFor="rid">Recovery request ID</Label>
                    <Input
                      id="rid"
                      className="bg-white/5 border-white/10"
                      value={recoveryRequestId}
                      onChange={(e) => setRecoveryRequestId(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gid">Your guardian ID</Label>
                    <Input
                      id="gid"
                      className="bg-white/5 border-white/10"
                      value={guardianId}
                      onChange={(e) => setGuardianId(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>
                
                <div className="space-y-3 pt-4">
                  <Button 
                    className="w-full h-12 bg-accent text-white font-bold hover:bg-accent/90 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                    onClick={handleApprove}
                  >
                     Approve Request
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={handleReject}
                  >
                    <UserX className="w-4 h-4 mr-2" /> Reject
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
                <div className="mb-6">
                  <div className="w-24 h-24 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-6 relative group">
                    <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-75"></div>
                    <Fingerprint className="w-10 h-10 text-accent relative z-10" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Sign Approval</h3>
                  <p className="text-sm text-zinc-400">
                    Use your biometrics to cryptographically sign the account recovery transcript.
                  </p>
                </div>
                
                <Button 
                  className="w-full h-12 bg-accent text-white font-bold hover:bg-accent/90"
                  onClick={handleSignBiometric}
                  disabled={loading}
                >
                  {loading ? "Authenticating..." : "Sign with Biometrics"}
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-6"
              >
                <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">Approval Submitted!</h3>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                  Your cryptographic signature has been submitted to the smart contract. The owner will regain access once the threshold is met.
                </p>
                <div className="pt-6">
                  <Button 
                    className="w-full h-12 bg-white/10 text-white font-bold hover:bg-white/20"
                    onClick={() => router.push("/")}
                  >
                    Return Home
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { ShieldCheck, MailPlus, Fingerprint, RefreshCcw, Handshake } from "lucide-react";

export default function GuardianInvite() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccept = () => setStep(2);
  const handleDecline = () => router.push("/");

  const handleVerifyOtp = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  const handleRegisterBiometric = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(4);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[20%] right-[30%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[120px]" />
      
      <div className="w-full max-w-md relative z-10">
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
                <Handshake className="w-16 h-16 text-accent mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Recovery Guardian Invitation</h2>
                <div className="bg-white/5 border border-accent/20 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium">Invited by:</p>
                  <p className="text-lg font-bold text-accent">Alice Doe (alice@biovault.test)</p>
                </div>
                <p className="text-sm text-zinc-400">
                  You have been invited to act as a Recovery Guardian. You will help recover this wallet if the owner loses access.
                </p>
                
                <div className="space-y-3 pt-4">
                  <Button 
                    className="w-full h-12 bg-accent text-white font-bold hover:bg-accent/90"
                    onClick={handleAccept}
                  >
                    Accept Guardian Role
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full h-12 text-zinc-400 hover:text-white"
                    onClick={handleDecline}
                  >
                    Decline
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
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <MailPlus className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold">Verify your Email</h3>
                  <p className="text-sm text-zinc-400 mt-2">Enter the verification code sent to your email to confirm acceptance.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">6-Digit Code</Label>
                    <Input 
                      id="otp" 
                      type="text" 
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="• • • • • •"
                      className="bg-white/5 border-white/10 h-12 text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button 
                    className="w-full h-12 bg-accent text-white font-bold hover:bg-accent/90"
                    onClick={handleVerifyOtp}
                    disabled={otp.length < 6 || loading}
                  >
                    {loading ? <RefreshCcw className="animate-spin h-5 w-5" /> : "Verify Code"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
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
                  <h3 className="text-xl font-semibold mb-2">Register Biometric</h3>
                  <p className="text-sm text-zinc-400">
                    Secure your Guardian account with WebAuthn biometrics. You will need this to approve future recovery requests.
                  </p>
                </div>
                
                <Button 
                  className="w-full h-12 bg-accent text-white font-bold hover:bg-accent/90"
                  onClick={handleRegisterBiometric}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Authenticating...
                    </span>
                  ) : "Register Biometrics"}
                </Button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-6"
              >
                <ShieldCheck className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">Guardian Ready!</h3>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                  You are now officially a Recovery Guardian. You will receive notifications if a recovery request is initiated.
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

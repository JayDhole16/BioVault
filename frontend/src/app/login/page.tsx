"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { Fingerprint, Smartphone, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { setSession, setWallet } from "@/lib/session";
import { authenticateBiometric, credentialToJSON, isBiometricAvailable } from "@/lib/webauthn";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "biometric" | "new_device" | "otp">("select");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleBiometricLogin = async () => {
    if (username.trim().length < 2) {
      setError("Enter your username.");
      return;
    }
    setError(null);
    
    // Check if biometric is available
    const available = await isBiometricAvailable();
    if (!available) {
      // Enhanced error with HTTPS troubleshooting
      const isSecure = window.isSecureContext;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let errorMsg = "Biometric authenticator not available. ";
      if (!isSecure && !isLocalhost) {
        errorMsg += "\n\n⚠️ HTTPS Required: WebAuthn requires HTTPS for security. Solutions:\n";
        errorMsg += "1. Access via HTTPS (set up SSL certificate)\n";
        errorMsg += "2. Use localhost on your device\n";
        errorMsg += "3. Use ngrok: ngrok http 3000 (gets HTTPS URL)\n";
        errorMsg += `\nCurrent URL: ${window.location.href}`;
      }
      setError(errorMsg);
      return;
    }
    
    setLoading(true);
    setMode("biometric");
    
    try {
      // Get authentication challenge from backend
      const challengeResponse = await api.getAuthenticationChallenge(username.trim());
      
      // Prompt user to verify fingerprint
      const assertion = await authenticateBiometric(challengeResponse.challenge);
      
      // assertion from @simplewebauthn/browser is already JSON-ready — pass directly
      const assertionJSON = assertion;
      
      // Complete authentication with backend
      const res = await api.completeWebAuthnLogin(username.trim(), assertionJSON, challengeResponse.session_key);
      
      setSession(
        res.access_token,
        { id: "", email: "", username: username.trim() },
        username.trim()
      );
      
      const me = await api.me(res.access_token);
      setSession(res.access_token, me, me.username);
      
      try {
        const info = await api.walletInfo(res.access_token);
        setWallet({
          address: info.address,
          public_key: info.public_key,
          network: info.network,
          created_at: info.created_at,
        });
      } catch {
        /* wallet optional */
      }
      
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Biometric login failed");
      setMode("select");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.newDeviceLogin(email.trim());
      setMode("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(email.trim(), otp.trim());
      const me = await api.me(res.access_token);
      setSession(res.access_token, me, me.username);
      try {
        const info = await api.walletInfo(res.access_token);
        setWallet({
          address: info.address,
          public_key: info.public_key,
          network: info.network,
          created_at: info.created_at,
        });
      } catch {
        /* wallet optional */
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        {error && (
          <p className="text-sm text-destructive text-center mb-4">{error}</p>
        )}
        <GlassCard className="p-8">
          <AnimatePresence mode="wait">
            {mode === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-center"
              >
                <Fingerprint className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Welcome Back</h2>
                <p className="text-sm text-zinc-400">Sign in with your username, then confirm with biometrics (prototype).</p>

                <div className="space-y-4 pt-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your BioVault username"
                      className="bg-white/5 border-white/10 h-12"
                      autoComplete="username"
                    />
                  </div>
                  <Button
                    className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 text-white font-medium justify-start px-4 transition-all"
                    onClick={handleBiometricLogin}
                    disabled={loading || username.trim().length < 2}
                  >
                    <Fingerprint className="mr-4 h-6 w-6 text-primary" />
                    {loading ? "Signing in..." : "Login with Biometrics"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium justify-start px-4 transition-all"
                    onClick={() => setMode("new_device")}
                  >
                    <Smartphone className="mr-4 h-6 w-6 text-accent" />
                    Login from New Device
                  </Button>
                </div>
              </motion.div>
            )}

            {mode === "biometric" && (
              <motion.div
                key="biometric"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center py-8"
              >
                <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75"></div>
                  <Fingerprint className="w-10 h-10 text-primary relative z-10" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Authenticating...</h3>
                <p className="text-sm text-zinc-400">Contacting API and verifying session.</p>
              </motion.div>
            )}

            {mode === "new_device" && (
              <motion.div
                key="new_device"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button onClick={() => setMode("select")} className="text-sm text-zinc-400 hover:text-white flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div>
                  <h3 className="text-xl font-semibold">Account Recovery</h3>
                  <p className="text-sm text-zinc-400 mt-2">Enter your email to receive a login OTP, then register this new device&apos;s biometrics.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-white/5 border-white/10 h-12"
                    />
                  </div>
                  <Button
                    className="w-full h-12 bg-primary text-black font-bold text-lg hover:bg-primary/90"
                    onClick={handleSendOtp}
                    disabled={!email.includes("@") || loading}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </Button>
                </div>
              </motion.div>
            )}

            {mode === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-semibold">Verify OTP</h3>
                  <p className="text-sm text-zinc-400 mt-2">Enter the verification code sent to {email}.</p>
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
                    className="w-full h-12 bg-primary text-black font-bold text-lg hover:bg-primary/90"
                    onClick={handleVerifyOtp}
                    disabled={otp.length < 6 || loading}
                  >
                    {loading ? "Verifying…" : "Verify & Register Device"}
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

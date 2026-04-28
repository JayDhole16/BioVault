"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { Fingerprint, Mail, RefreshCcw, ShieldCheck, UserPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { api, type GuardianDto } from "@/lib/api";
import { getToken, setSession, setWallet } from "@/lib/session";
import { registerBiometric, credentialToJSON, isBiometricAvailable } from "@/lib/webauthn";

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [guardians, setGuardians] = useState<GuardianDto[]>([]);
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gRelationship, setGRelationship] = useState("friend");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepsCount = 4;
  const progressPercent = ((step - 1) / stepsCount) * 100;

  const nextStep = () => {
    if (step < stepsCount) setStep(step + 1);
  };

  const handleRegisterAccount = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.register({ email, username: username.trim() });
      setSession(res.access_token, res.user, res.user.username);
      const info = await api.walletInfo(res.access_token);
      setWallet({
        address: info.address,
        public_key: info.public_key,
        network: info.network,
        created_at: info.created_at,
      });
      nextStep();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    const token = getToken();
    if (!token) {
      setError("Session expired. Please complete step 1 again.");
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Check if biometric is available
      const available = await isBiometricAvailable();
      if (!available) {
        const isSecure = window.isSecureContext;
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        let errorMsg = "Biometric authenticator not available. ";
        
        if (!isSecure && !isLocalhost) {
          errorMsg += "\n\n⚠️ HTTPS Required: You're accessing via HTTP on a network address. WebAuthn requires HTTPS for security.\n\n";
          errorMsg += "Solutions:\n";
          errorMsg += "1. Access via HTTPS (set up SSL certificate)\n";
          errorMsg += "2. Use localhost on your device\n";
          errorMsg += "3. Use ngrok: ngrok http 3000 (gets HTTPS URL)\n";
          errorMsg += `\nCurrent URL: ${window.location.href}`;
        } else {
          errorMsg += "Troubleshooting:\n";
          errorMsg += "• Check if fingerprint/face recognition is enabled on device\n";
          errorMsg += "• Update your browser to the latest version\n";
          errorMsg += "• Try Chrome, Firefox, Safari, or Edge\n";
          errorMsg += "• Restart the browser and try again";
        }
        
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      // Get registration challenge from backend
      const challengeResponse = await api.getRegistrationChallenge(token, email, username);
      
      // Prompt user to enroll fingerprint
      const attestation = await registerBiometric(username, email, challengeResponse.challenge);
      
      // Convert to JSON for submission
      const credentialJSON = credentialToJSON(attestation);
      
      // Complete registration with backend
      await api.completeWebAuthnRegistration(token, credentialJSON, challengeResponse.session_key);
      
      // Move to next step
      nextStep();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Biometric registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletStep = async () => {
    const token = getToken();
    if (!token) {
      setError("Session expired. Start again from step 1.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const info = await api.walletInfo(token);
      setWallet({
        address: info.address,
        public_key: info.public_key,
        network: info.network,
        created_at: info.created_at,
      });
      nextStep();
    } catch {
      try {
        const w = await api.generateWallet(token);
        setWallet({
          address: w.address,
          public_key: w.public_key,
          network: w.network,
          created_at: w.created_at,
        });
        nextStep();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet setup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 4) return;
    const token = getToken();
    if (!token) return;
    api
      .guardianList(token)
      .then(setGuardians)
      .catch(() => {});
  }, [step]);

  const handleAddGuardian = async () => {
    const token = getToken();
    if (!token || !gName.trim() || !gEmail.includes("@")) {
      setError("Enter guardian name and valid email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.guardianAdd(token, {
        guardian_name: gName.trim(),
        guardian_email: gEmail.trim(),
        relationship: gRelationship,
      });
      const list = await api.guardianList(token);
      setGuardians(list);
      setGName("");
      setGEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add guardian");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishRegistration = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[100px]" />

      <div className="w-full max-w-lg relative z-10">
        <div className="mb-8 text-center">
          <Fingerprint className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Create BioVault</h2>
          <p className="text-zinc-400">Step {step} of {stepsCount}</p>
          <Progress value={progressPercent} className="mt-4 h-2 bg-white/10" />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mb-4 max-w-lg mx-auto">{error}</p>
        )}

        <GlassCard className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <Mail className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold">Enter your email</h3>
                  <p className="text-sm text-zinc-400 mt-2">This will be your primary identifier.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="jane_doe"
                      className="bg-white/5 border-white/10 h-12"
                      autoComplete="username"
                    />
                  </div>
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
                    onClick={handleRegisterAccount}
                    disabled={!email.includes('@') || username.trim().length < 2 || loading}
                  >
                    {loading ? "Creating account..." : "Continue"}
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
                  <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 relative group">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75"></div>
                    <Fingerprint className="w-10 h-10 text-primary relative z-10" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Biometric Authentication</h3>
                  <p className="text-sm text-zinc-400">
                    Use FaceID, TouchID, or your security key to secure your wallet via WebAuthn. No passwords needed.
                  </p>
                </div>
                
                <Button 
                  className="w-full h-12 bg-primary text-black font-bold text-lg hover:bg-primary/90"
                  onClick={handleRegisterBiometrics}
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

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div className="mb-6">
                  <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-2">Wallet ready</h3>
                  <p className="text-sm text-zinc-400">
                    A wallet was created at registration. Confirm to sync or regenerate if needed.
                  </p>
                </div>

                <Button 
                  className="w-full h-12 neon-border bg-emerald-500/10 text-emerald-400 font-bold text-lg hover:bg-emerald-500/20"
                  onClick={handleWalletStep}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Syncing wallet…
                    </span>
                  ) : "Continue"}
                </Button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <UserPlus className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h3 className="text-xl font-semibold">Add Recovery Guardians</h3>
                  <p className="text-sm text-zinc-400 mt-2">
                    Add 3 to 5 trusted people to help recover your wallet if you lose your device.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Guardians Added</span>
                    <span className="font-mono text-primary">{guardians.length} / 5</span>
                  </div>
                  <Progress value={(guardians.length / 5) * 100} className="h-2 bg-white/10" />

                  {/* Add Guardian form inside here or open modal. For mock, we just click to add. */}
                  {guardians.length < 5 && (
                    <div className="p-4 border border-white/10 rounded-lg bg-black/40 space-y-3">
                      <Input
                        placeholder="Guardian Name"
                        className="bg-white/5 border-none h-10"
                        value={gName}
                        onChange={(e) => setGName(e.target.value)}
                      />
                      <Input
                        placeholder="Guardian Email"
                        type="email"
                        className="bg-white/5 border-none h-10"
                        value={gEmail}
                        onChange={(e) => setGEmail(e.target.value)}
                      />
                      <Input
                        placeholder="Relationship (e.g. friend)"
                        className="bg-white/5 border-none h-10"
                        value={gRelationship}
                        onChange={(e) => setGRelationship(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        className="w-full text-white bg-white/10 hover:bg-white/20"
                        type="button"
                        onClick={handleAddGuardian}
                        disabled={loading}
                      >
                        + Add Guardian (API)
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    {guardians.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/5"
                      >
                        <div className="text-sm font-medium">
                          {g.guardian_name}{" "}
                          <span className="text-zinc-500 ml-2">
                            ({g.guardian_email}) · {g.relationship}
                          </span>
                          {g.is_verified ? (
                            <span className="ml-2 text-xs text-emerald-400">verified</span>
                          ) : (
                            <span className="ml-2 text-xs text-amber-400">pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full h-12 bg-primary text-black font-bold text-lg hover:bg-primary/90 mt-4"
                    onClick={handleFinishRegistration}
                    disabled={guardians.length < 3}
                  >
                    {guardians.length < 3 ? "Require Min 3 Guardians" : "Finish Setup"}
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

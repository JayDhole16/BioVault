"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Fingerprint, ShieldAlert, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e17] text-white overflow-hidden relative selection:bg-primary/30">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/20 blur-[150px] pointer-events-none" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <Fingerprint className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-glow">BioVault</span>
        </div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="text-zinc-300 hover:text-white">Log in</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-primary text-black hover:bg-primary/90 font-medium">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl space-y-8"
        >
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Next generation Web3 Security
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Biometric Secured <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Decentralized Wallet
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Experience military-grade security without the friction. No seed phrases, just your biometric signature and an AI-driven guardian network protecting your crypto.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="h-14 px-8 bg-primary text-secondary font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_50px_rgba(0,240,255,0.5)] transition-all">
                Create Wallet Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 border-white/20 hover:bg-white/10 rounded-xl text-lg text-white">
                Log into BioVault
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mt-32"
        >
          <FeatureCard 
            icon={<Fingerprint className="w-8 h-8 text-primary" />}
            title="Biometric Security"
            desc="WebAuthn integration secures your private keys strictly to your device's biometric enclave."
          />
          <FeatureCard 
            icon={<Users className="w-8 h-8 text-accent" />}
            title="Guardian Recovery"
            desc="Social recovery via trusted guardians ensures you never lose access, even if your device breaks."
          />
          <FeatureCard 
            icon={<ShieldAlert className="w-8 h-8 text-destructive" />}
            title="AI Fraud Detection"
            desc="Real-time transaction simulation and predictive AI scores protect you from malicious contracts."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-amber-400" />}
            title="Gasless Experience"
            desc="Account abstraction and meta-transactions enable seamless, sponsored interactions across Web3."
          />
        </motion.div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <GlassCard className="p-6 text-left hover:-translate-y-2 transition-transform duration-300">
      <div className="mb-4 inline-flex p-3 rounded-xl bg-white/5 border border-white/10">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-zinc-400">{desc}</p>
    </GlassCard>
  );
}

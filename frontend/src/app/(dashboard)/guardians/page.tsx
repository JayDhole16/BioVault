"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserMinus, UserPlus, Info, Loader2, Mail } from "lucide-react";
import { api, type GuardianDto } from "@/lib/api";
import { getToken } from "@/lib/session";

export default function GuardiansManagement() {
  const [guardians, setGuardians] = useState<GuardianDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gRelationship, setGRelationship] = useState("friend");

  const load = async () => {
    const token = getToken();
    if (!token) {
      setGuardians([]);
      setLoading(false);
      return;
    }
    try {
      const list = await api.guardianList(token);
      setGuardians(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load guardians");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    const token = getToken();
    if (!token || !gName.trim() || !gEmail.includes("@")) {
      setError("Enter name and valid email.");
      return;
    }
    setLoading(true);
    try {
      await api.guardianAdd(token, {
        guardian_name: gName.trim(),
        guardian_email: gEmail.trim(),
        relationship: gRelationship,
      });
      setGName("");
      setGEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (g: GuardianDto) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      await api.guardianInvite(token, parseInt(g.id, 10));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <ShieldCheck className="w-8 h-8 text-accent mr-3" />
            Guardian Management
          </h1>
          <p className="text-zinc-400 mt-2">Connected to GET /guardian/list and POST /guardian/add · /guardian/invite</p>
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Your Guardians</h2>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-mono">
              {guardians.length} / 5
            </span>
          </div>

          {loading && guardians.length === 0 ? (
            <div className="flex items-center gap-2 text-zinc-400 py-8">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {guardians.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition gap-3"
                >
                  <div className="mb-2 sm:mb-0 min-w-0">
                    <div className="font-bold flex items-center flex-wrap gap-2">
                      {g.guardian_name}
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full uppercase tracking-wider ${
                          g.is_verified ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {g.is_verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <div className="text-zinc-400 mt-1">
                      {g.guardian_email} · <span className="text-zinc-500">{g.relationship}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!g.is_verified && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-white bg-primary/20 hover:bg-primary/30"
                        type="button"
                        onClick={() => handleInvite(g)}
                        disabled={loading}
                      >
                        <Mail className="w-4 h-4 mr-1" /> Invite
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive opacity-50" disabled>
                      <UserMinus className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
              {guardians.length === 0 && !loading && (
                <p className="text-zinc-500 py-4">No guardians yet. Add one below or during registration.</p>
              )}
            </div>
          )}
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Add guardian</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="g-name">Name</Label>
                <Input
                  id="g-name"
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-email">Email</Label>
                <Input
                  id="g-email"
                  type="email"
                  value={gEmail}
                  onChange={(e) => setGEmail(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-rel">Relationship</Label>
                <Input
                  id="g-rel"
                  value={gRelationship}
                  onChange={(e) => setGRelationship(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <Button className="w-full bg-primary text-black" type="button" onClick={handleAdd} disabled={loading}>
                Add via API
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-accent/5 ring-1 ring-accent/20">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 text-accent mr-2" />
              <h3 className="font-bold">Recovery Rule</h3>
            </div>
            <p className="text-xl font-bold text-white mb-2">
              3 of 5 <span className="text-sm font-normal text-zinc-400">approvals required</span>
            </p>
            <p className="text-xs text-zinc-400">
              Guardian verify flow: POST /guardian/verify (OTP). Recovery: POST /recovery/request.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

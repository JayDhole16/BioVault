"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyGuardian() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [guardianId, setGuardianId] = useState(searchParams.get("guardian_id") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://0.0.0.0:8000/api/v1/guardian/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guardian_id: parseInt(guardianId),
            otp_code: otp,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Verification failed");
      }

      const data = await response.json();
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Guardian Verification
            </h1>
            <p className="text-slate-400">
              Enter your Guardian ID and the OTP code you received
            </p>
          </div>

          {success ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 text-center">
              <p className="text-green-400 font-semibold">✓ Verification Successful!</p>
              <p className="text-green-300 text-sm mt-2">
                You are now verified as a guardian. Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {/* Guardian ID Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Guardian ID
                </label>
                <input
                  type="number"
                  value={guardianId}
                  onChange={(e) => setGuardianId(e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  OTP Code (6 digits)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase())}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-center text-lg tracking-widest"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Check your email or the recovery request details for the OTP
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !guardianId || !otp}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {loading ? "Verifying..." : "Verify as Guardian"}
              </button>
            </form>
          )}

          {/* Help Section */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Need Help?</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Guardian ID: Provided in the recovery request</li>
              <li>• OTP Code: Check email (6 digits)</li>
              <li>• OTP expires in 30 minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import * as React from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Props = { hasPassword: boolean };

export default function SetPasswordForm({ hasPassword }: Props) {
  const [pwd, setPwd] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [nonce, setNonce] = React.useState("");
  const [step, setStep] = React.useState<"edit" | "need-otp" | "done">("edit");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function validate() {
    if (pwd !== confirm) return "Passwords do not match.";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd))
      return "Use at least 8 chars with upper, lower, and a number.";
    return null;
  }

  async function sendReauth() {
    setErr(null); setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/account/password/reauth", {
        method: "POST",
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send code.");
      }

      setMsg("We emailed you a 6-digit code. Enter it below to finish.");
    } catch (e: any) {
      setErr(e.message || "Error sending code.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    const v = validate();
    if (v) return setErr(v);

    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword: pwd, nonce: step === "need-otp" ? nonce : undefined }),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (jsonError) {
          if (!res.ok) {
            throw new Error("Server error - please try again");
          }
        }
      }

      if (res.status === 412) {
        setStep("need-otp");
        await sendReauth();
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update password.");
      }

      setStep("done");
      setMsg(hasPassword ? "Password updated." : "Password created. You can now sign in with email + password.");
      setPwd(""); setConfirm(""); setNonce("");
    } catch (e: any) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-700 space-y-6">
      <h2 className="text-xl font-bold text-white">{hasPassword ? "Change Password" : "Create Password"}</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">New password</label>
        <input
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-gray-400">
          At least 8 chars with upper, lower, and a number.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
          autoComplete="new-password"
          required
        />
      </div>

      {step === "need-otp" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">6-digit code</label>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={nonce}
            onChange={e => setNonce(e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
            placeholder="Enter code"
            required
          />
          <button
            type="button"
            className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
            onClick={sendReauth}
            disabled={loading}
          >
            Resend code
          </button>
        </div>
      )}

      {msg && (
        <div className="relative bg-gradient-to-br from-green-800/30 via-green-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-3 border border-green-500/30">
          <p className="text-sm text-green-200">{msg}</p>
        </div>
      )}

      {err && (
        <div className="relative bg-gradient-to-br from-red-800/30 via-red-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-3 border border-red-500/30">
          <p className="text-sm text-red-200">{err}</p>
        </div>
      )}

      <button
        type="submit"
        className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
          loading
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-[#e21c21] hover:bg-[#c11a1e] text-white shadow-lg'
        }`}
        disabled={loading}
      >
        {loading ? "Saving..." : step === "need-otp" ? "Finish update" : (hasPassword ? "Update password" : "Create password")}
      </button>
    </form>
  );
}
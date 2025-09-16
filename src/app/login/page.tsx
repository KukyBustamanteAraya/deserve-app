"use client";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = supabaseClient();
  const [email, setEmail] = useState("");

  async function sendMagicLink() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    alert(error ? error.message : "Magic link sent! Check your email.");
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Login</h1>
        <input
          className="w-full border p-2 rounded"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={sendMagicLink}
          className="w-full bg-black text-white py-2 rounded"
        >
          Send magic link
        </button>
      </div>
    </main>
  );
}

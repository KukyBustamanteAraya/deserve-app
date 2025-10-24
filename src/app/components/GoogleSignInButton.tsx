"use client";

import { useState } from "react";
import { signInWithGoogleAction } from "@/app/(auth)/google-auth-action";
import { logger } from "@/lib/logger";

interface GoogleSignInButtonProps {
  text?: string;
  className?: string;
}

/**
 * Google Sign-In Button Component
 *
 * Displays a branded Google sign-in button that triggers OAuth flow.
 * Uses server action to initiate the authentication process securely.
 *
 * Features:
 * - Google branding guidelines compliant
 * - Loading state with spinner
 * - Error handling
 * - Accessible
 */
export default function GoogleSignInButton({
  text = "Continue with Google",
  className = "",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      logger.info("[GoogleSignInButton] Initiating Google sign-in");

      await signInWithGoogleAction();
      // If successful, user will be redirected to Google
      // No code runs after this point in success case
    } catch (err: any) {
      logger.error("[GoogleSignInButton] Sign-in error:", err);
      setError(err.message || "Failed to initiate Google sign-in");
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        type="button"
        className="relative w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        {/* Google Logo SVG */}
        {!isLoading ? (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        ) : (
          <span className="inline-block h-5 w-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
        )}

        <span className="relative text-sm font-medium">
          {isLoading ? "Connecting..." : text}
        </span>

        {/* Subtle hover effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resendConfirmation } = useAuth();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await resendConfirmation(email);
      
      if (result.error) {
        setError(result.error.message || 'Failed to resend confirmation email');
      } else {
        setMessage('Confirmation email sent! Please check your inbox.');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check Your Email</h1>
          <p className="mt-2 text-gray-600">
            We've sent a confirmation link to your email address
          </p>
        </div>

        {/* Content */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="space-y-4">
            <p className="text-gray-700">
              Please check your email and click the confirmation link to activate your account.
            </p>
            
            {email && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Email sent to:</strong> {email}
                </p>
              </div>
            )}

            {/* Resend Section */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the email? Check your spam folder or resend:
              </p>
              
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <button
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Resend Confirmation Email'}
                </button>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Back to Login */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/login')}
                className="w-full text-blue-600 hover:text-blue-500 font-medium"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact support for assistance
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
      </main>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}

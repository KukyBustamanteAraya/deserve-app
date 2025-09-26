// src/app/auth/forgot/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const sent = searchParams.get('sent');
  const error = searchParams.get('error');
  const [cooldown, setCooldown] = useState(0);

  // Simple cooldown to prevent spam (client-side only)
  const handleSubmit = (e: React.FormEvent) => {
    if (cooldown > 0) {
      e.preventDefault();
      return;
    }

    // Start 60-second cooldown
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              If an account exists for that email, we've sent a reset link.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Didn't receive an email? Check your spam folder or try again.
              </p>
              <a
                href="/auth/forgot"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Try again
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a reset link.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div role="alert" aria-live="polite" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action="/auth/forgot/action" method="post" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={cooldown > 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : 'Send reset link'}
              </button>
            </div>

            <div className="text-center">
              <a
                href="/login"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Back to login
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
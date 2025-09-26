// src/app/auth/reset/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { dictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common';
import { dictionary as englishDictionary, translations } from '@zxcvbn-ts/language-en';
import { getAuthStrings } from '@/lib/i18n/auth';

zxcvbnOptions.setOptions({
  translations,
  dictionary: { ...dictionary, ...englishDictionary },
  graphs: adjacencyGraphs,
});

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const strings = getAuthStrings();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [hasConfirmFocus, setHasConfirmFocus] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const error = searchParams?.get('error');
  const success = searchParams?.get('success');

  // Check password strength
  useEffect(() => {
    if (password.length > 0) {
      const result = zxcvbn(password);
      setPasswordStrength(result.score);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  // Check password match when user has interacted with confirm field
  useEffect(() => {
    if (hasConfirmFocus || confirmPassword.length > 0) {
      setPasswordsMatch(confirmPassword === password);
    }
  }, [password, confirmPassword, hasConfirmFocus]);

  const isValidLength = password.length >= 8;
  const isStrongEnough = passwordStrength >= 2; // "Okay" or better
  const canSubmit = isValidLength && isStrongEnough && passwordsMatch && confirmPassword.length > 0 && cooldown === 0;

  const handleSubmit = (e: React.FormEvent) => {
    if (cooldown > 0) {
      e.preventDefault();
      return;
    }

    setCooldown(30);
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

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'text-red-600 bg-red-100';
      case 2:
        return 'text-yellow-600 bg-yellow-100';
      case 3:
        return 'text-blue-600 bg-blue-100';
      case 4:
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStrengthBarWidth = (score: number) => {
    return `${(score + 1) * 20}%`;
  };

  const getStrengthBarColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Password updated
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully changed.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <a
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go to login
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
            {strings.reset_title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {strings.reset_subtitle}
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

          <form action="/auth/reset/action" method="post" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {strings.label_new_password}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-600 hover:text-gray-800"
                  aria-label={showPassword ? strings.hide : strings.show}
                >
                  {showPassword ? strings.hide : strings.show}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {strings.requirements_hint}
              </p>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Strength:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStrengthColor(passwordStrength)}`}>
                      {strings.strength_labels[passwordStrength as keyof typeof strings.strength_labels]}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${getStrengthBarColor(passwordStrength)}`}
                      style={{ width: getStrengthBarWidth(passwordStrength) }}
                    />
                  </div>
                  {!isStrongEnough && isValidLength && (
                    <p className="mt-1 text-xs text-amber-600">
                      {strings.tip_weaker}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                {strings.label_confirm_password}
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setHasConfirmFocus(true)}
                  placeholder="Confirm your new password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-600 hover:text-gray-800"
                  aria-label={showConfirmPassword ? strings.hide : strings.show}
                >
                  {showConfirmPassword ? strings.hide : strings.show}
                </button>
              </div>
              {/* Inline mismatch warning */}
              {hasConfirmFocus && confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">
                  {strings.passwords_mismatch}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : strings.cta_update}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
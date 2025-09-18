"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword, validateForm } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    userType: "consumer" as "consumer" | "provider",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateRegisterForm = (): boolean => {
    const validation = validateForm(formData, {
      email: (value) => {
        if (!value.trim()) return "Email is required";
        if (!validateEmail(value)) return "Please enter a valid email";
        return null;
      },
      password: (value) => {
        if (!value) return "Password is required";
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) return passwordValidation.message || "Invalid password";
        return null;
      },
      confirmPassword: (value) => {
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return null;
      },
      fullName: (value) => {
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Full name must be at least 2 characters";
        return null;
      },
    });

    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) return;

    setLoading(true);
    try {
      const result = await signUp(formData.email, formData.password, {
        fullName: formData.fullName,
        userType: formData.userType,
      });
      
      if (result.error) {
        setErrors({ general: result.error.message || 'Registration failed' });
      } else if (result.needsConfirmation) {
        // Email confirmation required
        router.push('/auth/confirm-email?email=' + encodeURIComponent(formData.email));
      } else {
        // Success - redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-gray-600">Join us today</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            {/* Full Name Field */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.fullName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John Doe"
                disabled={loading}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2 mt-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="you@email.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* User Type Selection */}
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Account Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="consumer"
                    checked={formData.userType === "consumer"}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value as "consumer" | "provider" })}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">Consumer</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="provider"
                    checked={formData.userType === "provider"}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value as "consumer" | "provider" })}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">Provider</span>
                </label>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2 mt-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Create a password"
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2 mt-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Trust Indicator */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 Your data is protected with bank-grade encryption
          </p>
        </div>
      </div>
    </main>
  );
}

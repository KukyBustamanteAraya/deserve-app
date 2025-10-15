'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/user';

interface ProfileFormProps {
  user: any;
  profile: UserProfile;
}

export default function ProfileForm({ user, profile }: ProfileFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    avatar_url: profile.avatar_url || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setSuccess(true);
      router.refresh(); // Refresh the page to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative">
      {/* Read-only user info */}
      <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 overflow-hidden group/info">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
        <h3 className="font-medium text-white mb-3 relative">Account Information</h3>
        <div className="space-y-2 text-sm relative">
          <div>
            <span className="font-medium text-white">Email:</span>
            <span className="ml-2 text-gray-300">{user.email}</span>
          </div>
          <div>
            <span className="font-medium text-white">User ID:</span>
            <span className="ml-2 text-gray-300">{user.id}</span>
          </div>
          <div>
            <span className="font-medium text-white">Role:</span>
            <span className="ml-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                profile.role === 'admin'
                  ? 'bg-[#e21c21]/20 text-[#e21c21] border border-[#e21c21]/50'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              }`}>
                {profile.role}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="relative">
        <label htmlFor="full_name" className="block text-sm font-medium text-white mb-1">
          Full Name
        </label>
        <div className="relative overflow-hidden rounded-md group/input">
          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-md shadow-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 transition-all"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            placeholder="Your full name"
          />
        </div>
      </div>

      <div className="relative">
        <label htmlFor="avatar_url" className="block text-sm font-medium text-white mb-1">
          Avatar URL
        </label>
        <div className="relative overflow-hidden rounded-md group/input">
          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
          <input
            type="url"
            id="avatar_url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleChange}
            className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-md shadow-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 transition-all"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>

      {error && (
        <div className="relative bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-md p-3 overflow-hidden group/error">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover/error:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="text-sm text-red-400 relative">{error}</p>
        </div>
      )}

      {success && (
        <div className="relative bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-sm border border-green-500/50 rounded-md p-3 overflow-hidden group/success">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover/success:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="text-sm text-green-400 relative">Profile updated successfully!</p>
        </div>
      )}

      <div className="flex justify-end space-x-3 relative">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="relative px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-[#e21c21]/50 font-medium text-sm transition-all shadow-lg overflow-hidden group/cancel"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">Cancel</span>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="relative px-4 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-md font-medium text-sm transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/submit disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/submit:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">{loading ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </form>
  );
}
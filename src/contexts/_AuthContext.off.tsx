"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { AuthService } from '../lib/auth';
import { supabaseClient } from '../lib/supabaseClient';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pendingEmailConfirmation: boolean;
  pendingConfirmationData: { email: string; userType: 'consumer' | 'provider' } | null;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<any>;
  resendConfirmation: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [pendingConfirmationData, setPendingConfirmationData] = useState<{ email: string; userType: 'consumer' | 'provider' } | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      try {
        const { user: currentUser } = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        logger.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const supabase = supabaseClient;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state change:', event, session?.user?.id);

        if (event === "SIGNED_IN" && session?.user) {
          logger.debug("Auth state change: SIGNED_IN", session.user.id);

          // Profile creation is handled by database trigger automatically

          // Get and set user profile
          const { user: currentUser } = await AuthService.getCurrentUser();
          setUser(currentUser);
          setPendingEmailConfirmation(false);
          setPendingConfirmationData(null);
          setLoading(false);

        } else if (event === 'SIGNED_OUT') {
          logger.debug("Auth state change: SIGNED_OUT");
          setUser(null);
          setPendingEmailConfirmation(false);
          setPendingConfirmationData(null);
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    setLoading(true);
    try {
      const result = await AuthService.signUp(email, password, userData);

      // If email confirmation is needed, set pending state
      if (result.needsConfirmation) {
        logger.debug('Setting pendingEmailConfirmation to true');
        setPendingEmailConfirmation(true);
        setPendingConfirmationData({
          email: email,
          userType: userData.userType || 'consumer'
        });
        setLoading(false); // Don't wait for auth state change
      }

      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const result = await AuthService.updateUserProfile(user.id, updates);
      if (result.error) return result;

      // Update local user state
      setUser({ ...user, ...updates });
      return result;
    } catch (error) {
      return { error };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const result = await AuthService.resendConfirmation(email);
      return result;
    } catch (error) {
      return { data: null, error };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    pendingEmailConfirmation,
    pendingConfirmationData,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resendConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
import { supabaseClient } from './supabaseClient';
import { User, AuthResult } from '../types';

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, userData: Partial<User>): Promise<AuthResult> {
    try {
      const supabase = supabaseClient;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: userData.fullName,
            user_type: userData.userType || 'consumer',
            phone_number: userData.phoneNumber,
          },
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required
        return { 
          data, 
          error: null, 
          needsConfirmation: true,
          message: 'Please check your email and click the confirmation link to activate your account.'
        };
      }

      // Profile creation is handled automatically by database trigger

      return { data, error: null, needsConfirmation: false };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error: { message: error.message || 'Sign up failed' } };
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const supabase = supabaseClient;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { data: null, error: { message: error.message || 'Sign in failed' } };
    }
  }

  // Sign out
  static async signOut(): Promise<{ error: any }> {
    try {
      const supabase = supabaseClient;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<{ user: User | null; error: any }> {
    try {
      const supabase = supabaseClient;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch user profile from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // If profile doesn't exist, the trigger should have created it
          // This indicates a data consistency issue
          console.error('Profile not found for authenticated user:', error);
          return { user: null, error };
        }

        return { user: profile, error: null };
      }

      return { user: null, error: null };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null, error };
    }
  }


  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      const supabase = supabaseClient;
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Update user profile error:', error);
      return { data: null, error };
    }
  }

  // Resend confirmation email
  static async resendConfirmation(email: string): Promise<AuthResult> {
    try {
      const supabase = supabaseClient;
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      return { data: null, error: { message: error.message || 'Failed to resend confirmation' } };
    }
  }
}

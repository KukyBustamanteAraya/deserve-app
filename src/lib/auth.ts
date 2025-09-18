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

      // If session exists (email confirmation disabled), profile should be created
      if (data.user && data.session) {
        try {
          await this.createUserProfileSafe(data.user.id, email, userData);
        } catch (profileError) {
          // Profile creation failed, but user is created - they can complete profile later
          console.warn('Profile creation failed, but user authenticated:', profileError);
        }
      }

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
        // Fetch user profile from our custom table
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // If profile doesn't exist but user is authenticated, try to create it
          if (error.code === 'PGRST116') { // No rows returned
            console.warn('User profile not found, attempting to create...');
            try {
              await this.createUserProfileSafe(user.id, user.email || '', {
                fullName: user.user_metadata?.full_name || '',
                userType: user.user_metadata?.user_type || 'consumer',
                phoneNumber: user.user_metadata?.phone_number || user.phone || null
              });
              
              // Try to fetch again
              const { data: newProfile, error: newError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
                
              if (newError) throw newError;
              return { user: newProfile, error: null };
            } catch (createError) {
              console.error('Failed to create missing profile:', createError);
              return { user: null, error: createError };
            }
          }
          throw error;
        }
        
        return { user: profile, error: null };
      }

      return { user: null, error: null };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null, error };
    }
  }

  // Safe user profile creation using database function
  static async createUserProfileSafe(userId: string, email: string, userData: Partial<User>) {
    try {
      const supabase = supabaseClient;
      const { data, error } = await supabase.rpc('create_user_profile_safe', {
        user_id: userId,
        user_email: email,
        user_full_name: userData.fullName || '',
        user_type: userData.userType || 'consumer',
        user_phone: userData.phoneNumber || null
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error || 'Profile creation failed');
      }

      return { data, error: null };
    } catch (error) {
      console.error('Safe profile creation error:', error);
      return { data: null, error };
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      const supabase = supabaseClient;
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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

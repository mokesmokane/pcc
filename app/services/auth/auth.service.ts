import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '../../lib/supabase';

// Auth state store
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) =>
      set({
        user,
        isAuthenticated: !!user,
      }),

    setSession: (session) =>
      set({
        session,
        isAuthenticated: !!session,
        user: session?.user || null,
      }),

    setLoading: (isLoading) => set({ isLoading }),

    reset: () =>
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      }),
  }))
);

export class AuthService {
  private authListener: any;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Check for existing session
    useAuthStore.getState().setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        useAuthStore.getState().setSession(session);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    } finally {
      useAuthStore.getState().setLoading(false);
    }

    // Listen for auth changes
    this.authListener = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        useAuthStore.getState().setSession(session);
      }
    );
  }

  // // Sign up with email and password
  // async signUp(email: string, password: string, username?: string) {
  //   try {
  //     // Create the user
  //     const { data, error } = await supabase.auth.signUp({
  //       email,
  //       password,
  //     });

  //     if (error) throw error;

  //     // Create profile if user was created
  //     if (data.user) {
  //       console.log('User created successfully:', data.user.id);

  //       // Try to create profile
  //       try {
  //         const { error: profileError } = await supabase
  //           .from('profiles')
  //           .insert({
  //             id: data.user.id,
  //             username: username || email.split('@')[0],
  //           });

  //         if (profileError) {
  //           console.error('Direct profile insert failed:', profileError);

  //           // Try using RPC function as fallback
  //           const { error: rpcError } = await supabase.rpc('create_profile_for_user', {
  //             user_id: data.user.id,
  //             user_username: username || email.split('@')[0]
  //           });

  //           if (rpcError) {
  //             console.error('RPC profile creation also failed:', rpcError);
  //           } else {
  //             console.log('Profile created via RPC');
  //           }
  //         } else {
  //           console.log('Profile created successfully');
  //         }
  //       } catch (e) {
  //         console.error('Profile creation error:', e);
  //       }
  //     }

  //     return data;
  //   } catch (error) {
  //     console.error('Sign up error:', error);
  //     throw error;
  //   }
  // }

  // // Sign in with email and password
  // async signIn(email: string, password: string) {
  //   try {
  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email,
  //       password,
  //     });

  //     if (error) throw error;
  //     return data;
  //   } catch (error) {
  //     console.error('Sign in error:', error);
  //     throw error;
  //   }
  // }

  // Sign in with phone
  async signInWithPhone(phone: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Phone sign in error:', error);
      throw error;
    }
  }

  // Verify OTP
  async verifyOTP(phone: string, token: string) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  // Update profile with first and last names (upsert to handle new profiles)
  async updateProfileWithNames(userId: string, firstName: string, lastName: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      console.log('Profile updated with names successfully:', { firstName, lastName });
      return data;
    } catch (error) {
      console.error('Error updating profile with names:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      useAuthStore.getState().reset();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return useAuthStore.getState().user;
  }

  // Get current session
  getSession(): Session | null {
    return useAuthStore.getState().session;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  // Check if loading
  isLoading(): boolean {
    return useAuthStore.getState().isLoading;
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Clean up
  dispose(): void {
    if (this.authListener) {
      this.authListener.data.subscription.unsubscribe();
    }
  }
}

// Singleton instance
export const authService = new AuthService();
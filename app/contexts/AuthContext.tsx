import React, { createContext, useEffect, useContext, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { authService, useAuthStore } from '../services/auth/auth.service';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // signUp: (email: string, password: string, username?: string) => Promise<void>;
  // signOut: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<any>;
  updateProfileWithNames: (userId: string, firstName: string, lastName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Subscribe to auth store
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    // Subscribe to auth state changes for navigation
    const subscription = authService.onAuthStateChange((event, session) => {
      // Handle navigation based on auth events
      if (event === 'SIGNED_IN' && session?.user) {
        // Don't navigate here - let the verify-phone screen handle navigation
        // to avoid double navigation issues
      } else if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
        // User just confirmed their email
        console.log('Email confirmed, user should sign in now');
      }
    });

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  // // Wrap service methods with error handling
  // const signUp = async (email: string, password: string, username?: string) => {
  //   await authService.signUp(email, password, username);
  // };

  // const signIn = async (email: string, password: string) => {
  //   await authService.signIn(email, password);
  // };

  const signOut = async () => {
    await authService.signOut();
  };

  const signInWithPhone = async (phone: string) => {
    await authService.signInWithPhone(phone);
  };

  const verifyOTP = async (phone: string, token: string) => {
    return await authService.verifyOTP(phone, token);
  };

  const updateProfileWithNames = async (userId: string, firstName: string, lastName: string) => {
    await authService.updateProfileWithNames(userId, firstName, lastName);
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      // signUp,
      // signIn,
      signOut,
      signInWithPhone,
      verifyOTP,
      updateProfileWithNames,
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
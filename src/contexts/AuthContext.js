'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);

        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'USER_UPDATED') {
          console.log('User updated');
        }
      }
    );

    // Refresh session every 10 minutes to prevent expiration
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          return;
        }

        if (session) {
          // Check if token is about to expire (within next 15 minutes)
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const timeUntilExpiry = expiresAt - Date.now();
          const fifteenMinutes = 15 * 60 * 1000;

          if (timeUntilExpiry < fifteenMinutes) {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('Session refresh error:', error);
              // If refresh fails with auth error, the user will be logged out by onAuthStateChange
            } else {
              console.log('Session refreshed automatically');
            }
          }
        }
      } catch (error) {
        console.error('Session refresh interval error:', error);
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => {
      subscription?.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const signUp = async (email, password, fullName) => {
    try {
      // First, create the user with autoConfirm to avoid trigger issues
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      // If signup succeeded but profile wasn't created (trigger failed), create it manually
      if (data?.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
            });

          // Ignore duplicate key errors (profile already exists from trigger)
          if (profileError && !profileError.message?.includes('duplicate') && profileError.code !== '23505') {
            console.warn('Profile creation warning:', profileError);
          }
        } catch (profileError) {
          console.warn('Could not create profile:', profileError);
          // Don't throw - user is still created
        }
      }

      console.log('Signup successful:', data);
      return data;
    } catch (error) {
      console.error('SignUp exception:', error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    router.push('/dashboard');
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push('/login');
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

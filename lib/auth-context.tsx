'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AppUser, SubscriptionPlan, mapProfileRow } from '@/lib/types';
import { isExpired } from '@/lib/format';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateUser: (patch: Partial<AppUser>) => Promise<void>;
  activateTestSubscription: (plan: SubscriptionPlan, days: number) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string): Promise<AppUser | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error || !data) return null;

    let profile = mapProfileRow(data);

    // Auto-expire membership if past expiry
    if (profile.membershipStatus === 'active' && isExpired(profile.subscriptionExpiry)) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ membership_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', uid);
      if (!updateError) {
        profile = { ...profile, membershipStatus: 'expired' };
      }
    }

    return profile;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) setUser(profile);
      }
      if (mounted) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const profile = await fetchProfile(session.user.id);
          if (mounted) setUser(profile);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Invalid email or password.' };
    return {};
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) {
      if (error.message.includes('already')) return { error: 'An account with this email already exists.' };
      return { error: 'Could not create account. Please try again.' };
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: 'Could not send reset email.' };
    return {};
  }, []);

  const updateUser = useCallback(async (patch: Partial<AppUser>) => {
    if (!user) return;
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (patch.displayName !== undefined) updateData.display_name = patch.displayName;
    if (patch.notificationsEnabled !== undefined) updateData.notifications_enabled = patch.notificationsEnabled;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
    if (!error) {
      setUser({ ...user, ...patch, updatedAt: new Date().toISOString() });
    }
  }, [user]);

  const activateTestSubscription = useCallback(async (plan: SubscriptionPlan, days: number) => {
    if (!user) return { error: 'You must be signed in.' };
    const { error } = await supabase.rpc('activate_subscription', { p_plan: plan, p_days: days });
    if (error) return { error: 'Could not activate subscription. Please try again.' };
    const profile = await fetchProfile(user.id);
    if (profile) setUser(profile);
    return {};
  }, [user, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await fetchProfile(user.id);
    if (profile) setUser(profile);
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, resetPassword, updateUser, activateTestSubscription, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

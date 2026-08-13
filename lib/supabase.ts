'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type TipRow = {
  id: string;
  match_date: string;
  kickoff_time: string;
  league: string;
  country: string;
  home_team: string;
  away_team: string;
  market: string;
  prediction: string;
  odds: number;
  confidence: 'Low' | 'Medium' | 'High';
  analysis: string;
  access_level: 'free' | 'vip';
  status: 'draft' | 'published' | 'archived';
  result: 'pending' | 'won' | 'lost' | 'void';
  final_score: string | null;
  home_score: number | null;
  away_score: number | null;
  minute: number | null;
  phase: 'upcoming' | 'live' | 'finished';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  membership_status: 'free' | 'active' | 'expired' | 'suspended';
  subscription_plan: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  subscription_start: string | null;
  subscription_expiry: string | null;
  email_verified: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  currency: string;
  status: string;
  start_date: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'tip' | 'result' | 'subscription' | 'system';
  read: boolean;
  created_at: string;
};

export type AppSettingsRow = {
  id: string;
  responsible_gambling_message: string;
  support_email: string;
  maintenance_mode: boolean;
  updated_at: string;
};

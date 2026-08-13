'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tip, AppNotification, AppSettings, mapTipRow, mapNotificationRow } from '@/lib/types';

interface DataContextValue {
  tips: Tip[];
  settings: AppSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  getFreeTips: () => Tip[];
  getVipTips: () => Tip[];
  getLiveTips: () => Tip[];
  getUpcomingTips: () => Tip[];
  getFinishedTips: () => Tip[];
  getTodayTips: () => Tip[];
  markNotificationRead: (id: string) => Promise<void>;
  refresh: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  responsibleGamblingMessage:
    'Please gamble responsibly. Betting involves risk and winnings are not guaranteed.',
  supportEmail: 'support@smartpunter.co.za',
  maintenanceMode: false,
  updatedAt: new Date().toISOString(),
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSettingsLoading(true);
      setSettingsError(null);

      try {
        const [tipsRes, settingsRes] = await Promise.all([
          supabase
            .from('tips')
            .select('*')
            .eq('status', 'published')
            .order('kickoff_time', { ascending: true }),
          supabase
            .from('app_settings')
            .select('*')
            .maybeSingle(),
        ]);

        if (!mounted) return;

        if (tipsRes.error) throw tipsRes.error;

        const mappedTips = (tipsRes.data ?? []).map(mapTipRow);
        setTips(mappedTips);

        if (settingsRes.error) {
          setSettingsError('Could not load app settings.');
          setSettings(DEFAULT_SETTINGS);
        } else if (settingsRes.data) {
          setSettings({
            responsibleGamblingMessage: settingsRes.data.responsible_gambling_message,
            supportEmail: settingsRes.data.support_email,
            maintenanceMode: settingsRes.data.maintenance_mode,
            updatedAt: settingsRes.data.updated_at,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        if (mounted) {
          setError('Could not load predictions. Please refresh the page.');
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setSettingsLoading(false);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, [refreshKey]);

  // Load notifications when user changes (handled in auth context, but we listen here too)
  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (mounted && !error && data) {
        setNotifications(data.map(mapNotificationRow));
      }
    };

    loadNotifications();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      (async () => loadNotifications())();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshKey]);

  const getFreeTips = useCallback(() => tips.filter((t) => t.accessLevel === 'free'), [tips]);
  const getVipTips = useCallback(() => tips.filter((t) => t.accessLevel === 'vip'), [tips]);
  const getLiveTips = useCallback(() => tips.filter((t) => t.phase === 'live'), [tips]);
  const getUpcomingTips = useCallback(() => tips.filter((t) => t.phase === 'upcoming'), [tips]);
  const getFinishedTips = useCallback(() => tips.filter((t) => t.phase === 'finished'), [tips]);
  const getTodayTips = useCallback(
    () => tips.filter((t) => t.matchDate === new Date().toISOString().split('T')[0]),
    [tips],
  );

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  return (
    <DataContext.Provider
      value={{
        tips,
        settings,
        settingsLoading,
        settingsError,
        notifications,
        loading,
        error,
        getFreeTips,
        getVipTips,
        getLiveTips,
        getUpcomingTips,
        getFinishedTips,
        getTodayTips,
        markNotificationRead,
        refresh,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

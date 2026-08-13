'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, ChevronRight, Radio, Calendar, Trophy, Loader2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { TipCard, TipCardSkeleton } from '@/components/tips/tip-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorMessage } from '@/components/shared/error-message';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatDateTime, isExpired } from '@/lib/format';
import { Tip } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function FreeTipsPage() {
  const { getFreeTips, loading, error } = useData();
  const { user } = useAuth();
  const freeTips = getFreeTips();
  const [tab, setTab] = useState('all');
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('sync_logs')
      .select('finished_at')
      .eq('status', 'success')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setLastSynced(data?.finished_at ?? null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isVip = !!(
    user &&
    user.membershipStatus === 'active' &&
    user.subscriptionExpiry &&
    !isExpired(user.subscriptionExpiry)
  );

  const filtered = useMemo(() => {
    if (tab === 'live') return freeTips.filter((t) => t.phase === 'live');
    if (tab === 'upcoming') return freeTips.filter((t) => t.phase === 'upcoming');
    if (tab === 'finished') return freeTips.filter((t) => t.phase === 'finished');
    return freeTips;
  }, [freeTips, tab]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tip[]>();
    for (const tip of filtered) {
      const arr = map.get(tip.matchDate) ?? [];
      arr.push(tip);
      map.set(tip.matchDate, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-success" />
        <h1 className="text-2xl font-bold">Free Tips</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Free football predictions with live, upcoming and finished match statuses.
      </p>
      {lastSynced && (
        <p className="mt-2 text-xs text-muted-foreground">Last synced: {formatDateTime(lastSynced)}</p>
      )}

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="live" className="gap-1">
            <Radio className="h-3 w-3 text-destructive" /> Live
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1">
            <Calendar className="h-3 w-3" /> Upcoming
          </TabsTrigger>
          <TabsTrigger value="finished" className="gap-1">
            <Trophy className="h-3 w-3" /> Finished
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TipCardSkeleton /><TipCardSkeleton /><TipCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No tips in this category"
              description="Check back later — new free predictions are published daily."
            />
          ) : (
            <div className="space-y-8">
              {grouped.map(([date, tips]) => (
                <div key={date}>
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{formatDate(date)}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tips.map((tip) => (
                      <TipCard key={tip.id} tip={tip} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-10 rounded-xl border border-primary/30 bg-card p-5 text-center">
        <p className="text-sm font-semibold">Want more predictions?</p>
        <p className="mt-1 text-xs text-muted-foreground">Unlock all VIP tips with detailed analysis and high-confidence selections.</p>
        <Link href="/vip" className="mt-3 inline-block">
          <Button variant="outline" className="gap-2">
            Explore VIP <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

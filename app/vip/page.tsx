'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Crown, Lock, CheckCircle2, Radio, Calendar, Trophy } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { TipCard, TipCardSkeleton } from '@/components/tips/tip-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorMessage } from '@/components/shared/error-message';
import { PlanCard } from '@/components/shared/plan-card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PLANS, Tip } from '@/lib/types';
import { formatDate, daysRemaining, isExpired } from '@/lib/format';

export default function VipPage() {
  const { getVipTips, loading, error } = useData();
  const { user } = useAuth();
  const vipTips = getVipTips();
  const [tab, setTab] = useState('all');

  const hasActiveVip = !!(
    user &&
    user.membershipStatus === 'active' &&
    user.subscriptionExpiry &&
    !isExpired(user.subscriptionExpiry)
  );

  const filtered = useMemo(() => {
    if (tab === 'live') return vipTips.filter((t) => t.phase === 'live');
    if (tab === 'upcoming') return vipTips.filter((t) => t.phase === 'upcoming');
    if (tab === 'finished') return vipTips.filter((t) => t.phase === 'finished');
    return vipTips;
  }, [vipTips, tab]);

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
        <Crown className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">VIP Predictions</h1>
      </div>

      {hasActiveVip ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <Badge className="gap-1 bg-success/15 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3" /> VIP Active
            </Badge>
            <span className="text-xs text-muted-foreground">
              {user?.subscriptionPlan} plan · {daysRemaining(user?.subscriptionExpiry ?? null)} days remaining
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">All VIP predictions are unlocked. Enjoy full access.</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Premium high-confidence predictions with full match analysis. Subscribe to unlock every VIP tip.
        </p>
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
            <EmptyState icon={Crown} title="No VIP tips in this category" description="New VIP predictions will appear here once published." />
          ) : (
            <div className="space-y-8">
              {grouped.map(([date, tips]) => (
                <div key={date}>
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{formatDate(date)}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tips.map((tip) => (
                      <TipCard key={tip.id} tip={tip} locked={!hasActiveVip} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!hasActiveVip && (
        <div className="mt-10">
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-2 text-xl font-bold">Unlock All VIP Tips</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Choose a plan that works for you. Payment does not guarantee winnings — tips are for entertainment.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

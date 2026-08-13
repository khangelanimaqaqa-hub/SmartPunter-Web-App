'use client';

import Link from 'next/link';
import { Crown, TrendingUp, BarChart3, Bell, ShieldCheck, ChevronRight, CheckCircle2, Lock, Radio, Calendar, Trophy, Loader2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TipCard, TipCardSkeleton } from '@/components/tips/tip-card';
import { PlanCard } from '@/components/shared/plan-card';
import { ErrorMessage } from '@/components/shared/error-message';
import { PLANS } from '@/lib/types';
import { isExpired } from '@/lib/format';

export default function LandingPage() {
  const { tips, settings, loading, error, getLiveTips, getUpcomingTips } = useData();
  const { user } = useAuth();

  const isVip = !!(
    user &&
    user.membershipStatus === 'active' &&
    user.subscriptionExpiry &&
    !isExpired(user.subscriptionExpiry)
  );

  const liveTips = getLiveTips().slice(0, 3);
  const upcomingTips = getUpcomingTips().slice(0, 3);
  const finishedTips = tips.filter((t) => t.phase === 'finished').slice(0, 3);

  const vipBenefits = [
    { icon: Crown, title: 'All VIP Predictions Unlocked', desc: 'Access every premium tip with full analysis' },
    { icon: TrendingUp, title: 'High-Confidence Tips', desc: 'Our top-rated predictions with confidence indicators' },
    { icon: BarChart3, title: 'Honest Results Tracking', desc: 'Full transparency on wins, losses and voids' },
    { icon: Bell, title: 'Priority Notifications', desc: 'Get notified the moment new tips go live' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            Smarter Football Predictions,<br />
            <span className="gold-text">Every Day</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            Free and VIP football predictions built for South African punters. Live match tracking, honest results, expert analysis, and a premium experience — right from your phone.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {!user && (
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Get Started Free <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/vip" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                <Crown className="h-4 w-4 text-primary" /> Join VIP
              </Button>
            </Link>
          </div>
          {!user && (
            <p className="mt-4 text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-6xl px-4 py-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {loading ? (
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TipCardSkeleton /><TipCardSkeleton /><TipCardSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* Live matches */}
          {liveTips.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 py-8">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Radio className="h-5 w-5 text-destructive animate-pulse" /> Live Now
                </h2>
                <Link href="/free-tips" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  See all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liveTips.map((tip) => (
                  <TipCard key={tip.id} tip={tip} locked={tip.accessLevel === 'vip' && !isVip} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming matches */}
          {upcomingTips.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Calendar className="h-5 w-5 text-primary" /> Upcoming Matches
                </h2>
                <Link href="/free-tips" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  See all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingTips.map((tip) => (
                  <TipCard key={tip.id} tip={tip} locked={tip.accessLevel === 'vip' && !isVip} />
                ))}
              </div>
            </section>
          )}

          {!loading && tips.length === 0 && !error && (
            <div className="mx-auto max-w-6xl px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">No predictions published yet. Check back soon!</p>
            </div>
          )}
        </>
      )}

      {/* Free vs VIP */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <h3 className="text-lg font-bold">Free Predictions</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Get daily football predictions at no cost. Free tips include league, teams, kickoff time, market, prediction and confidence level.
            </p>
            <ul className="mt-4 space-y-2">
              {['Daily published tips', 'Match winner & over/under markets', 'Confidence indicators', 'Results tracking'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/free-tips" className="mt-5 block">
              <Button variant="outline" className="w-full">View Free Tips</Button>
            </Link>
          </Card>

          <Card className="card-glow border-primary/30 p-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">VIP Predictions</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlock premium high-confidence tips with full match analysis. VIP tips are locked until you subscribe.
            </p>
            <ul className="mt-4 space-y-2">
              {['All VIP tips unlocked', 'Detailed match analysis', 'High-confidence selections', 'Priority notifications'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/vip" className="mt-5 block">
              <Button className="w-full gap-2"><Crown className="h-4 w-4" /> Explore VIP</Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Recent results preview */}
      {finishedTips.length > 0 && (
        <section className="border-y border-border bg-card/30 py-8">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Trophy className="h-5 w-5 text-primary" /> Recent Results
              </h2>
              <Link href="/results" className="flex items-center gap-1 text-sm text-primary hover:underline">
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {finishedTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} locked={tip.accessLevel === 'vip' && !isVip} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VIP benefits */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-xl font-bold md:text-2xl">VIP Benefits</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            Upgrade to VIP for the full SmartPunter experience.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {vipBenefits.map((b) => {
              const Icon = b.icon;
              return (
                <Card key={b.title} className="p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold">{b.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subscription packages */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-xl font-bold md:text-2xl">Choose Your VIP Package</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
          Flexible plans from weekly to yearly. Cancel anytime.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      {/* Responsible gambling */}
      {settings && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <Card className="border-warning/30 bg-warning/5 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-warning mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-warning">Responsible Gambling</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{settings.responsibleGamblingMessage}</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Payment does not guarantee winnings. SmartPunter provides predictions for entertainment only.
                </p>
              </div>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

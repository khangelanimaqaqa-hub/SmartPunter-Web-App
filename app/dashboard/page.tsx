'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useData } from '@/lib/data-context';
import { PLANS, getPlan, SubscriptionPlan } from '@/lib/types';
import { formatRand, formatDate, daysRemaining, isExpired } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TipCard, TipCardSkeleton } from '@/components/tips/tip-card';
import { PaymentSimulator } from '@/components/payment/payment-simulator';
import { EmptyState } from '@/components/shared/empty-state';
import { Crown, CheckCircle2, XCircle, TrendingUp, Bell, User as UserIcon, LogOut, Calendar, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, loading, signOut, updateUser, activateTestSubscription } = useAuth();
  const { getTodayTips, getFinishedTips, notifications, loading: dataLoading } = useData();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [preselectedPlan, setPreselectedPlan] = useState<SubscriptionPlan | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          icon={UserIcon}
          title="You need to sign in"
          description="Sign in to access your dashboard, tips and subscription."
          action={
            <div className="flex gap-2">
              <Link href="/sign-in"><Button size="sm">Sign In</Button></Link>
              <Link href="/register"><Button size="sm" variant="outline">Register</Button></Link>
            </div>
          }
        />
      </div>
    );
  }

  const todayTips = getTodayTips();
  const recentResults = getFinishedTips().slice(0, 6);
  const remaining = daysRemaining(user.subscriptionExpiry);
  const expired = isExpired(user.subscriptionExpiry);
  const isVip = user.membershipStatus === 'active' && !expired;
  const plan = user.subscriptionPlan ? getPlan(user.subscriptionPlan) : null;

  const handleJoinVip = (planId: SubscriptionPlan) => {
    setPreselectedPlan(planId);
    setPaymentOpen(true);
  };

  const handleNotificationToggle = async (checked: boolean) => {
    await updateUser({ notificationsEnabled: checked });
    toast.success(checked ? 'Notifications enabled' : 'Notifications disabled');
  };

  const completed = getFinishedTips();
  const won = completed.filter((t) => t.result === 'won').length;
  const lost = completed.filter((t) => t.result === 'lost').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.displayName.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome to your SmartPunter dashboard.</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>

      {/* Admin link */}
      {user.role === 'admin' && (
        <Link href="/admin" className="mt-3 block">
          <Card className="flex items-center gap-3 border-primary/30 bg-primary/5 p-3">
            <Crown className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Admin Dashboard</span>
            <span className="ml-auto text-xs text-muted-foreground">Manage tips &rarr;</span>
          </Card>
        </Link>
      )}

      {/* Membership card */}
      <Card className="mt-4 overflow-hidden">
        <div className={`p-5 ${isVip ? 'card-glow' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isVip ? <Crown className="h-5 w-5 text-primary" /> : <UserIcon className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-semibold">Current Membership</span>
            </div>
            <Badge className={isVip ? 'gap-1 bg-primary/15 text-primary border-primary/30' : 'gap-1 bg-muted text-muted-foreground border-border'}>
              {isVip ? <><Crown className="h-3 w-3" /> VIP Active</> : 'Free Member'}
            </Badge>
          </div>

          {isVip && plan ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-semibold">{plan.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Started</p>
                <p className="font-semibold">{formatDate(user.subscriptionStart!)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expires</p>
                <p className="font-semibold">{formatDate(user.subscriptionExpiry!)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p className={`font-bold ${remaining <= 3 ? 'text-destructive' : 'text-primary'}`}>{remaining}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">You&apos;re on the Free plan. Upgrade to VIP to unlock all premium predictions.</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {isVip ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleJoinVip(user.subscriptionPlan ?? 'monthly')}>
                <Calendar className="h-4 w-4" /> Renew Subscription
              </Button>
            ) : (
              <Button size="sm" className="gap-2" onClick={() => handleJoinVip('monthly')}>
                <Crown className="h-4 w-4" /> Join VIP
              </Button>
            )}
            <Link href="/pricing">
              <Button variant="ghost" size="sm">View all plans</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-success" />
          <p className="mt-1 text-lg font-bold">{won}</p>
          <p className="text-[10px] text-muted-foreground">Wins</p>
        </Card>
        <Card className="p-3 text-center">
          <XCircle className="mx-auto h-4 w-4 text-destructive" />
          <p className="mt-1 text-lg font-bold">{lost}</p>
          <p className="text-[10px] text-muted-foreground">Losses</p>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold">{completed.length}</p>
          <p className="text-[10px] text-muted-foreground">Settled</p>
        </Card>
      </div>

      {/* Today's tips */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Today&apos;s Available Tips</h2>
          <Link href="/free-tips" className="text-sm text-primary hover:underline">See all</Link>
        </div>
        {dataLoading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TipCardSkeleton /><TipCardSkeleton /><TipCardSkeleton />
          </div>
        ) : todayTips.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={TrendingUp} title="No tips today" description="New tips will appear here once published." />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todayTips.map((tip) => (
              <TipCard key={tip.id} tip={tip} locked={tip.accessLevel === 'vip' && !isVip} />
            ))}
          </div>
        )}
      </section>

      {/* Recent results */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent Results</h2>
          <Link href="/results" className="text-sm text-primary hover:underline">See all</Link>
        </div>
        {dataLoading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TipCardSkeleton /><TipCardSkeleton /><TipCardSkeleton />
          </div>
        ) : recentResults.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={CheckCircle2} title="No results yet" description="Completed predictions will appear here." />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentResults.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        )}
      </section>

      {/* Notifications + Account settings */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Notification Preferences</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <Label htmlFor="notif" className="text-sm">Push notifications</Label>
              <p className="text-xs text-muted-foreground">Get notified about new tips and results.</p>
            </div>
            <Switch id="notif" checked={user.notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent notifications</p>
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="rounded-lg bg-accent/50 p-2.5">
                  <p className="text-xs font-medium">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Account Settings</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><UserIcon className="h-3.5 w-3.5" /> Name</span>
              <span className="font-medium">{user.displayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Email verified</span>
              <span className={user.emailVerified ? 'text-success' : 'text-warning'}>
                {user.emailVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Joined</span>
              <span className="font-medium">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Upgrade CTA for free users */}
      {!isVip && (
        <Card className="mt-4 card-glow border-primary/30 p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <Crown className="h-8 w-8 text-primary" />
            <div>
              <h3 className="text-base font-bold">Upgrade to VIP Today</h3>
              <p className="mt-1 text-xs text-muted-foreground">Unlock all premium predictions and match analysis.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {PLANS.map((p) => (
                <Button key={p.id} size="sm" variant={p.popular ? 'default' : 'outline'} onClick={() => handleJoinVip(p.id)} className="gap-1">
                  {p.name} · {formatRand(p.price)}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      <PaymentSimulator open={paymentOpen} onOpenChange={setPaymentOpen} preselectedPlan={preselectedPlan} />
    </div>
  );
}

'use client';

import { ShieldCheck, AlertTriangle, CreditCard } from 'lucide-react';
import { PLANS } from '@/lib/types';
import { formatRand } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PlanCard } from '@/components/shared/plan-card';
import { useData } from '@/lib/data-context';

export default function PricingPage() {
  const { settings } = useData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold md:text-3xl">VIP Subscription Packages</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Choose the plan that suits you. All plans unlock every VIP prediction for the duration of your subscription.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-center text-xs text-muted-foreground">
        <CreditCard className="h-4 w-4 text-primary" />
        <span><span className="font-semibold text-primary">Test Mode:</span> No real payments are processed. Subscriptions are simulated for demonstration.</span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* What's included */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">What&apos;s Included in VIP?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'All VIP predictions unlocked',
            'Detailed match analysis for every tip',
            'Confidence level indicators',
            'Full results tracking and performance summary',
            'Priority push notifications for new tips',
            'Early access to selected predictions',
          ].map((f) => (
            <Card key={f} className="flex items-center gap-2 p-4">
              <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* No guarantee notice */}
      {settings && (
        <Card className="mt-8 border-warning/30 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-warning">No Winnings Guarantee</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Paying for a VIP subscription does not guarantee any winnings. Football outcomes are unpredictable. SmartPunter provides predictions for entertainment purposes only. Please gamble responsibly.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{settings.responsibleGamblingMessage}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Price table */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Price Comparison</h2>
        <Card className="mt-4 overflow-hidden">
          <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-xs font-semibold text-muted-foreground">
            <span>Plan</span>
            <span className="text-right">Price</span>
            <span className="text-right">Duration</span>
            <span className="text-right">Per Day</span>
          </div>
          {PLANS.map((plan) => (
            <div key={plan.id} className="grid grid-cols-4 gap-2 border-b border-border/50 p-3 text-sm last:border-0">
              <span className="font-medium">{plan.name}</span>
              <span className="text-right">{formatRand(plan.price)}</span>
              <span className="text-right text-muted-foreground">{plan.durationDays} days</span>
              <span className="text-right text-primary font-semibold">{formatRand(plan.price / plan.durationDays)}</span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

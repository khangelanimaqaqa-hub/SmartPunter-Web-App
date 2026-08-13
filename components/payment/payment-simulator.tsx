'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, Loader2, CheckCircle2, Crown } from 'lucide-react';
import { SubscriptionPlan, PLANS, getPlan } from '@/lib/types';
import { formatRand, addDays } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPlan: SubscriptionPlan | null;
}

export function PaymentSimulator({ open, onOpenChange, preselectedPlan }: PaymentSimulatorProps) {
  const { activateTestSubscription } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(preselectedPlan ?? 'monthly');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (preselectedPlan) setSelectedPlan(preselectedPlan);
  }, [preselectedPlan]);

  useEffect(() => {
    if (!open) {
      setProcessing(false);
      setSuccess(false);
    }
  }, [open]);

  if (!open) return null;

  const plan = getPlan(selectedPlan);

  const handlePay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const result = await activateTestSubscription(selectedPlan, plan.durationDays);
    setProcessing(false);
    if (result.error) {
      setSuccess(false);
    } else {
      setSuccess(true);
      setTimeout(() => onOpenChange(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <h2 className="mt-3 text-lg font-bold">Subscription Activated!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your {plan.name} is now active for {plan.durationDays} days.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Subscribe to VIP</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Test mode — no real payment is processed.</p>

            {/* Plan selection */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    selectedPlan === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                  )}
                >
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRand(p.price)}</p>
                  <p className="text-[10px] text-muted-foreground">{p.durationDays} days</p>
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 rounded-lg bg-accent/50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{plan.name}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{plan.durationDays} days</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">{new Date(addDays(plan.durationDays)).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 border-t border-border pt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">{formatRand(plan.price)}</span>
              </div>
            </div>

            <Button className="mt-4 w-full gap-2" onClick={handlePay} disabled={processing}>
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pay {formatRand(plan.price)}</>
              )}
            </Button>

            <Badge variant="outline" className="mt-3 w-full justify-center border-warning/30 text-warning">
              Test Mode — No real payment
            </Badge>
          </>
        )}
      </Card>
    </div>
  );
}

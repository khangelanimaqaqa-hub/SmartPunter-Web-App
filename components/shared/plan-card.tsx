'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { PlanInfo } from '@/lib/types';
import { formatRand } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PlanCard({ plan }: { plan: PlanInfo }) {
  return (
    <Card className={cn('flex flex-col p-5', plan.popular && 'card-glow border-primary/30')}>
      {plan.popular && (
        <Badge className="mb-2 w-fit gap-1 bg-primary/15 text-primary border-primary/30">
          Most Popular
        </Badge>
      )}
      <h3 className="text-lg font-bold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
      <p className="mt-3 text-3xl font-extrabold">
        {formatRand(plan.price)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">/ {plan.durationDays} days</span>
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-success" /> {f}
          </li>
        ))}
      </ul>
      <Link href="/dashboard" className="mt-5">
        <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
          Choose {plan.name}
        </Button>
      </Link>
    </Card>
  );
}

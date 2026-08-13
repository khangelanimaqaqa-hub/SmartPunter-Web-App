'use client';

import { Lock, Radio, Calendar, Trophy, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Tip } from '@/lib/types';
import { formatKickoff, formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TipCardProps {
  tip: Tip;
  locked?: boolean;
}

const confidenceStyles: Record<string, string> = {
  Low: 'bg-muted text-muted-foreground',
  Medium: 'bg-warning/15 text-warning border-warning/30',
  High: 'bg-success/15 text-success border-success/30',
};

const resultStyles: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  won: { icon: CheckCircle2, className: 'text-success', label: 'Won' },
  lost: { icon: XCircle, className: 'text-destructive', label: 'Lost' },
  void: { icon: MinusCircle, className: 'text-warning', label: 'Void' },
};

export function TipCard({ tip, locked = false }: TipCardProps) {
  const phaseIcon = {
    live: Radio,
    upcoming: Calendar,
    finished: Trophy,
  }[tip.phase];
  const PhaseIcon = phaseIcon;

  return (
    <Card className="flex flex-col overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PhaseIcon className={cn('h-3.5 w-3.5', tip.phase === 'live' && 'text-destructive animate-pulse')} />
          <span>{tip.league}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {tip.accessLevel === 'vip' && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              {locked ? <Lock className="h-3 w-3" /> : null} VIP
            </Badge>
          )}
          <Badge variant="outline" className={cn('border-transparent', confidenceStyles[tip.confidence])}>
            {tip.confidence}
          </Badge>
        </div>
      </div>

      {/* Teams */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-center flex-1">
          <p className="text-sm font-bold leading-tight">{tip.homeTeam}</p>
        </div>
        <div className="text-xs text-muted-foreground px-1">
          {tip.phase === 'live' && tip.minute !== null ? (
            <span className="font-bold text-destructive">{tip.minute}&apos;</span>
          ) : tip.phase === 'finished' && tip.finalScore ? (
            <span className="font-bold">{tip.finalScore}</span>
          ) : (
            <span>vs</span>
          )}
        </div>
        <div className="text-center flex-1">
          <p className="text-sm font-bold leading-tight">{tip.awayTeam}</p>
        </div>
      </div>

      {/* Live score */}
      {tip.phase === 'live' && tip.homeScore !== null && tip.awayScore !== null && (
        <p className="mt-1 text-center text-lg font-bold text-destructive">
          {tip.homeScore} - {tip.awayScore}
        </p>
      )}

      {/* Kickoff time */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {formatKickoff(tip.kickoffTime)} · {formatDate(tip.matchDate)}
      </p>

      {/* Prediction */}
      <div className="mt-3 rounded-lg bg-accent/50 p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tip.market}</p>
        {locked ? (
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Locked — subscribe to view
          </div>
        ) : (
          <p className="mt-0.5 text-sm font-bold">{tip.prediction}</p>
        )}
      </div>

      {/* Odds + result */}
      <div className="mt-3 flex items-center justify-between">
        {!locked && (
          <span className="text-xs text-muted-foreground">
            Odds: <span className="font-semibold text-foreground">{tip.odds.toFixed(2)}</span>
          </span>
        )}
        {tip.result !== 'pending' && resultStyles[tip.result] && (() => {
          const r = resultStyles[tip.result];
          const Icon = r.icon;
          return (
            <Badge variant="outline" className={cn('gap-1 border-transparent', r.className)}>
              <Icon className="h-3 w-3" /> {r.label}
            </Badge>
          );
        })()}
      </div>

      {/* Analysis (only for unlocked VIP or free) */}
      {!locked && tip.analysis && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{tip.analysis}</p>
      )}
    </Card>
  );
}

export function TipCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 flex justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 h-8 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-12 animate-pulse rounded bg-muted" />
    </Card>
  );
}

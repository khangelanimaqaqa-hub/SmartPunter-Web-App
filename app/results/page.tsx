'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, XCircle, MinusCircle, TrendingUp, Trophy, Loader2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { TipCard, TipCardSkeleton } from '@/components/tips/tip-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorMessage } from '@/components/shared/error-message';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tip } from '@/lib/types';
import { formatDate } from '@/lib/format';

export default function ResultsPage() {
  const { getFinishedTips, tips, loading, error } = useData();
  const finished = getFinishedTips();

  const [dateFilter, setDateFilter] = useState<string>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');

  const leagues = useMemo(() => Array.from(new Set(tips.map((t) => t.league))).sort(), [tips]);
  const dates = useMemo(() => Array.from(new Set(finished.map((t) => t.matchDate))).sort((a, b) => b.localeCompare(a)), [finished]);

  const filtered = useMemo(() => {
    return finished.filter((tip) => {
      if (dateFilter !== 'all' && tip.matchDate !== dateFilter) return false;
      if (leagueFilter !== 'all' && tip.league !== leagueFilter) return false;
      if (resultFilter !== 'all' && tip.result !== resultFilter) return false;
      return true;
    });
  }, [finished, dateFilter, leagueFilter, resultFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tip[]>();
    for (const tip of filtered) {
      const arr = map.get(tip.matchDate) ?? [];
      arr.push(tip);
      map.set(tip.matchDate, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const stats = useMemo(() => {
    const won = finished.filter((t) => t.result === 'won').length;
    const lost = finished.filter((t) => t.result === 'lost').length;
    const void_ = finished.filter((t) => t.result === 'void').length;
    const total = finished.length;
    const winRate = total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0;
    return { won, lost, void: void_, total, winRate };
  }, [finished]);

  const statCards = [
    { label: 'Total Settled', value: stats.total, icon: BarChart3, color: 'text-foreground' },
    { label: 'Won', value: stats.won, icon: CheckCircle2, color: 'text-success' },
    { label: 'Lost', value: stats.lost, icon: XCircle, color: 'text-destructive' },
    { label: 'Void', value: stats.void, icon: MinusCircle, color: 'text-warning' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Results</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Honest, transparent tracking of every completed prediction.
      </p>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {loading ? (
        <div className="mt-4 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Performance summary */}
          {finished.length > 0 && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statCards.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Card key={s.label} className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <Icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </Card>
                  );
                })}
              </div>

              <Card className="mt-3 flex items-center gap-3 p-4">
                <Trophy className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Win Rate (excluding voids)</p>
                  <p className="text-lg font-bold">{stats.winRate}%</p>
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </Card>

              {/* Filters */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger><SelectValue placeholder="All dates" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    {dates.map((d) => (
                      <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                  <SelectTrigger><SelectValue placeholder="All leagues" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leagues</SelectItem>
                    {leagues.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={resultFilter} onValueChange={setResultFilter}>
                  <SelectTrigger><SelectValue placeholder="All results" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All results</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={BarChart3} title="No results found" description="Try adjusting your filters to see more results." />
            </div>
          ) : (
            <div className="mt-6 space-y-8">
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
        </>
      )}
    </div>
  );
}

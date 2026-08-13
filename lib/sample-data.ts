import { Tip, AppUser, AppNotification, AppSettings, MatchPhase } from './types';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const dayOffset = (days: number, hour = 15, min = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d;
};
const dateOnly = (d: Date) => d.toISOString().split('T')[0];

const TEAMS = [
  ['Cape Town United', 'Jozi City'],
  ['Durban Rovers', 'Pretoria Athletic'],
  ['Soweto Stars', 'Bloemfontein FC'],
  ['Port Elizabeth Town', 'Polokwane Rangers'],
  ['East London Albion', 'Kimberley Diamonds'],
  ['Mbombela Lions', 'Nelspruit Town'],
];

const LEAGUES = [
  { league: 'Premier Soccer League', country: 'South Africa' },
  { league: 'National First Division', country: 'South Africa' },
  { league: 'Coastal League Cup', country: 'South Africa' },
  { league: 'Inland Challenge Cup', country: 'South Africa' },
];

const MARKETS = ['Match Winner', 'Over/Under 2.5', 'Both Teams To Score', 'Double Chance', 'Handicap'];
const PREDICTIONS: Record<string, string[]> = {
  'Match Winner': ['Home Win', 'Away Win', 'Draw'],
  'Over/Under 2.5': ['Over 2.5 Goals', 'Under 2.5 Goals'],
  'Both Teams To Score': ['Yes', 'No'],
  'Double Chance': ['Home or Draw', 'Away or Draw', 'Home or Away'],
  Handicap: ['Home -1', 'Away +1'],
};
const CONFIDENCES: Tip['confidence'][] = ['Low', 'Medium', 'High'];

function computePhase(kickoff: Date, isFinished: boolean): { phase: MatchPhase; minute: number | null } {
  if (isFinished) return { phase: 'finished', minute: null };
  const elapsed = (now.getTime() - kickoff.getTime()) / 60000;
  if (elapsed < 0) return { phase: 'upcoming', minute: null };
  if (elapsed < 105) return { phase: 'live', minute: Math.min(90, Math.floor(elapsed)) };
  return { phase: 'finished', minute: null };
}

function buildTip(
  i: number,
  kickoff: Date,
  accessLevel: 'free' | 'vip',
  result: Tip['result'],
): Tip {
  const match = TEAMS[i % TEAMS.length];
  const leagueInfo = LEAGUES[i % LEAGUES.length];
  const market = MARKETS[i % MARKETS.length];
  const preds = PREDICTIONS[market];
  const isFinished = result !== 'pending';
  const { phase, minute } = computePhase(kickoff, isFinished);

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let finalScore: string | null = null;

  if (phase === 'live') {
    homeScore = i % 3;
    awayScore = (i + 1) % 2;
    finalScore = null;
  } else if (isFinished) {
    homeScore = Math.floor(Math.random() * 4);
    awayScore = Math.floor(Math.random() * 4);
    finalScore = `${homeScore} - ${awayScore}`;
  }

  return {
    id: `tip-${i}`,
    matchDate: dateOnly(kickoff),
    kickoffTime: iso(kickoff),
    league: leagueInfo.league,
    country: leagueInfo.country,
    homeTeam: match[0],
    awayTeam: match[1],
    market,
    prediction: preds[i % preds.length],
    odds: +(1.4 + (i % 5) * 0.35).toFixed(2),
    confidence: CONFIDENCES[i % 3],
    analysis: `Our model weighs recent form, head-to-head records and home advantage. ${match[0]} have shown strong defensive structure at home, while ${match[1]} have struggled on the road. This is demonstration data only.`,
    accessLevel,
    status: 'published',
    result,
    finalScore,
    homeScore,
    awayScore,
    minute,
    phase,
    createdBy: 'admin',
    createdAt: iso(dayOffset(-3)),
    updatedAt: iso(dayOffset(-1)),
    publishedAt: iso(dayOffset(-1)),
  };
}

function buildTips(): Tip[] {
  const tips: Tip[] = [];
  let i = 0;

  // LIVE matches — currently in play (kickoff was 20-80 min ago)
  for (let j = 0; j < 3; j++) {
    const kickoff = dayOffset(0, 15, j * 25);
    tips.push(buildTip(i++, kickoff, j < 2 ? 'free' : 'vip', 'pending'));
  }

  // UPCOMING today — kickoff later today
  for (let j = 0; j < 4; j++) {
    const kickoff = dayOffset(0, 18 + j, 30);
    tips.push(buildTip(i++, kickoff, j < 2 ? 'free' : 'vip', 'pending'));
  }

  // UPCOMING tomorrow
  for (let j = 0; j < 4; j++) {
    const kickoff = dayOffset(1, 15 + j, 0);
    tips.push(buildTip(i++, kickoff, j < 2 ? 'free' : 'vip', 'pending'));
  }

  // UPCOMING day after tomorrow
  for (let j = 0; j < 2; j++) {
    const kickoff = dayOffset(2, 16 + j, 0);
    tips.push(buildTip(i++, kickoff, j < 1 ? 'free' : 'vip', 'pending'));
  }

  // FINISHED yesterday — mix of results
  const yResults: Tip['result'][] = ['won', 'lost', 'won', 'void', 'won', 'lost'];
  for (let j = 0; j < 6; j++) {
    const kickoff = dayOffset(-1, 14 + j, 0);
    tips.push(buildTip(i++, kickoff, j < 3 ? 'free' : 'vip', yResults[j]));
  }

  // FINISHED 3 days ago
  const d3Results: Tip['result'][] = ['won', 'lost', 'won', 'won', 'lost', 'won'];
  for (let j = 0; j < 6; j++) {
    const kickoff = dayOffset(-3, 14 + j, 0);
    tips.push(buildTip(i++, kickoff, j < 3 ? 'free' : 'vip', d3Results[j]));
  }

  // FINISHED 5 days ago
  const d5Results: Tip['result'][] = ['won', 'won', 'lost', 'won', 'lost'];
  for (let j = 0; j < 5; j++) {
    const kickoff = dayOffset(-5, 15 + j, 0);
    tips.push(buildTip(i++, kickoff, j < 3 ? 'free' : 'vip', d5Results[j]));
  }

  return tips;
}

export const SAMPLE_TIPS: Tip[] = buildTips();

export const SAMPLE_SETTINGS: AppSettings = {
  responsibleGamblingMessage:
    'Gambling can be addictive. SmartPunter provides predictions for entertainment purposes only — no outcome is ever guaranteed. Please play responsibly. Only bet what you can afford to lose. National Responsible Gambling Programme Helpline: 0800 006 008. No persons under 18.',
  supportEmail: 'support@smartpunter.demo',
  maintenanceMode: false,
  updatedAt: iso(now),
};

export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    userId: '',
    title: 'New VIP tips available',
    message: '4 new VIP predictions for today have been published.',
    type: 'tip',
    read: false,
    createdAt: iso(dayOffset(0)),
  },
  {
    id: 'n2',
    userId: '',
    title: 'Yesterday’s results are in',
    message: '4 of 6 predictions won yesterday. Great day!',
    type: 'result',
    read: false,
    createdAt: iso(dayOffset(-1)),
  },
  {
    id: 'n3',
    userId: '',
    title: 'Welcome to SmartPunter',
    message: 'Thanks for joining. Explore today’s free tips to get started.',
    type: 'system',
    read: true,
    createdAt: iso(dayOffset(-2)),
  },
];

export const DEMO_USER: AppUser = {
  id: 'demo-user',
  displayName: 'Demo Punter',
  email: 'demo@smartpunter.demo',
  role: 'user',
  membershipStatus: 'free',
  subscriptionPlan: null,
  subscriptionStart: null,
  subscriptionExpiry: null,
  createdAt: iso(dayOffset(-7)),
  updatedAt: iso(now),
  emailVerified: false,
  notificationsEnabled: true,
};

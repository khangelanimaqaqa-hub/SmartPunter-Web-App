export type Role = 'user' | 'admin';
export type MembershipStatus = 'free' | 'active' | 'expired' | 'suspended';
export type SubscriptionPlan = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AccessLevel = 'free' | 'vip';
export type TipStatus = 'draft' | 'published' | 'archived';
export type TipResult = 'pending' | 'won' | 'lost' | 'void';
export type MatchPhase = 'upcoming' | 'live' | 'finished';
export type Confidence = 'Low' | 'Medium' | 'High';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  membershipStatus: MembershipStatus;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionStart: string | null;
  subscriptionExpiry: string | null;
  emailVerified: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tip {
  id: string;
  matchDate: string;
  kickoffTime: string;
  league: string;
  country: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  prediction: string;
  odds: number;
  confidence: Confidence;
  analysis: string;
  accessLevel: AccessLevel;
  status: TipStatus;
  result: TipResult;
  finalScore: string | null;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  phase: MatchPhase;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'tip' | 'result' | 'subscription' | 'system';
  read: boolean;
  createdAt: string;
}

export interface AppSettings {
  responsibleGamblingMessage: string;
  supportEmail: string;
  maintenanceMode: boolean;
  updatedAt: string;
}

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number;
  durationDays: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: 'weekly',
    name: 'Weekly VIP',
    price: 29.99,
    durationDays: 7,
    description: '7 days of full VIP predictions access',
    features: ['All VIP tips unlocked', 'Daily match analysis', 'Confidence indicators', '7-day access'],
  },
  {
    id: 'monthly',
    name: 'Monthly VIP',
    price: 199,
    durationDays: 30,
    description: '30 days of VIP access — best value for regular punters',
    features: ['All VIP tips unlocked', 'Daily match analysis', 'Confidence indicators', '30-day access', 'Priority notifications'],
    popular: true,
  },
  {
    id: 'quarterly',
    name: 'Quarterly VIP',
    price: 399,
    durationDays: 90,
    description: '3 months of VIP access at a discounted rate',
    features: ['All VIP tips unlocked', 'Daily match analysis', 'Confidence indicators', '90-day access', 'Priority notifications'],
  },
  {
    id: 'yearly',
    name: 'Yearly VIP',
    price: 999,
    durationDays: 365,
    description: '12 months of VIP access — the best long-term saving',
    features: ['All VIP tips unlocked', 'Daily match analysis', 'Confidence indicators', '365-day access', 'Priority notifications', 'Early tip previews'],
  },
];

export const getPlan = (plan: SubscriptionPlan): PlanInfo =>
  PLANS.find((p) => p.id === plan) ?? PLANS[0];

export function mapTipRow(row: any): Tip {
  return {
    id: row.id,
    matchDate: row.match_date,
    kickoffTime: row.kickoff_time,
    league: row.league,
    country: row.country,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    market: row.market,
    prediction: row.prediction,
    odds: Number(row.odds),
    confidence: row.confidence,
    analysis: row.analysis ?? '',
    accessLevel: row.access_level,
    status: row.status,
    result: row.result,
    finalScore: row.final_score,
    homeScore: row.home_score,
    awayScore: row.away_score,
    minute: row.minute,
    phase: row.phase,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export function mapProfileRow(row: any): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    membershipStatus: row.membership_status,
    subscriptionPlan: row.subscription_plan,
    subscriptionStart: row.subscription_start,
    subscriptionExpiry: row.subscription_expiry,
    emailVerified: row.email_verified,
    notificationsEnabled: row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotificationRow(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.read,
    createdAt: row.created_at,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Users, Crown, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { SubscriptionPlan } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  membership_status: string;
  subscription_plan: string | null;
  subscription_start: string | null;
  subscription_expiry: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.rpc('admin_list_profiles');
    if (error) {
      setError('Could not load users.');
    } else if (data) {
      setUsers(data as AdminUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadUsers();
    } else if (!authLoading && user && user.role !== 'admin') {
      setError('You do not have admin access.');
      setLoading(false);
    } else if (!authLoading && !user) {
      setError('Please sign in.');
      setLoading(false);
    }
  }, [authLoading, user, loadUsers]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <EmptyState icon={Shield} title="Sign in required" description="You need to be signed in as an admin." />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <EmptyState icon={Shield} title="Access denied" description="You do not have admin access." />
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Manage user memberships and subscriptions.</p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Users className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-1 text-lg font-bold">{users.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Users</p>
        </Card>
        <Card className="p-3 text-center">
          <Crown className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold">{users.filter((u) => u.membership_status === 'active').length}</p>
          <p className="text-[10px] text-muted-foreground">VIP Active</p>
        </Card>
        <Card className="p-3 text-center">
          <Users className="mx-auto h-4 w-4 text-success" />
          <p className="mt-1 text-lg font-bold">{users.filter((u) => u.membership_status === 'free').length}</p>
          <p className="text-[10px] text-muted-foreground">Free Users</p>
        </Card>
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* User list */}
      {loading ? (
        <div className="mt-4 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="mt-4"><EmptyState icon={Shield} title="Error" description={error} /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-4"><EmptyState icon={Users} title="No users found" /></div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((u) => (
            <Card key={u.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-[10px] text-muted-foreground">Joined {formatDate(u.created_at)}</p>
              </div>
              <Badge
                variant="outline"
                className={
                  u.membership_status === 'active'
                    ? 'border-success/30 text-success'
                    : u.membership_status === 'suspended'
                    ? 'border-destructive/30 text-destructive'
                    : 'border-border text-muted-foreground'
                }
              >
                {u.membership_status}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                Manage
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditUserModal user={editing} onClose={() => setEditing(null)} onUpdated={loadUsers} />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onUpdated }: { user: AdminUser; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState(user.membership_status);
  const [plan, setPlan] = useState<SubscriptionPlan>((user.subscription_plan as SubscriptionPlan) ?? 'monthly');
  const [days, setDays] = useState('30');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('admin_set_membership', {
      p_user_id: user.id,
      p_status: status,
      p_plan: status === 'active' ? plan : null,
      p_days: status === 'active' ? parseInt(days) : null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not update user.');
    } else {
      toast.success('User updated successfully.');
      onUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h2 className="text-lg font-bold">Manage {user.display_name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Membership Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="active">Active (VIP)</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === 'active' && (
            <>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as SubscriptionPlan)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="days">Duration (days)</Label>
                <Input id="days" type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

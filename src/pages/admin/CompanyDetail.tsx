import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building2, Users, ClipboardCheck, Briefcase, Calendar, Package, UserCog } from "lucide-react";
import { format } from "date-fns";
import { MODULE_REGISTRY, CATEGORY_LABELS } from "@/config/moduleRegistry";
import { toast } from "sonner";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [editingMaxUsers, setEditingMaxUsers] = useState(false);
  const [maxUsersInput, setMaxUsersInput] = useState("");

  const { data: company, isLoading } = useQuery({
    queryKey: ['admin-company-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, industries(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-company-stats', id],
    queryFn: async () => {
      const [
        { count: userCount },
        { count: auditCount },
        { count: scoutJobCount },
      ] = await Promise.all([
        supabase.from('company_users').select('*', { count: 'exact', head: true }).eq('company_id', id!),
        supabase.from('location_audits').select('*', { count: 'exact', head: true }).eq('company_id', id!),
        (supabase as any).from('scout_jobs').select('*', { count: 'exact', head: true }).eq('company_id', id!),
      ]);
      return { userCount: userCount || 0, auditCount: auditCount || 0, scoutJobCount: scoutJobCount || 0 };
    },
    enabled: !!id,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['admin-company-modules', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_modules')
        .select('module_name, is_active')
        .eq('company_id', id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-company-activity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('id, status, audit_date, location')
        .eq('company_id', id!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const isModuleActive = (code: string) =>
    modules.some(m => m.module_name === code && m.is_active);

  const handleToggleModule = async (code: string, displayName: string) => {
    if (!id) return;
    setTogglingModule(code);
    const newState = !isModuleActive(code);

    try {
      const { error } = await supabase
        .from('company_modules')
        .upsert(
          { company_id: id, module_name: code, is_active: newState },
          { onConflict: 'company_id,module_name' }
        );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-company-modules', id] });
      toast.success(`${displayName} ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error('Failed to update module');
    } finally {
      setTogglingModule(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!company) {
    return <div className="p-6 text-center text-muted-foreground">Company not found</div>;
  }

  // Group modules by category
  const grouped = MODULE_REGISTRY.reduce<Record<string, typeof MODULE_REGISTRY>>((acc, mod) => {
    (acc[mod.category] ??= []).push(mod);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/platform')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            {company.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{company.status}</Badge>
            <Badge variant="outline">{company.subscription_tier}</Badge>
            {(company as any).industries?.name && (
              <Badge variant="secondary">{(company as any).industries.name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Users', value: stats?.userCount, icon: Users },
          { label: 'Audits', value: stats?.auditCount, icon: ClipboardCheck },
          { label: 'Scout Jobs', value: stats?.scoutJobCount, icon: Briefcase },
          { label: 'Created', value: format(new Date(company.created_at), 'MMM d, yyyy'), icon: Calendar },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Limit Management */}
      <UserLimitCard
        companyId={id!}
        maxUsers={(company as any).max_users}
        currentUsers={stats?.userCount ?? 0}
        editingMaxUsers={editingMaxUsers}
        setEditingMaxUsers={setEditingMaxUsers}
        maxUsersInput={maxUsersInput}
        setMaxUsersInput={setMaxUsersInput}
        queryClient={queryClient}
      />

      {/* Module Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Module Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['core', 'operations', 'communication', 'analytics'] as const).map((cat) => {
            const catModules = grouped[cat];
            if (!catModules?.length) return null;
            return (
              <div key={cat} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className="grid gap-2">
                  {catModules.map((mod) => {
                    const Icon = mod.icon;
                    const active = isModuleActive(mod.code);
                    return (
                      <div
                        key={mod.code}
                        className={`flex items-center justify-between p-3 border rounded-lg ${active ? 'border-primary/40 bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${mod.color}`} />
                          <span className="text-sm font-medium">{mod.displayName}</span>
                          {active && (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <Switch
                          checked={active}
                          onCheckedChange={() => handleToggleModule(mod.code, mod.displayName)}
                          disabled={togglingModule === mod.code}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity?.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{a.location || 'Unknown location'}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.audit_date ? format(new Date(a.audit_date), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Extracted User Limit card for CompanyDetail */
function UserLimitCard({
  companyId,
  maxUsers,
  currentUsers,
  editingMaxUsers,
  setEditingMaxUsers,
  maxUsersInput,
  setMaxUsersInput,
  queryClient,
}: {
  companyId: string;
  maxUsers: number | null;
  currentUsers: number;
  editingMaxUsers: boolean;
  setEditingMaxUsers: (v: boolean) => void;
  maxUsersInput: string;
  setMaxUsersInput: (v: string) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const updateMaxUsers = useMutation({
    mutationFn: async (value: number | null) => {
      const { error } = await supabase
        .from('companies')
        .update({ max_users: value } as any)
        .eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-detail', companyId] });
      toast.success('User limit updated');
      setEditingMaxUsers(false);
    },
    onError: () => toast.error('Failed to update user limit'),
  });

  const handleSave = () => {
    const trimmed = maxUsersInput.trim();
    if (trimmed === '' || trimmed === '0') {
      updateMaxUsers.mutate(null);
    } else {
      const num = parseInt(trimmed, 10);
      if (isNaN(num) || num < 1) {
        toast.error('Enter a valid number or leave empty for unlimited');
        return;
      }
      updateMaxUsers.mutate(num);
    }
  };

  const atCapacity = maxUsers !== null && currentUsers >= maxUsers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          User Limit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Current Usage</p>
            <p className={`text-xl font-bold ${atCapacity ? 'text-destructive' : ''}`}>
              {currentUsers} / {maxUsers ?? '∞'}
            </p>
          </div>
          {editingMaxUsers ? (
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor="max-users" className="text-xs">Max users (empty = unlimited)</Label>
                <Input
                  id="max-users"
                  type="number"
                  min={1}
                  className="w-32"
                  value={maxUsersInput}
                  onChange={(e) => setMaxUsersInput(e.target.value)}
                  placeholder="∞"
                />
              </div>
              <Button size="sm" onClick={handleSave} disabled={updateMaxUsers.isPending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingMaxUsers(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMaxUsersInput(maxUsers?.toString() ?? '');
                setEditingMaxUsers(true);
              }}
            >
              Edit Limit
            </Button>
          )}
        </div>
        {atCapacity && (
          <p className="text-sm text-destructive mt-2">This company has reached its user limit.</p>
        )}
      </CardContent>
    </Card>
  );
}

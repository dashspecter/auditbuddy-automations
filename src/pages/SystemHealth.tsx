import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useLocations } from '@/hooks/useLocations';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocationAudits } from '@/hooks/useAudits';
import { useEquipment } from '@/hooks/useEquipment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

export default function SystemHealth() {
  const { user, session } = useAuth();
  const { company, modules, tier, isTrialExpired, trialDaysRemaining, isAccountPaused } = useCompanyContext();
  const { data: roleData } = useUserRole();
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees();
  const { data: audits } = useLocationAudits();
  const { data: equipment } = useEquipment();

  const StatusBadge = ({ condition, trueLabel = 'OK', falseLabel = 'Issue' }: { condition: boolean; trueLabel?: string; falseLabel?: string }) => (
    condition ? (
      <Badge variant="default" className="bg-success text-success-foreground">
        <CheckCircle2 className="mr-1 h-3 w-3" /> {trueLabel}
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" /> {falseLabel}
      </Badge>
    )
  );

  return (
    <ProtectedLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6" />
        <h1 className="text-3xl font-bold">System Health</h1>
      </div>
      <p className="text-muted-foreground">Diagnostics and system status information</p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Current user session status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">User Authenticated</span>
              <StatusBadge condition={!!user} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Session Valid</span>
              <StatusBadge condition={!!session} />
            </div>
            {user && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Email:</span> {user.email}</div>
                  <div><span className="font-medium">User ID:</span> <code className="text-xs">{user.id}</code></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Company Status */}
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Company account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Company Loaded</span>
              <StatusBadge condition={!!company} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Account Status</span>
              {company && (
                <Badge variant={company.status === 'active' ? 'default' : 'destructive'}>
                  {company.status}
                </Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Account Paused</span>
              <StatusBadge condition={!isAccountPaused} trueLabel="Active" falseLabel="Paused" />
            </div>
            {company && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {company.name}</div>
                  <div><span className="font-medium">Tier:</span> <Badge variant="outline">{tier}</Badge></div>
                  {!isTrialExpired && trialDaysRemaining > 0 && (
                    <div><span className="font-medium">Trial:</span> {trialDaysRemaining} days remaining</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Roles */}
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Current user permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Roles Loaded</span>
              <StatusBadge condition={!!roleData} />
            </div>
            {roleData && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {roleData.isAdmin && <Badge variant="default">Admin</Badge>}
                  {roleData.isManager && <Badge variant="secondary">Manager</Badge>}
                  {roleData.isChecker && <Badge variant="outline">Checker</Badge>}
                  {roleData.roles.length === 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" /> No Roles
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader>
            <CardTitle>Active Modules</CardTitle>
            <CardDescription>Enabled company modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Modules Loaded</span>
              <StatusBadge condition={modules.length > 0} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Active</span>
              <Badge variant="outline">{modules.length}</Badge>
            </div>
            {modules.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {modules.map((mod) => (
                    <Badge key={mod.id} variant="secondary" className="text-xs">
                      {mod.module_name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Data Counts */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Overview</CardTitle>
            <CardDescription>Current data in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{locations?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Locations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{employees?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Staff Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{audits?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Audits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{equipment?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Equipment Items</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
          <CardDescription>For debugging purposes</CardDescription>
        </CardHeader>
        <CardContent>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium mb-2 hover:text-primary">
              View Raw Data
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded overflow-auto max-h-96">
              {JSON.stringify(
                {
                  user: user ? { id: user.id, email: user.email } : null,
                  company: company || null,
                  tier,
                  isTrialExpired,
                  trialDaysRemaining,
                  isAccountPaused,
                  roleData,
                  modules: modules.map(m => ({ id: m.id, name: m.module_name, active: m.is_active })),
                  dataCounts: {
                    locations: locations?.length || 0,
                    employees: employees?.length || 0,
                    audits: audits?.length || 0,
                    equipment: equipment?.length || 0
                  }
                },
                null,
                2
              )}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
    </ProtectedLayout>
  );
}
